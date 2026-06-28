import type { Context } from 'hono'
import type { Bindings } from '../../bindings'

export const dashboardHandler = async (c: Context<{ Bindings: Bindings }>) => {
  const days      = Math.min(Number(c.req.query('days')  ?? 90),  365)
  const seedLimit = Math.min(Number(c.req.query('limit') ?? 100), 500)

  const [puzzles, seedRuns, registrations, active, puzzleServes, userSource, retentionBuckets, retentionWeekly] =
    await Promise.all([
      c.env.DB.prepare(
        'SELECT grid_size, stars, COUNT(*) as count FROM puzzles GROUP BY grid_size, stars ORDER BY grid_size, stars'
      ).all(),

      c.env.DB.prepare(
        'SELECT * FROM seed_runs ORDER BY started_at DESC LIMIT ?'
      ).bind(seedLimit).all(),

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

      c.env.DB.prepare(`
        SELECT
          COUNT(CASE WHEN served_at >= datetime('now', '-1 hours')  THEN 1 END) as served_1h,
          COUNT(CASE WHEN served_at >= datetime('now', '-24 hours') THEN 1 END) as served_24h,
          COUNT(CASE WHEN served_at >= datetime('now', '-7 days')   THEN 1 END) as served_7d,
          COUNT(CASE WHEN served_at >= datetime('now', '-30 days')  THEN 1 END) as served_30d
        FROM puzzle_serves
      `).first(),

      c.env.DB.prepare(`
        SELECT COALESCE(source, 'unknown') as source, COUNT(*) as count
        FROM users
        GROUP BY source
      `).all(),

      c.env.DB.prepare(`
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN (julianday(last_active_at) - julianday(created_at)) * 1440 < 5     THEN 1 END) as one_and_done,
          COUNT(CASE WHEN (julianday(last_active_at) - julianday(created_at)) * 1440 >= 1440  THEN 1 END) as returned_1d,
          COUNT(CASE WHEN (julianday(last_active_at) - julianday(created_at)) * 1440 >= 10080 THEN 1 END) as returned_7d,
          COUNT(CASE WHEN (julianday(last_active_at) - julianday(created_at)) * 1440 >= 43200 THEN 1 END) as returned_30d
        FROM users
        WHERE last_active_at IS NOT NULL
      `).first(),

      c.env.DB.prepare(`
        SELECT
          strftime('%Y-W%W', created_at) as week,
          COUNT(*) as total,
          COUNT(CASE WHEN (julianday(last_active_at) - julianday(created_at)) * 1440 < 5     THEN 1 END) as one_and_done,
          COUNT(CASE WHEN (julianday(last_active_at) - julianday(created_at)) * 1440 >= 1440  THEN 1 END) as returned_1d,
          COUNT(CASE WHEN (julianday(last_active_at) - julianday(created_at)) * 1440 >= 10080 THEN 1 END) as returned_7d,
          COUNT(CASE WHEN (julianday(last_active_at) - julianday(created_at)) * 1440 >= 43200 THEN 1 END) as returned_30d
        FROM users
        WHERE last_active_at IS NOT NULL
        GROUP BY week
        ORDER BY week ASC
      `).all(),
    ])

  return c.json({
    puzzles:       puzzles.results,
    seedRuns:      seedRuns.results,
    users: {
      registrations: registrations.results,
      active,
    },
    puzzleServes,
    userSource:    userSource.results,
    retention: {
      buckets: retentionBuckets,
      weekly:  retentionWeekly.results,
    },
  })
}
