import type { Context } from 'hono'
import type { Bindings } from '../../bindings'

export const dashboardPuzzlesHandler = async (c: Context<{ Bindings: Bindings }>) => {
  const rows = await c.env.DB.prepare(
    'SELECT grid_size, stars, COUNT(*) as count FROM puzzles GROUP BY grid_size, stars ORDER BY grid_size, stars'
  ).all()
  return c.json(rows.results)
}

export const dashboardSeedRunsHandler = async (c: Context<{ Bindings: Bindings }>) => {
  const limit = Math.min(Number(c.req.query('limit') ?? 100), 500)
  const rows = await c.env.DB.prepare(
    'SELECT * FROM seed_runs ORDER BY started_at DESC LIMIT ?'
  ).bind(limit).all()
  return c.json(rows.results)
}
