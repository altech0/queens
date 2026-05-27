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

  console.log(`[puzzle] GET /puzzle/${codeParam ?? ''} — code: ${codeParam ?? 'none'}, size: ${sizeParam ?? 'any'}, stars: ${starsParam ?? 'any'}`)

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

  let row: Record<string, unknown> | null = null

  if (code !== null) {
    row = await c.env.DB.prepare('SELECT * FROM puzzles WHERE code = ?').bind(code).first() ?? null
  } else if (size !== null && stars !== null) {
    row = await c.env.DB.prepare('SELECT * FROM puzzles WHERE grid_size = ? AND stars = ? ORDER BY RANDOM() LIMIT 1').bind(size, stars).first() ?? null
  } else if (size !== null) {
    row = await c.env.DB.prepare('SELECT * FROM puzzles WHERE grid_size = ? ORDER BY RANDOM() LIMIT 1').bind(size).first() ?? null
  } else if (stars !== null) {
    row = await c.env.DB.prepare('SELECT * FROM puzzles WHERE stars = ? ORDER BY RANDOM() LIMIT 1').bind(stars).first() ?? null
  } else {
    row = await c.env.DB.prepare('SELECT * FROM puzzles ORDER BY RANDOM() LIMIT 1').first() ?? null
  }

  if (!row) {
    console.log(`[puzzle] → 404 not found — code: ${code ?? 'random'}`)
    return c.json({ error: 'Puzzle not found' }, 404)
  }

  console.log(`[puzzle] → 200 puzzle id: ${row.id}`)
  return c.json({
    id: row.id,
    code: row.code,
    gridSize: row.grid_size,
    stars: row.stars,
    regions: JSON.parse(row.regions as string),
    solution: JSON.parse(row.solution as string),
    createdAt: row.created_at,
  })
}
