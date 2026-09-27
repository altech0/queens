# Puzzle Engines Plan (Original / Winding / Tangled)

Status: **plan, verified, not started.** Written 2026-09-27; revised the same day after `VERIFICATION_REPORT.md`
(decisions in §9, corrections folded in throughout). No code written yet.
Scope: **dev environment only.** Nothing in this plan is deployed to prod or submitted to App Review.

---

## 1. Goal

Start filling the **dev** database with puzzles made by several different generators ("engines"),
label every puzzle with the engine that made it, and let players choose a puzzle **style** (engine)
as well as a grid size — first in the iOS app via TestFlight (pointed at dev), later on web.

When the solver is rewritten later, puzzles made with the new solver get a **new engine name**
(e.g. `snake-harden-v2`), so old and new boards stay distinguishable.

## 2. Hard constraints

1. **Dev only.** Migrations, API deploys and seeding target `queens-dev` / `queens-api-dev` only.
2. **Backwards compatible with the live iOS app.** App Review takes ~a month, so the API must never
   change behaviour for the current App Store build. Concretely:
   - A request with **no style/engine** parameter returns **only Original (`voronoi-v2`) puzzles**, exactly as today.
   - Existing query params (`size`, `stars`, `difficulty`, code lookup) keep their current meaning and validation.
   - Existing response fields keep their names, types and meaning. New fields are additive only.
   - Any code merged to `develop` must also be safe if it later reaches `main`/prod unchanged.
3. The solver branch (`feat-shared-solver-workspace`) is folded in now rather than kept separate.

## 3. Background — why new engines

Compared a solved LinkedIn Queens HARD 9×9 against our generator (`api/src/generator/v2/`):

- v2 grows all regions in lockstep from random seeds (BFS/Voronoi). This only makes round,
  similar-sized blobs; it cannot make 1-wide corridors, L-shapes or wrap-around regions, which is where
  LinkedIn's difficulty comes from (their board: largest region 20 cells, a 1-wide stem down a column).
- v2's region size cap (`1.5 × N`) rejected the LinkedIn board and was fighting uniqueness: accepted
  puzzles almost always sat right at the cap. Removing it gave ~4× throughput on 8×8 and made 9×9 viable.

Experiments (uncommitted, local only): `api/scripts/experimentRegions.ts`, `api/scripts/experimentGrowth.ts`.
Summary also saved in the Claude project doc `claude/generator-growth-experiment.md`.

| Strategy (9×9, 15 s each) | Unique puzzles/s | Largest region | 1-wide corridor cells |
|---|---|---|---|
| v2 lockstep, no cap | 2.9 | 18 | 1.5 |
| queens-first + snakes + **repair** | **40** | 27 | 11 |
| + harden (hill-climb) | 0.8 | 21 | 17 |
| LinkedIn HARD reference | — | 20 | 11 |

Key techniques:
- **Queens first:** place a valid queen layout, use each queen as its region's seed → every layout is solvable.
- **Snakes:** 1–3 regions grow as 1-wide random walks (biased straight), then frozen.
- **Eden fill:** remaining cells claimed one at a time by a weighted random region; soft cap 2.5 × N.
- **Repair:** if a second solution T exists, move one of T's queen cells (not in the real solution S)
  into a neighbouring region, keeping regions connected and ≥ 2 cells. This always kills T and never
  breaks S. ~99% of layouts converge in a few moves.
- **Harden:** random boundary-cell moves accepted only if the puzzle stays unique, fully solvable by the
  full solver, and gets harder (teachable solver stalls earlier). Uses `@queens/solver`.
- **Fast uniqueness counter:** row-by-row backtracking that stops at 2 solutions; much faster than
  `solveStars` + `hasUniqueSolutionV2`.

Known issue: harden can overshoot to boards where the teachable solver makes **zero** moves (needs
look-ahead from move 1). It must target a band, not maximise.

## 4. Engines

Internal id is stored in the DB and never shown; display name lives in the API (`/catalogue`) so it can
change without an app release.

| Internal id | Display name | Description | Sizes (stars) | Status |
|---|---|---|---|---|
| `voronoi-v2` | Original | Current production generator (capped Voronoi). All existing puzzles. | 5, 6, 8 (1★); 10 (2★) | exists |
| `snake-v1` | Winding | Queens-first + snakes + Eden fill + repair. | 8, 9 (1★) | new |
| `snake-harden-v1` | Tangled | `snake-v1` + harden using the current `@queens/solver`. | 8, 9 (1★) | new |

2-star (10×10) stays Original-only. `voronoi-uncapped-v1` is dropped (§9.5).
When the solver is rewritten, hardened boards get a new id (`snake-harden-v2`); existing rows are never relabelled.

## 5. Current state (verified 2026-09-27)

**Environments** (`api/wrangler.toml`)

| | Worker | URL | D1 | Puzzles |
|---|---|---|---|---|
| prod | `queens-api` | api.queens.knittedmice.com | `queens` (4b75d895…) | 30,093 |
| dev | `queens-api-dev` | api.dev.queens.knittedmice.com | `queens-dev` (2365abad…) | 22,181 |
| local | `wrangler dev` | localhost:8787 | `api/.wrangler/state/...sqlite` | test data |

Prod puzzles: 5×5 14, 6×6 90, 8×8 4,435, 10×10 (2★) 25,554. No engine column; all made by v2.

**Schema facts that matter**
- `puzzles(id, grid_size, stars, regions, solution, code UNIQUE, created_at, difficulty, difficulty_score, rand)`
- `idx_puzzles_solution` is **UNIQUE on (grid_size, stars, solution)** (migration 0012).
- `idx_puzzles_grid_stars_rand (grid_size, stars, rand)` drives random fetch (migration 0020).
- `puzzle_counts(grid_size, stars, n)` kept exact by 3 triggers (0021); dashboard reads it. A combo drained
  to zero leaves an `n = 0` row (it is not deleted).
- `seed_runs(grid_size, stars, attempts, generated, duplicates, inserted, started_at, finished_at)`.
- Latest migration is 0021.

**Auth** (`api/src/index.ts`)
- Public: `/health`, `/auth/register`. **`/dashboard` has no auth.**
- `tokenAuth`: `/puzzle/:puzzleId?`, `DELETE /user`.

**Git**
- `feat-shared-solver-workspace` = `develop` + 1 commit (`22b1094`, extracts `@queens/solver`). Fast-forwardable.
- `feat-hints-difficulty` is already in `develop` (squash-merged as #50).
- Uncommitted: `utils/puzzle.html` (local-mode viewer), untracked `api/scripts/experiment*.ts`,
  two `dashboard/*-options.html` files, and these docs. Stray files and the stale git lock are already removed.
- Git must run on the Mac (the Cowork VM cannot push over SSH and leaves lock files it cannot delete).

**CI** (`.github/workflows/`)
- `deploy-dev.yml`: push to `develop` (api/**) → `cd api && npm ci` → dev migrations (only if changed) → `deploy --env dev`.
- `deploy-game.yml`: push to `main` → prod API job and **web job**.
- `seed-puzzles.yml`: manual only (schedule removed 2026-09-06); runs `npx tsx scripts/seedPuzzlesV2.ts`.
- `backup-db.yml`: weekly export of prod + dev.
- **Broken after the solver commit (confirmed):** `api/package.json` and `web/package.json` both declare
  `@queens/solver: "*"`, but neither `api/package-lock.json` nor `web/package-lock.json` contains it. Only the root
  `package-lock.json` resolves it (`node_modules/@queens/solver → packages/solver`). `npm ci` inside `api/` or
  `web/` fails with **E404 from registry.npmjs.org** — npm looks for the name on the public registry.
- **Security:** that E404 is a **dependency-confusion risk**. If anyone publishes `@queens/solver` to npm, a
  subproject `npm ci` would install it inside workflows holding `CLOUDFLARE_API_TOKEN` and writing to prod D1.
- Five install sites, each with its own `cache-dependency-path`:

| Workflow | Job | Lines |
|---|---|---|
| `deploy-dev.yml` | api (dev) | 40, 43 |
| `deploy-game.yml` | api (prod) | 49, 52 |
| `deploy-game.yml` | web (prod) | 82, 85 |
| `seed-puzzles.yml` | seed | 46, 49 |
| `backup-db.yml` | backup | 18, 21 |

  (4 `cd api` sites + 1 `cd web` site.) A root `npm ci` was verified to work: it symlinks `@queens/solver`, and
  `wrangler` resolves from `api/node_modules/.bin` via node's upward resolution; `vitest` hoists to root.
- `tsx` is used by `seed-puzzles.yml` via `npx` but not declared anywhere → unpinned version in a DB-writing workflow.

**Solver** (`packages/solver/src/solver.ts`)
- Exports `solve`, `nextMove`, `isComplete`, `classifyDifficulty`. `solve(p, undefined, { teachableOnly: true })`
  plus `steps / (n*n)` gives `teachFrac`, reused by harden.
- **`classifyDifficulty` has no 9×9 branch.** It branches `n === 10` vs "5 / 6 / 8"; 9×9 falls into the latter,
  where `fullSolved` is ignored (never `very_hard`) and `difficulty_score` mixes a tier (0–4) with a percentage (0–100).

**iOS app facts** (`app/queens/`)
- `PuzzleAPIResponse.init(from:)` reads only its declared keys → **unknown fields ignored** (adding `engine` is safe).
- `CachedPuzzle` is synthesised `Codable` over `StarBattlePuzzle`; an optional `engine` decodes old caches
  (same precedent as `difficulty`). `loadCache()` falls back to an empty cache on decode failure.
- Random fetch sends `size`, `stars`, optional `difficulty`. Never sends engine → will get Original only.
- `PuzzleConfig.sizeOptions` drives setup and offline views; `PuzzleConfig.starsForSize` hardcodes
  `10 → 2, default → 1`.
- `AppColors` has 10 region colours (enough for 9×9; rendering still to verify).
- Non-200 → `PuzzleFetchError.httpError` (401/429 special-cased). UI handling of a 404 "no puzzles" is unverified.
- `Config.plist` (Release) → prod API; `Config.debug.plist` → dev. TestFlight uses Release → **prod** by default.

## 6. Plan

Order: Step 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9. Each step is its own commit or small PR.

### Step 0 — CI fix + solver merge (one PR into `develop`)
On the Mac, on `feat-shared-solver-workspace`:
1. All five install sites: replace `cd api && npm ci` / `cd web && npm ci` with a root `npm ci`, and set
   `cache-dependency-path: package-lock.json`. Keep the later `cd api` / `cd web` for the actual commands.
2. **Delete `api/package-lock.json` and `web/package-lock.json`** so no subproject install path exists
   (removes the dependency-confusion fallback). Update `CLAUDE.md`, which already says to install at the root.
3. Add `tsx` as a pinned root `devDependency`; seed workflow uses the local binary.
4. Optional hardening: claim the `@queens` scope on npm, or rename the package to a scope you own.
5. Open a PR `feat-shared-solver-workspace → develop`; merge when green; confirm Deploy Dev succeeds.
6. `git checkout develop && git pull && git checkout -b feat/puzzle-engines`.
7. Carry over the uncommitted `utils/puzzle.html` and experiment scripts; commit them on the new branch.

### Step 1 — Baseline tests for `/puzzle` (before any API change)
- Commit the 13-assertion harness from the verification pass into `api/src/functions/puzzle/__tests__/`:
  `size=9` with no engine → 400; each valid combo (5/1, 6/1, 8/1, 10/2) → 200; bad combos (10/1, 8/2) and `stars=3` → 400;
  code + size → 400; malformed code → 400; invalid difficulty → 400; response has exactly the 8 documented keys;
  code lookup ignores difficulty and queries `WHERE code = ?`.
- Must be green on the unchanged handler.

### Step 2 — 9×9 in `classifyDifficulty`
- Route `n >= 9` through the teachFrac-based logic currently used for 10×10 (respects `fullSolved` → `very_hard`;
  `difficulty_score` is a percentage), leaving 5/6/8 unchanged.
- Update `StarBattleSolver.swift` to match (parity test must still pass) — or document that 9×9 difficulty is
  API-only until the solver rewrite.
- Must land before any new-engine seeding, otherwise labels need a backfill.

### Step 3 — Database (migrations 0022, 0023)
- `0022_add_puzzle_engine.sql`
  - `ALTER TABLE puzzles ADD COLUMN engine TEXT NOT NULL DEFAULT 'voronoi-v2';` (metadata-only in SQLite)
  - `CREATE INDEX idx_puzzles_engine_grid_stars_rand ON puzzles(engine, grid_size, stars, rand);`
  - Keep existing indexes.
  - `ALTER TABLE seed_runs ADD COLUMN engine TEXT NOT NULL DEFAULT 'voronoi-v2';`
- `0023_puzzle_counts_by_engine.sql` — recreate `puzzle_counts` with PK `(engine, grid_size, stars)`:
  1. **Drop the three triggers first**, then rename/recreate the table, backfill, then recreate triggers
     (otherwise they bind to the old table).
  2. The `AFTER UPDATE OF` trigger must include `engine` in **both** its column list and its `WHEN` clause.
- Dashboard query: `SUM(n) … WHERE n > 0 GROUP BY grid_size, stars` (or per engine).
- Verified on a 30,093-row copy: integrity ok, all rows `voronoi-v2`, counts exact under insert/delete/relabel,
  handler query uses the new index.

### Step 4 — API (backwards compatible)
- `GET /puzzle/:code?`
  - Optional `engine` query param (comma list, like `difficulty`), validated against known engines.
  - **No `engine` → `engine = 'voronoi-v2'` only.**
  - **`engine` + code → 400** (same rule as code + size/stars).
  - Size/stars validation per engine: `ALLOWED_COMBOS[engine]`. With no engine the allowed set is exactly today's,
    so `size=9` without engine stays 400.
  - Response adds `engine` (internal id). Nothing else changes.
- `GET /catalogue` — **behind `tokenAuth`**:
  ```json
  { "styles": [
      { "engine": "voronoi-v2", "name": "Original", "description": "…",
        "sizes": [ { "size": 8, "stars": 1, "count": 4435,
                     "difficulties": { "easy": 757, "medium": 1869, "hard": 1809 } } ] },
      { "engine": "snake-v1", "name": "Winding", … },
      { "engine": "snake-harden-v1", "name": "Tangled", … } ] }
  ```
  Query must filter **`WHERE n > 0`**. Per-difficulty counts let the app hide difficulty choices that don't exist
  (Tangled will be almost all `hard`) — either extend `puzzle_counts` with difficulty or compute with a short edge cache.
- Engine metadata (ids, names, combos) lives in a small registry the API imports; the API never imports generator code.
- Tests: Step 1 baseline stays green unchanged; new tests for engine filter, default-to-Original, engine+code 400,
  per-engine validation, `engine` in response, catalogue (auth, `n > 0`, shape).

### Step 5 — Generators (`api/src/generator/v3/`)
- `common.ts`: `findSolutions(limit)`, `randomQueens`, `eden` (weights, frozen set, soft cap 2.5×N), `snake`,
  `connectedWithout`, `repair`, symmetry check, min region size 2.
- `snake.ts` → `snake-v1`.
- `snakeHarden.ts` → `snake-harden-v1`: hill-climb using `solve()`/`teachFrac`; accept only boards that are unique,
  fully solvable by the full solver, and **teachFrac in 15–60%**; stop climbing on entering the band.
- `engines.ts`: registry `{ id, displayName, description, combos, generate }` (metadata part shared with the API).
- Tests: exactly one solution and it matches the returned `solution`; regions connected, ≥ 2 cells, N regions;
  not 180° symmetric; Tangled output inside the band; repair never changes S's regions.
- `v2` untouched.

### Step 6 — Seed script
- `seedPuzzlesV2.ts` gains `--engine <id>` (default `voronoi-v2` → identical to today).
- Per-engine config list (`snake-v1`, `snake-harden-v1`: 8×8, 9×9, 1★).
- INSERT and `seed_runs` include `engine`; classify difficulty with the Step 2 `classifyDifficulty`.
- **Safety:** any engine other than `voronoi-v2` hard-errors on `--env prod`.
- Local run (needs `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`):
  `cd api && npx tsx scripts/seedPuzzlesV2.ts --env dev --engine snake-v1 --size 9 --stars 1 --seconds 600 --yes`
- Optional `scripts/seedDevEngines.sh` looping engines × sizes for a time budget.
- Later: `seed-puzzles.yml` gets an `engine` input and the nightly schedule returns, dev only.

### Step 7 — iOS
- `StarBattlePuzzle` / `PuzzleAPIResponse`: optional `engine: String?`.
- `PuzzleFetcher`: send `engine` when a style is chosen; fetch `/catalogue` with the token.
- Catalogue: cache last good response; **fallback on failure/404** (e.g. prod before release) → Original only with
  current `PuzzleConfig.sizeOptions`.
- `GameSetupView`: style picker; sizes from the chosen style; difficulty options from catalogue counts.
- `OfflinePuzzlesView`: same style/size choice.
- `GameView`: style label.
- Keep `PuzzleConfig.starsForSize` consistent with catalogue (prefer stars from catalogue).
- Verify: 9×9 rendering (iPhone SE → iPad), hints on Tangled boards, 404 "no puzzles" UI, share links.
- **TestFlight → dev:** `Beta` build configuration + `Config.beta.plist` → `https://api.dev.queens.knittedmice.com/puzzle`,
  a scheme that archives with it, a visible "DEV" badge, and a guard against archiving the App Store build with it.

### Step 8 — Web (later)
- Style label and picker via `/catalogue` and `engine`.

### Step 9 — Verification on dev
- Current App Store / `main` build against the dev API: random fetch per size and difficulty, code lookup,
  offline download — unchanged, only ever `voronoi-v2`.
- TestFlight build: each style × size, label, hints, offline.
- Dashboard counts correct; `utils/puzzle.html?local` still works.

## 7. Backwards-compatibility checklist

| Change | Old app impact | Status |
|---|---|---|
| New `engine` column with default | none | verified (migration test) |
| `engine` added to response | ignored by decoder | verified in code |
| No engine param → Original only | identical results | by design + Step 4 tests |
| Per-engine size validation | old requests validate exactly as before | Step 1 baseline tests |
| `/catalogue` endpoint | not called | safe |
| New-engine puzzles in DB | never served without `engine` | by design + test |
| Code lookup of a new-engine code | old app gets a normal puzzle, possibly 9×9 | verify 9×9 rendering |
| `puzzle_counts` restructure | dashboard only | verified (migration test) + dashboard test |
| Deleting subproject lockfiles | none for the app; CI installs from root | Step 0 |

## 8. Risks / gotchas

- **CI break + dependency confusion** on the solver merge (§5). Highest risk; fixed in Step 0.
- **Prod web deploy** also breaks on next push to `main` unless Step 0 covers the web job.
- **TestFlight points at prod by default** — needs the Beta config; risk of shipping a dev-pointed build.
- **Wrong difficulty labels on 9×9** until Step 2 lands.
- **Tangled overshoot** → mitigated by the 15–60% band.
- **Tangled throughput** ~1–3 boards/s → long background seed runs.
- **Solution-unique index** drops some new-engine boards (counted as duplicates).
- **Hints** on Tangled boards may need tier-4 look-ahead early.
- **`/dashboard` is unauthenticated** and will expose per-engine counts after 0023 (accepted, flagged).
- **Worker bundle size**: the API imports engine metadata only, never generators.
- **Solver rewrite later** ⇒ new engine ids; never relabel rows.

## 9. Decisions

| § | Question | Decision |
|---|---|---|
| 9.1 | Solution-unique index | Keep `(grid_size, stars, solution)`; drops counted as duplicates; revisit if rates are high. |
| 9.2 | Tangled band | 15–60% teachable progress; stop climbing on entry. |
| 9.3 | `/catalogue` auth | `tokenAuth` (app already holds a token; belongs with `/puzzle`). |
| 9.4 | `engine` + code | 400. |
| 9.5 | `voronoi-uncapped-v1` | Skip. |
| 9.6 | Sizes for new engines | 8 and 9 only. |
| 9.7 | Merge route | PR carrying the CI fix (Step 0). |
| 9.8 | Subproject lockfiles | Delete `api/` and `web/` lockfiles; root install only. |
| 9.9 | 9×9 difficulty | Use the 10×10 teachFrac logic for `n >= 9`. |

Still open: claim the `@queens` npm scope or rename the package (optional hardening).

## 10. References
- `docs/puzzle-engine/VERIFICATION_REPORT.md` — independent verification (2026-09-27).
- `api/scripts/experimentGrowth.ts`, `api/scripts/experimentRegions.ts` — experiments (uncommitted).
- Claude project doc `claude/generator-growth-experiment.md` — experiment summary.
