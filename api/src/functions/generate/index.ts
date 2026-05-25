import type { Context } from 'hono'
import type { Bindings } from '../../bindings'
import { generatePuzzleV2 } from '../../generator/v2'

const DEFAULT_CONFIG = { size: 6, starsPerUnit: 1 }

// Supported combinations based on generator performance:
// stars=1: sizes 5, 6, 8 (size=10 never achieves a unique solution with current algorithm)
// stars=2: sizes 8, 10
const ALLOWED_COMBOS: Record<number, number[]> = {
  1: [5, 6, 8],
  2: [8, 10],
}

/**
 * POST /generate
 * Generates a Queens puzzle using BFS Voronoi region growth and persists it to puzzles.
 * Accepts an optional JSON body `{ size?: number, starsPerUnit?: number }`.
 * Supported: starsPerUnit=1 with size 5, 6, or 8; starsPerUnit=2 with size 8 or 10.
 */
export const generateV2Handler = async (c: Context<{ Bindings: Bindings }>) => {
  const body = await c.req.json().catch(() => ({}))
  const config = {
    size: body.size ?? DEFAULT_CONFIG.size,
    starsPerUnit: body.starsPerUnit ?? DEFAULT_CONFIG.starsPerUnit,
  }

  console.log(`[generate] POST /generate — size: ${config.size}, starsPerUnit: ${config.starsPerUnit}`)

  const allowedSizes = ALLOWED_COMBOS[config.starsPerUnit]
  if (!allowedSizes) {
    console.log('[generate] → 400 invalid starsPerUnit')
    return c.json({ error: `Invalid starsPerUnit. Allowed values: ${Object.keys(ALLOWED_COMBOS).join(', ')}` }, 400)
  }
  if (!allowedSizes.includes(config.size)) {
    console.log(`[generate] → 400 invalid size for starsPerUnit=${config.starsPerUnit}`)
    return c.json({ error: `Invalid size for starsPerUnit=${config.starsPerUnit}. Allowed sizes: ${allowedSizes.join(', ')}` }, 400)
  }

  const { puzzle } = generatePuzzleV2(config)
  if (!puzzle) {
    console.log('[generate] → 500 failed to generate puzzle')
    return c.json({ error: 'Failed to generate puzzle' }, 500)
  }

  const id = crypto.randomUUID()
  const createdAt = new Date().toISOString()

  await c.env.DB.prepare(
    'INSERT INTO puzzles (id, grid_size, stars, regions, solution, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(id, puzzle.gridSize, puzzle.stars, JSON.stringify(puzzle.regions), JSON.stringify(puzzle.solution), createdAt).run()

  console.log(`[generate] → 200 puzzle created id: ${id}`)
  return c.json({ id, ...puzzle, createdAt })
}
