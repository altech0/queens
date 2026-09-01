import type { Context } from 'hono'
import type { Bindings } from '../../bindings'

// The page is public and a fresh build reads a few thousand rows, so the
// assembled JSON is served from the edge cache for a minute between rebuilds.
const CACHE_SECONDS = 60

export const dashboardHandler = async (c: Context<{ Bindings: Bindings }>) => {
  const days      = Math.min(Number(c.req.query('days')  ?? 90),  365)
  const seedLimit = Math.min(Number(c.req.query('limit') ?? 100), 500)

  // Key on the clamped params so equivalent URLs share one cache entry.
  const cacheKey = new Request(new URL(`/dashboard?days=${days}&limit=${seedLimit}`, c.req.url))
  // The Workers-only edge cache; the DOM lib's CacheStorage type hides `default`.
  const cache = (caches as CacheStorage & { default: Cache }).default
  const cached = await cache.match(cacheKey)
  if (cached) return new Response(cached.body, cached)

  // One round trip for every statement, and a consistent snapshot.
  const [puzzles, seedRuns, registrations, active, puzzleServes, userSource, retentionBuckets, retentionWeekly, reaped] =
    await c.env.DB.batch([
      // Kept exact by triggers on puzzles (migrations/0021_create_puzzle_counts.sql).
      c.env.DB.prepare(
        'SELECT grid_size, stars, n AS count FROM puzzle_counts WHERE n > 0 ORDER BY grid_size, stars'
      ),

      c.env.DB.prepare(
        'SELECT * FROM seed_runs ORDER BY started_at DESC LIMIT ?'
      ).bind(seedLimit),

      c.env.DB.prepare(`
        SELECT date(created_at) as date, COUNT(*) as count
        FROM users
        WHERE created_at >= date('now', ?)
          AND deleted_at IS NULL
        GROUP BY date(created_at)
        ORDER BY date ASC
      `).bind(`-${days} days`),

      c.env.DB.prepare(`
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN last_active_at >= datetime('now', '-1 hours')  THEN 1 END) as active_1h,
          COUNT(CASE WHEN last_active_at >= datetime('now', '-24 hours') THEN 1 END) as active_24h,
          COUNT(CASE WHEN last_active_at >= datetime('now', '-7 days')   THEN 1 END) as active_7d,
          COUNT(CASE WHEN last_active_at >= datetime('now', '-30 days')  THEN 1 END) as active_30d
        FROM users
        WHERE deleted_at IS NULL
      `),

      c.env.DB.prepare(`
        SELECT
          COUNT(CASE WHEN served_at >= datetime('now', '-1 hours')  THEN 1 END) as served_1h,
          COUNT(CASE WHEN served_at >= datetime('now', '-24 hours') THEN 1 END) as served_24h,
          COUNT(CASE WHEN served_at >= datetime('now', '-7 days')   THEN 1 END) as served_7d,
          COUNT(CASE WHEN served_at >= datetime('now', '-30 days')  THEN 1 END) as served_30d
        FROM puzzle_serves
        WHERE served_at >= datetime('now', '-30 days')
      `),

      c.env.DB.prepare(`
        SELECT COALESCE(source, 'unknown') as source, COUNT(*) as count
        FROM users
        WHERE deleted_at IS NULL
        GROUP BY source
      `),

      c.env.DB.prepare(`
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN (julianday(last_active_at) - julianday(created_at)) * 1440 < 5     THEN 1 END) as one_and_done,
          COUNT(CASE WHEN (julianday(last_active_at) - julianday(created_at)) * 1440 >= 1440  THEN 1 END) as returned_1d,
          COUNT(CASE WHEN (julianday(last_active_at) - julianday(created_at)) * 1440 >= 10080 THEN 1 END) as returned_7d,
          COUNT(CASE WHEN (julianday(last_active_at) - julianday(created_at)) * 1440 >= 43200 THEN 1 END) as returned_30d
        FROM users
        WHERE last_active_at IS NOT NULL
          AND deleted_at IS NULL
      `),

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
          AND deleted_at IS NULL
        GROUP BY week
        ORDER BY week ASC
      `),

      c.env.DB.prepare(`
        SELECT COALESCE(source, 'unknown') as source, COUNT(*) as count
        FROM users
        WHERE deleted_at IS NOT NULL
        GROUP BY source
      `),
    ])

  const res = c.json({
    puzzles:       puzzles.results,
    seedRuns:      seedRuns.results,
    users: {
      registrations: registrations.results,
      active:        active.results[0] ?? null,
    },
    puzzleServes:  puzzleServes.results[0] ?? null,
    userSource:    userSource.results,
    reaped:        reaped.results,
    retention: {
      buckets: retentionBuckets.results[0] ?? null,
      weekly:  retentionWeekly.results,
    },
  }, 200, { 'Cache-Control': `public, max-age=${CACHE_SECONDS}` })

  c.executionCtx.waitUntil(cache.put(cacheKey, res.clone()))
  return res
}
