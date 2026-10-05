# Puzzle Engines Plan — Verification Report

Status: **verification complete, no code written.** Produced 2026-09-27 against
`PUZZLE_ENGINES_PLAN.md` §10, on branch `feat-shared-solver-workspace` (`22b1094`).
Scope: read-only. The working tree was restored to its original state afterwards.

**Amended 2026-09-27** after the plan revision: §2.1 originally checked only `api/`
and judged the `deploy-game.yml` web job safe. That was wrong — `web/package.json`
declares `@queens/solver` too, so the prod **web** deploy breaks on the same E404.
Corrected in §2.1a, with the dependency-confusion consequence.

Baseline: **118 API tests passing** (`cd api && npm test`).

---

## 1. Summary

All six §10 claims were checked against the repo. Five are confirmed, one is
confirmed but understated. Four issues the plan does not mention were found, one
of which (§4a) will produce wrong difficulty labels on every new 9×9 board.

| # | §10 claim | Result |
|---|---|---|
| 1 | `api/package-lock.json` lacks `@queens/solver`; `npm ci` in `api/` fails | **confirmed** — worse than described (§2.1), and `web/` fails too (§2.1a) |
| 2 | Step 2 preserves every current `/puzzle` behaviour | **achievable, but unverified by the suite** (§2.2) |
| 3 | iOS decoder ignores unknown fields | **confirmed** (§2.3) |
| 4 | `PuzzleCache` still decodes old caches | **confirmed** (§2.4) |
| 5 | Migrations 0022/0023 safe on 30k rows; `puzzle_counts` rebuild keeps triggers exact | **confirmed by execution** (§2.5) |
| 6 | Repair step can never invalidate solution S | **reasoning holds** (§2.6) |

Decisions taken on §9 of the plan are recorded in §5 below.

---

## 2. Claim-by-claim findings

### 2.1 CI break — confirmed, and the failure mode is worse than described

`api/package-lock.json` contains **zero** references to `@queens/solver`. The root
`package-lock.json` resolves it at three places (`node_modules/@queens/solver →
packages/solver`, plus the workspace entry at `packages/solver`).

Reproduced in an isolated copy of `api/package.json` + `api/package-lock.json`:

```
npm error code E404
npm error 404 Not Found - GET https://registry.npmjs.org/@queens%2fsolver - Not found
npm error 404  The requested resource '@queens/solver@*' could not be found...
```

The plan predicts a "lockfile/package.json mismatch". The actual failure is an
**E404 against the public npm registry** — npm does not see the workspace sibling
from inside `api/`, so it tries to fetch the name from npmjs.org. It fails closed
today, which is the safe outcome, but it is a network call on a name that does not
exist publicly.

**Scale of the fix.** There are **five** `cd api && npm ci` sites across **four**
workflows, each paired with `cache-dependency-path: api/package-lock.json`. Both
lines must change at every site:

| Workflow | Line | Note |
|---|---|---|
| `deploy-dev.yml` | 40, 43 | the one that breaks first, on merge to `develop` |
| `deploy-game.yml` | 49, 52 | api job |
| `deploy-game.yml` | 82, 85 | web job — **also broken**, see §2.1a |
| `seed-puzzles.yml` | 46, 49 | |
| `backup-db.yml` | 18, 21 | |

**Root install verified to work.** A root `npm ci` symlinks
`@queens/solver → packages/solver`, and `wrangler` 4.76.0 still resolves when
invoked from `api/`. Worth knowing *why*: after a root install `wrangler` lands in
`api/node_modules/.bin/wrangler`, **not** the root `.bin` — node's upward
resolution from `api/` is what makes it work, not hoisting. `vitest` does hoist to
the root `.bin`.

### 2.1a The web deploy breaks too — correction to the above

The original §2.1 checked `api/` only and read the `deploy-game.yml` web job as safe
because its `cache-dependency-path` pointed at the lockfile for its own dependencies.
That reasoning was incomplete. Verified since:

- `web/package.json:15` declares `"@queens/solver": "*"`.
- `web/package-lock.json` contains **zero** references to it.
- `npm ci` in an isolated copy of `web/` fails identically:
  `npm error 404 Not Found - GET https://registry.npmjs.org/@queens%2fsolver`.

So **two** deploy paths break after the solver commit, not one: Deploy Dev on the
next push to `develop`, and the prod **web** job on the next push to `main`.

Worth noting: nothing under `web/` imports `@queens/solver` yet — the manifest line
is the only occurrence in the tree. The dependency was declared ahead of the web
hints work. It breaks `npm ci` regardless of whether anything imports it.

**Dependency confusion.** Because a subproject `npm ci` resolves this private name
against the public registry, anyone who publishes `@queens/solver` to npm would have
their package installed inside these workflows. Ranked by what the workflow holds:

| Workflow | Holds | Writes to |
|---|---|---|
| `seed-puzzles.yml` | `CLOUDFLARE_API_TOKEN` | **prod D1** (defaults to `--env prod`) |
| `backup-db.yml` | `CLOUDFLARE_API_TOKEN` | exports prod + dev |
| `deploy-game.yml` | deploy credentials | prod worker + web |
| `deploy-dev.yml` | deploy credentials | dev |

It fails closed today, so this is latent, not live. Two fixes, and they are not
equivalent: deleting both subproject lockfiles (plan §9.8) removes the install path
that reaches the registry, but only for as long as no one re-adds a lockfile;
**claiming the `@queens` scope on npm** is the durable fix and survives that mistake.
Recommend doing both, and treating the scope claim as required rather than optional —
renaming the package churns imports across three workspaces for the same benefit.

### 2.2 `/puzzle` behaviour preservation — achievable, but the suite does not cover it

`api/src/functions/puzzle/index.ts` (124 lines) was read in full. Step 2's design
is compatible with it: the `ALLOWED_COMBOS` shape it proposes to make per-engine is
already a `Record<number, number[]>` keyed by stars, and defaulting a missing
`engine` to `voronoi-v2` leaves every existing validation branch reachable on
exactly today's inputs.

The gap is test coverage. `__tests__/puzzle.test.ts` has **5 tests, all on the
random-fetch path** (rand seek, wraparound, 404, no-filter seek, difficulty ahead
of the seek). **No test covers any validation branch** — so §7's row
"per-engine size validation → old requests validate exactly as before → needs
test" is load-bearing and currently unmet.

A 13-assertion baseline harness pinning today's behaviour was written and confirmed
green against the current handler:

- `size=9` with no engine → 400 (the case most at risk of regressing)
- each valid combo (5/1, 6/1, 8/1, 10/2) → 200
- bad combos (10/1, 8/2) and `stars=3` → 400
- code + size → 400; malformed code → 400; invalid difficulty → 400
- response body is **exactly** the 8 documented keys
- code lookup ignores a difficulty filter and queries `WHERE code = ?`

It lives in the session scratchpad, not the repo. **Recommendation: land it as the
first commit of Step 2**, before touching the handler, so the refactor is provably
non-breaking rather than asserted to be.

### 2.3 iOS decoder — confirmed

`PuzzleAPIResponse.init(from:)` (`app/queens/PuzzleFetcher.swift:83`) uses
`decoder.container(keyedBy: CodingKeys.self)` and reads only the nine declared
keys. An added `engine` field is silently ignored. Adding it to the response is
safe for the live App Store build.

### 2.4 Cache decoding — confirmed, with a stronger guarantee than claimed

`CachedPuzzle` (`app/queens/PuzzleCache.swift:12`) is synthesised `Codable`
wrapping `StarBattlePuzzle`. Adding `var engine: String? = nil` to
`StarBattlePuzzle` decodes pre-existing caches cleanly — `difficulty`
(`StarBattlePuzzle.swift:68`) already set exactly this precedent with the comment
"nil for older API".

Additionally, `loadCache()` wraps the decode in `do/catch` and falls back to
`self.puzzles = []` on failure. So even a mishandled schema change degrades to an
empty offline cache, not a crash.

### 2.5 Migrations 0022/0023 — confirmed by execution

Method: applied all 21 existing migrations to a fresh SQLite database, seeded
**30,093 rows** matching prod's exact distribution (5×5 14, 6×6 90, 8×8 4,435,
10×10 2★ 25,554), then applied the proposed 0022 and 0023.

Confirmed first that the live schema matches the plan's §5 claims exactly —
`puzzles` columns, `idx_puzzles_solution` UNIQUE on `(grid_size, stars, solution)`
(migration 0012), `idx_puzzles_grid_stars_rand` (0020), `puzzle_counts` with three
triggers (0021). Latest migration is 0021, so 0022/0023 are the correct next
numbers.

Results after applying both:

- `PRAGMA integrity_check` → `ok`
- all 30,093 rows carry `engine = 'voronoi-v2'`; zero NULLs
- `seed_runs.engine` added, `NOT NULL DEFAULT 'voronoi-v2'`
- `puzzle_counts` backfilled correctly and **EXACT MATCH** against live `COUNT(*)`
- `EXPLAIN QUERY PLAN` for the handler's exact query shape:
  `SEARCH puzzles USING INDEX idx_puzzles_engine_grid_stars_rand (engine=? AND grid_size=? AND stars=? AND rand>?)`

Both migrations completed sub-second. This is expected, not a measurement error:
SQLite's `ALTER TABLE ADD COLUMN` with a **constant** default is metadata-only and
does not rewrite rows, so the only real cost is the index build. D1 applies the
same SQLite semantics.

**Trigger exactness held under mutation.** Rebuilt `puzzle_counts` with PK
`(engine, grid_size, stars)` and all three triggers extended to cover `engine`,
then exercised insert of a new-engine combo, delete, and engine relabel. Counts
stayed `EXACT` against live `COUNT(*)` throughout.

Two things the rebuild must get right:

1. The `AFTER UPDATE OF` trigger must add `engine` to **both** its column list and
   its `WHEN` clause. Omit it and an engine relabel silently drifts the counts.
2. `ALTER TABLE puzzle_counts RENAME TO ... ; DROP TABLE` ordering matters — drop
   the three triggers **before** renaming, recreate them after the backfill, or
   they bind to the old table.

### 2.6 Repair step — reasoning holds

The §3 argument is sound as written. Moving a cell of rival solution T that is
**not** in real solution S into a neighbouring region cannot break S, because no
cell of S changes region and S's one-queen-per-region property is untouched. It
necessarily breaks T, because T loses a region it required. Connectivity and the
≥2-cell floor are preserved by the move's own preconditions.

Not executed — the v3 generators do not exist yet. This is a review of the
argument, not a test of an implementation.

---

## 3. Issues the plan does not mention

### 3.1 `classifyDifficulty` has no 9×9 branch — will mislabel every new board

`packages/solver/src/solver.ts:772` branches on `n === 10` versus a comment reading
"5 / 6 / 8". A 9×9 falls into the latter. In that branch:

```ts
const fullSolved = isComplete(full.board, n)   // line 783
...
if (n === 10) {
  if (!fullSolved) return { difficulty: 'very_hard', ... }   // line 786 — ONLY use
  ...
}
// 5 / 6 / 8
if (teachSolved && teachTier <= 2) return { difficulty: 'easy',   difficulty_score: teachTier }
if (teachSolved && teachTier >= 3) return { difficulty: 'medium', difficulty_score: teachTier }
return { difficulty: 'hard', difficulty_score: Math.round(teachFrac * 100) }
```

`fullSolved` is computed but **used only inside the `n === 10` branch**. Two
consequences for 9×9:

- Every Tangled 9×9 board lands on `hard`, never `very_hard` — even one the full
  solver cannot crack at all.
- `difficulty_score` is a **tier** (0–4) on the easy/medium paths and a
  **percentage** (0–100) on the hard path. Mixing 9×9 into this branch mixes both
  scales into the same column.

Step 4 says "classify difficulty with `classifyDifficulty` as today". That needs a
9×9 branch added first, or the new engines ship with meaningless difficulty labels
and an incoherent `difficulty_score`.

### 3.2 The harden band needs no new measurement code

Good news for the 15–60% band (§5.2 below): `teachFrac = teachable.steps / (n * n)`
already exists inside `classifyDifficulty`. The harden step can reuse
`solve(puzzle, undefined, { teachableOnly: true })` and that ratio directly —
`SolveOptions` is just `{ teachableOnly?: boolean }`, and `solve`, `nextMove`,
`isComplete` and `classifyDifficulty` are all exported from `@queens/solver`.

### 3.3 `/catalogue` must filter `WHERE n > 0`

A combo drained to zero leaves an `n = 0` row behind rather than deleting it
(reproduced: `snake-v1|9|1|0` after inserting then relabelling the only row). This
is pre-existing trigger behaviour and harmless today, but §6 Step 2 says the
catalogue "omits styles/sizes with zero puzzles" — absent rows are not sufficient,
the query needs the explicit predicate.

### 3.4 `starsForSize` hardcodes the size→stars mapping

`PuzzleConfig.starsForSize` (`app/queens/StarBattlePuzzle.swift:16`) is
`case 10: return 2; default: return 1`. A 9×9 gets 1★ correctly, but only via the
default. Step 6 drives size options from `/catalogue`; this function must stay
consistent with it, or a future 2★ size silently resolves to 1★.

---

## 4. Smaller notes

- **§5's housekeeping list is stale.** `.git/index.lock`, `.li-tmp.ts` and
  `api/.li-corr.ts` are all already gone. Step 0.1 is a no-op.
- **Git claims all confirmed.** Branch `feat-shared-solver-workspace`, exactly one
  commit ahead of `develop` (`22b1094`), and `develop` is an ancestor of `HEAD`, so
  it is genuinely fast-forwardable.
- **`/dashboard` has no auth** (`api/src/index.ts:43`), unlike `/puzzle` which sits
  behind `tokenAuth`. Once 0023 re-keys `puzzle_counts` by engine, the
  unauthenticated dashboard will begin exposing per-engine counts. A small widening
  of what an anonymous caller sees; flagged, not changed.
- **`tsx` is an undeclared dependency.** `seed-puzzles.yml:81` runs `npx tsx`, and
  `tsx` appears nowhere in `api/package.json`, so npx fetches whatever is latest at
  run time. Pre-existing and unrelated to this plan, but it is an unpinned version
  in a workflow that writes to the database.
- **Uncommitted state** is limited to a modification of `utils/puzzle.html` plus
  untracked `api/scripts/experiment*.ts`, two `dashboard/*-options.html` files, and
  the plan doc itself.

---

## 5. Decisions taken on §9

| § | Question | Decision |
|---|---|---|
| 9.1 | Solution-unique index | **Keep `(grid_size, stars, solution)`.** Queen layout is player-visible; drops are counted as duplicates. Revisit if duplicate rates are high. |
| 9.2 | Tangled target band | **15–60% teachable progress**, stop climbing on entry to the band. Implementable via existing `teachFrac` (§3.2). |
| 9.3 | `/catalogue` auth | **`tokenAuth`.** Corrected mid-review: `/puzzle` is *not* public (it is behind `tokenAuth`, `api/src/index.ts:39`) and `/dashboard` is *not* token-auth (it has none, line 43). The app already holds a token for every puzzle fetch, so the catalogue costs it nothing, and it belongs with `/puzzle` rather than copying `/dashboard`'s lack of auth. |
| 9.4 | `engine` + code lookup | **400**, consistent with today's "code cannot be combined with filters" rule. |
| 9.5 | `voronoi-uncapped-v1` | **Skip.** The plan marks it optional/low-priority and it displays as "Original" anyway — a code path with no player-visible benefit. |
| 9.6 | Sizes for new engines | **8 and 9 only**, no 6. |
| 9.7 | Merge route | **PR carrying the CI fix.** A broken Deploy Dev is the plan's top risk; a PR gets a green check before it lands. |

---

## 6. Recommended order of work

1. **CI fix + solver merge in one PR** (Step 0 / Step 5). Five sites, four
   workflows, per §2.1 — including the web job (§2.1a). Delete both subproject
   lockfiles and claim the `@queens` npm scope. Confirm Deploy Dev is green before
   anything else.
2. **Baseline test harness** (§2.2) as the first commit of Step 2, before the
   handler changes.
3. **9×9 branch in `classifyDifficulty`** (§3.1) before any new-engine seeding,
   otherwise every seeded board gets a wrong label that then needs a backfill.
4. Migrations 0022/0023, with the two trigger cautions in §2.5.
5. API changes, then generators, then seed script, then iOS.

Step 0.1 (housekeeping) can be dropped — already done (§4).
