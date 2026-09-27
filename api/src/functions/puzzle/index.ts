import type { Context } from 'hono'
import type { Bindings } from '../../bindings'
import { DEFAULT_ENGINE, ENGINE_IDS, combosFor, isKnownEngine } from '../../types/engines'

const CODE_RE = /^\d{1,9}$/

/**
 * Valid size/stars combinations for a set of engines, as `stars -> sizes`.
 *
 * With no `engine` param this resolves to exactly the pre-engine table
 * (`{1: [5, 6, 8], 2: [10]}`), so a request from the shipped app validates
 * identically to before — `size=9` still 400s. See the baseline tests.
 */
function allowedCombos(engineIds: string[]): Record<number, number[]> {
  const out: Record<number, number[]> = {}
  for (const { size, stars } of combosFor(engineIds)) {
    (out[stars] ??= []).push(size)
  }
  for (const sizes of Object.values(out)) sizes.sort((a, b) => a - b)
  return out
}

/**
 * GET /puzzle/:code?
 * Fetches a puzzle from puzzles by code, or randomly filtered by size and/or stars.
 * code cannot be combined with size, stars or engine.
 * size and stars can be used independently or together (must be a valid combo).
 *
 * `engine` is an optional comma list of engine ids. Omitting it means Original
 * (`voronoi-v2`) only, which is what the live App Store build sends — new-engine
 * puzzles are never served to a client that did not ask for them.
 */
export const puzzleV2Handler = async (c: Context<{ Bindings: Bindings }>) => {
  const codeParam = c.req.param('puzzleId')
  const sizeParam = c.req.query('size')
  const starsParam = c.req.query('stars')
  const difficultyParam = c.req.query('difficulty')
  const engineParam = c.req.query('engine')

  console.log(`[puzzle] GET /puzzle/${codeParam ?? ''} — code: ${codeParam ?? 'none'}, size: ${sizeParam ?? 'any'}, stars: ${starsParam ?? 'any'}, difficulty: ${difficultyParam ?? 'any'}, engine: ${engineParam ?? 'default'}`)

  if (codeParam && (sizeParam || starsParam || engineParam)) {
    console.log('[puzzle] → 400 code combined with size/stars/engine')
    return c.json({ error: 'code cannot be combined with size, stars or engine' }, 400)
  }
  if (codeParam && !CODE_RE.test(codeParam)) {
    console.log('[puzzle] → 400 invalid code format')
    return c.json({ error: 'Invalid code' }, 400)
  }

  // Parse & validate the engine filter first: it decides which size/stars combos
  // are allowed below.
  //
  // The guarantee the rollout rests on: a request that names no engine is served
  // Original only, exactly as before engines existed. A client built before
  // styles sends no engine param, and must never be handed a board it cannot
  // render. So this defaults to Original and stays non-empty even for `?engine=`
  // or `?engine=,`, which would otherwise build `engine IN ()`.
  let engines: string[] = [DEFAULT_ENGINE]
  if (engineParam) {
    const requested = engineParam.split(',').map(e => e.trim()).filter(Boolean)
    const unknown = requested.filter(e => !isKnownEngine(e))
    if (unknown.length) {
      console.log(`[puzzle] → 400 invalid engine: ${unknown.join(', ')}`)
      return c.json({ error: `Invalid engine. Allowed: ${ENGINE_IDS.join(', ')}` }, 400)
    }
    // An param that parses to nothing is treated as absent, not as "no filter".
    if (requested.length) engines = requested
  }

  const ALLOWED_COMBOS = allowedCombos(engines)
  const ALLOWED_STARS = Object.keys(ALLOWED_COMBOS).map(Number)
  const ALLOWED_SIZES = [...new Set(Object.values(ALLOWED_COMBOS).flat())].sort((a, b) => a - b)

  const code = codeParam !== undefined ? Number(codeParam) : null
  const size = sizeParam !== undefined ? Number(sizeParam) : null
  const stars = starsParam !== undefined ? Number(starsParam) : null

  if (size !== null && !ALLOWED_SIZES.includes(size)) {
    console.log(`[puzzle] → 400 invalid size: ${size}`)
    return c.json({ error: `Invalid size. Allowed: ${ALLOWED_SIZES.join(', ')}` }, 400)
  }
  if (stars !== null && !ALLOWED_STARS.includes(stars)) {
    console.log(`[puzzle] → 400 invalid stars: ${stars}`)
    return c.json({ error: `Invalid stars. Allowed: ${ALLOWED_STARS.join(', ')}` }, 400)
  }
  if (size !== null && stars !== null && !ALLOWED_COMBOS[stars].includes(size)) {
    console.log(`[puzzle] → 400 invalid combo size=${size} stars=${stars}`)
    const comboDesc = Object.entries(ALLOWED_COMBOS).map(([s, sizes]) => `stars=${s}: [${sizes.join(', ')}]`).join(', ')
    return c.json({ error: `Invalid combination: size=${size} stars=${stars}. Valid combos — ${comboDesc}` }, 400)
  }

  // Parse & validate difficulty filter (ignored when fetching by code).
  const ALLOWED_DIFFICULTIES = ['easy', 'medium', 'hard', 'very_hard']
  let difficulties: string[] = []
  if (difficultyParam) {
    difficulties = difficultyParam.split(',').map(d => d.trim()).filter(Boolean)
    const invalid = difficulties.filter(d => !ALLOWED_DIFFICULTIES.includes(d))
    if (invalid.length) {
      console.log(`[puzzle] → 400 invalid difficulty: ${invalid.join(', ')}`)
      return c.json({ error: `Invalid difficulty. Allowed: ${ALLOWED_DIFFICULTIES.join(', ')}` }, 400)
    }
  }

  let row: Record<string, unknown> | null = null

  if (code !== null) {
    row = await c.env.DB.prepare('SELECT * FROM puzzles WHERE code = ?').bind(code).first() ?? null
  } else {
    // Build a dynamic WHERE from the provided filters. The engine clause leads,
    // matching idx_puzzles_engine_grid_stars_rand (migrations/0022) so the seek
    // below stays a single index lookup.
    const clauses: string[] = []
    const binds: unknown[] = []
    clauses.push(`engine IN (${engines.map(() => '?').join(',')})`)
    binds.push(...engines)
    if (size !== null)  { clauses.push('grid_size = ?'); binds.push(size) }
    if (stars !== null) { clauses.push('stars = ?');     binds.push(stars) }
    if (difficulties.length) {
      clauses.push(`difficulty IN (${difficulties.map(() => '?').join(',')})`)
      binds.push(...difficulties)
    }
    // Always at least the engine clause, so this is never empty.
    const where = `WHERE ${clauses.join(' AND ')} `

    // Pick a random matching puzzle with one index seek. Every puzzle has a
    // fixed random `rand` in [0, 1) (migrations/0020_add_puzzle_rand.sql):
    // take the first row at or after a random point, wrapping to the lowest
    // `rand` if nothing follows. ORDER BY RANDOM() read every matching row.
    row = await c.env.DB
      .prepare(`SELECT * FROM puzzles ${where}AND rand >= ? ORDER BY rand LIMIT 1`)
      .bind(...binds, Math.random())
      .first() ?? null
    if (row === null) {
      row = await c.env.DB
        .prepare(`SELECT * FROM puzzles ${where}ORDER BY rand LIMIT 1`)
        .bind(...binds)
        .first() ?? null
    }
  }

  if (!row) {
    console.log(`[puzzle] → 404 not found — code: ${code ?? 'random'}`)
    return c.json({ error: 'Puzzle not found' }, 404)
  }

  console.log(`[puzzle] → 200 puzzle id: ${row.id}`)

  const user = c.get('user')
  c.executionCtx.waitUntil(
    c.env.DB.prepare(
      "INSERT INTO puzzle_serves (id, user_id, puzzle_id, served_at) VALUES (?, ?, ?, datetime('now'))"
    ).bind(crypto.randomUUID(), user.id, row.id).run()
  )

  return c.json({
    id: row.id,
    code: row.code,
    gridSize: row.grid_size,
    stars: row.stars,
    regions: JSON.parse(row.regions as string),
    solution: JSON.parse(row.solution as string),
    difficulty: row.difficulty,
    createdAt: row.created_at,
    // Additive: the shipped app's decoder reads only its declared keys.
    engine: row.engine,
  })
}
