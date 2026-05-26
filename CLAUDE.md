# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Structure

Three independent sub-projects, each with its own dependencies and dev workflow:

- `api/` — Cloudflare Worker (TypeScript, Hono, Cloudflare D1)
- `app/` — iOS app (Swift, SwiftUI) — built in Xcode only
- `web/` — Next.js web client (TypeScript, React 19, Tailwind v4)

There is no root-level package.json. Always `cd` into the sub-project before running commands.

---

## API (`api/`)

```bash
cd api
npm install
npm run dev          # wrangler dev — listens on http://localhost:8787
npm test             # vitest run (single pass)
npm run test:watch   # vitest watch
npm run deploy       # wrangler deploy to production
```

Run a single test file:
```bash
cd api && npx vitest run src/generator/v2/__tests__/validator.test.ts
```

Local D1 database setup (first time only):
```bash
npx wrangler d1 execute queens --local --file=migrations/0001_create_puzzles.sql
```

**Wrangler bindings** (declared in `wrangler.toml`): `DB` (D1Database), `RATE_LIMITER` (rate limit, 60 req/60s per IP). These are typed in `src/bindings.ts`.

**Test runner**: Vitest. No test config file — uses Vitest defaults.

---

## Web (`web/`)

```bash
cd web
npm install
npm run dev      # next dev
npm run build    # next build
npm run lint     # eslint
```

API URL is configured via `NEXT_PUBLIC_API_URL` env var; defaults to `https://api.queens.knittedmice.com`.

**Note**: `web/AGENTS.md` contains a reminder that this Next.js version (16.2.6) may differ from training data. Read `node_modules/next/dist/docs/` before writing Next.js-specific code.

---

## iOS App (`app/`)

Build and run via Xcode — no CLI build commands. Tests run via Xcode's test navigator or `xcodebuild`.

**Config setup required**: Copy `app/queens/Config.plist.template` to `app/queens/Config.plist` and set `PUZZLE_API_URL`. This file is gitignored. The app reads it via `Configuration.swift`, which checks Info.plist first, then `Config.plist`.

**API token**: On first launch, `AuthManager` auto-registers and stores the token in Keychain. Token is sent as `X-API-Token` header on all requests.

---

## Architecture

### Puzzle data model

The canonical puzzle format (v2, used by the API and web):
- `regions: number[][]` — N×N grid of region IDs (0-indexed, N regions total)
- `solution: number[][]` — `solution[row]` = sorted column indices of stars in that row

The iOS app uses a different internal model:
- `regions: [[Int]]` — same grid format
- `solution: Set<GridPosition>` — set of `{row, column}` positions

`PuzzleAPIResponse.toPuzzle()` in `PuzzleFetcher.swift` converts the API format to the iOS internal format, handling both legacy v1 (`[Int]` flat array, 1 star/row) and current v2 (`[[Int]]` nested array) solution formats.

### Puzzle generation pipeline (API)

All generation logic is in `api/src/generator/v2/`. The orchestrator is `generatePuzzleV2()` in `index.ts`:

1. **`buildRegionsV2()`** (`regionBuilder.ts`) — BFS Voronoi growth from N random seeds with min Manhattan-distance spacing. Validates region sizes post-growth. Returns `null` on constraint failure.
2. **Symmetry/balance pre-filter** — rejects 180° rotationally symmetric layouts and regions where any single region exceeds 1.5× the average size.
3. **`solveStars()`** (`solver.ts`) — backtracking placement of k stars per row, enforcing row/column/region/adjacency constraints. Returns `null` if no valid placement exists.
4. **`hasUniqueSolutionV2()`** (`validator.ts`) — counts solutions up to 2 via backtracking; rejects anything other than exactly 1.

Max attempts: 500 for size ≤ 7, 2000 for size ≥ 8. Valid size/stars combos are defined in `puzzle/index.ts` as `ALLOWED_COMBOS`.

There is also an older v1 generator in `api/src/generator/` (union-find approach). It is no longer used in production — v2 is the active pipeline.

### Authentication flow

Both web and iOS use anonymous token auth:
- On first use, `POST /auth/register` with a random nickname → returns `api_token`
- Token stored in Keychain (iOS) or localStorage (web) as `queens_token`
- All puzzle requests send `X-API-Token: <token>` header
- A 401 response clears the stored token and triggers re-registration

### Validation (client-side)

Both clients implement local puzzle validation independently:
- Web: `web/lib/validator.ts` — checks row/col/region uniqueness and adjacency, returns `valid | incomplete | invalid` + a `Set<string>` of conflicting cell keys (`"row,col"`)
- iOS: `PuzzleValidator` in `StarBattlePuzzle.swift` — same logic but returns a typed `ValidationResult` enum with `ValidationError` cases

These are used for real-time conflict highlighting during gameplay, not for verifying correctness of generated puzzles.
