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

export const dashboardUsersHandler = async (c: Context<{ Bindings: Bindings }>) => {
  const days = Math.min(Number(c.req.query('days') ?? 90), 365)
  const [registrations, active] = await Promise.all([
    c.env.DB.prepare(`
      SELECT date(created_at) as date, COUNT(*) as count
      FROM users
      WHERE created_at >= date('now', ?)
      GROUP BY date(created_at)
      ORDER BY date ASC
    `).bind(`-${days} days`).all(),
    c.env.DB.prepare(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN last_active_at >= datetime('now', '-1 hours')  THEN 1 END) as active_1h,
        COUNT(CASE WHEN last_active_at >= datetime('now', '-24 hours') THEN 1 END) as active_24h,
        COUNT(CASE WHEN last_active_at >= datetime('now', '-7 days')   THEN 1 END) as active_7d,
        COUNT(CASE WHEN last_active_at >= datetime('now', '-30 days')  THEN 1 END) as active_30d
      FROM users
    `).first(),
  ])
  return c.json({ registrations: registrations.results, active })
}

export const dashboardPuzzleServesHandler = async (c: Context<{ Bindings: Bindings }>) => {
  const row = await c.env.DB.prepare(`
    SELECT
      COUNT(CASE WHEN served_at >= datetime('now', '-1 hours')  THEN 1 END) as served_1h,
      COUNT(CASE WHEN served_at >= datetime('now', '-24 hours') THEN 1 END) as served_24h,
      COUNT(CASE WHEN served_at >= datetime('now', '-7 days')   THEN 1 END) as served_7d,
      COUNT(CASE WHEN served_at >= datetime('now', '-30 days')  THEN 1 END) as served_30d
    FROM puzzle_serves
  `).first()
  return c.json(row)
}
