# Queens API

A Cloudflare Worker API that generates and serves **Star Battle / Queens** puzzles — the logic puzzle popularised by LinkedIn.

## Rules

- N×N grid divided into N contiguous regions
- Place exactly **1 queen per row, per column, and per region**
- No two queens may touch, including diagonally
- Every generated puzzle has **exactly one solution**

## Stack

- [Cloudflare Workers](https://workers.cloudflare.com/) — serverless runtime
- [Hono](https://hono.dev/) — lightweight web framework
- [Cloudflare D1](https://developers.cloudflare.com/d1/) — SQLite-on-the-edge database
- TypeScript

## API

All protected endpoints require an `X-API-Key` header.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/health` | — | Liveness check |
| `POST` | `/generate` | ✓ | Generate and store a new puzzle |
| `GET` | `/puzzle/:id?` | ✓ | Fetch a puzzle by ID (or a random one) |

### POST /generate

```jsonc
// Request body (all fields optional)
{ "size": 6, "starsPerUnit": 1 }

// Response
{
  "id": "uuid",
  "size": 6,
  "regions": [[0,0,1,1,2,2], ...],  // N×N grid of region IDs (0-indexed)
  "solution": [2, 5, 0, 3, 1, 4],   // solution[row] = column of queen in that row
  "createdAt": "2026-03-23T12:00:00.000Z"
}
```

### GET /puzzle/:id?

Returns a specific puzzle by UUID, or a random puzzle if no ID is given.

## Puzzle Generator

The generator works in three stages:

1. **Place queens** (`queensSolver.ts`) — backtracking search to find a valid N-queens placement where no two queens touch
2. **Build regions** (`regionBuilder.ts`) — union-find merge algorithm: starts with N² singleton regions and randomly merges adjacent pairs, skipping any merge that would combine two queen-bearing regions, until exactly N regions remain
3. **Validate** (`validator.ts`) — confirms the puzzle has exactly one solution; also rejects rotationally symmetric grids

The attempt loop in `generator/index.ts` retries up to 500 times, logging per-stage failure counts on each success.

## Local Development

### Prerequisites

- Node.js 18+
- Wrangler CLI (`npm install -g wrangler`)

### Setup

```bash
npm install

# Initialise the local D1 database
npx wrangler d1 execute queens --local --file=migrations/0001_create_puzzles.sql
```

### Run locally

```bash
npx wrangler dev
```

The worker listens on `http://localhost:8787` by default.

### Environment variables

Create a `.dev.vars` file (gitignored) for local secrets:

```
API_KEY=your-local-api-key
```

## Deployment

```bash
npx wrangler deploy
```

The D1 database and binding are configured in `wrangler.toml`. Run migrations against the remote database before the first deploy:

```bash
npx wrangler d1 execute queens --file=migrations/0001_create_puzzles.sql
```

## Project Structure

```
src/
  index.ts              — Hono app, CORS middleware, route definitions
  bindings.ts           — Cloudflare Worker environment bindings (D1, secrets)
  middleware/
    auth.ts             — API key authentication middleware
  functions/
    health/             — GET /health handler
    puzzle/             — GET /puzzle/:id? handler
    generate/           — POST /generate handler
  generator/
    index.ts            — Orchestrator (placeQueens → buildRegions → validate)
    queensSolver.ts     — Backtracking N-queens placement
    regionBuilder.ts    — Union-find region builder
    validator.ts        — Uniqueness checker
  types/
    puzzleConfig.ts     — PuzzleConfig interface
migrations/
  0001_create_puzzles.sql
```
