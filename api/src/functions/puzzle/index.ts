import type { Context } from 'hono'
import type { Bindings } from '../../bindings'

const CODE_RE = /^\d{1,9}$/

// Valid size/stars combinations
const ALLOWED_COMBOS: Record<number, number[]> = {
  1: [5, 6, 8],
  2: [10],
}
const ALLOWED_STARS = Object.keys(ALLOWED_COMBOS).map(Number)
const ALLOWED_SIZES = [...new Set(Object.values(ALLOWED_COMBOS).flat())]

/**
 * GET /puzzle/:code?
 * Fetches a puzzle from puzzles by code, or randomly filtered by size and/or stars.
 * code cannot be combined with size or stars.
 * size and stars can be used independently or together (must be a valid combo).
 */
export const puzzleV2Handler = async (c: Context<{ Bindings: Bindings }>) => {
  const codeParam = c.req.param('puzzleId')
  const sizeParam = c.req.query('size')
  const starsParam = c.req.query('stars')
  const difficultyParam = c.req.query('difficulty')

  console.log(`[puzzle] GET /puzzle/${codeParam ?? ''} — code: ${codeParam ?? 'none'}, size: ${sizeParam ?? 'any'}, stars: ${starsParam ?? 'any'}, difficulty: ${difficultyParam ?? 'any'}`)

  if (codeParam && (sizeParam || starsParam)) {
    console.log('[puzzle] → 400 code combined with size/stars')
    return c.json({ error: 'code cannot be combined with size or stars' }, 400)
  }
  if (codeParam && !CODE_RE.test(codeParam)) {
    console.log('[puzzle] → 400 invalid code format')
    return c.json({ error: 'Invalid code' }, 400)
  }

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
    // Build a dynamic WHERE from the provided filters.
    const clauses: string[] = []
    const binds: unknown[] = []
    if (size !== null)  { clauses.push('grid_size = ?'); binds.push(size) }
    if (stars !== null) { clauses.push('stars = ?');     binds.push(stars) }
    if (difficulties.length) {
      clauses.push(`difficulty IN (${difficulties.map(() => '?').join(',')})`)
      binds.push(...difficulties)
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')} ` : ''

    // Pick a random matching puzzle without an ORDER BY RANDOM() full scan.
    // COUNT(*) is answered by the idx_puzzles_grid_stars index, and the
    // LIMIT 1 OFFSET seek reads a single row — so a fetch costs ~1 row read
    // instead of one read per matching puzzle.
    const countRow = await c.env.DB
      .prepare(`SELECT COUNT(*) AS n FROM puzzles ${where}`)
      .bind(...binds)
      .first<{ n: number }>()
    const total = countRow?.n ?? 0
    if (total > 0) {
      const offset = Math.floor(Math.random() * total)
      row = await c.env.DB
        .prepare(`SELECT * FROM puzzles ${where}LIMIT 1 OFFSET ?`)
        .bind(...binds, offset)
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
  })
}
