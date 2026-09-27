import type { Context } from 'hono'
import type { Bindings } from '../../bindings'
import { ENGINES } from '../../types/engines'

/**
 * GET /catalogue
 *
 * What styles exist, what they are called, and which sizes actually have
 * puzzles. The app drives its style and size pickers from this rather than a
 * hardcoded list, so a new engine needs no app release.
 *
 * Only combos with puzzles are returned: an engine listed in the registry but
 * never seeded is omitted entirely, so the app never offers a style that would
 * 404. Per-difficulty counts let it prune difficulty choices too (Tangled
 * boards are nearly all `hard`).
 */

interface CatalogueRow {
  engine: string
  grid_size: number
  stars: number
  difficulty: string | null
  n: number
}

export const catalogueHandler = async (c: Context<{ Bindings: Bindings }>) => {
  // Counted live rather than read from puzzle_counts: that table is keyed by
  // (engine, grid_size, stars) with no difficulty, and adding difficulty to it
  // would need a fourth trigger case, since difficulty is mutable (it was
  // backfilled in place by 0019) unlike engine/grid_size/stars. Four rows per
  // style is cheap, and the response is edge-cached below.
  const { results } = await c.env.DB.prepare(
    `SELECT engine, grid_size, stars, difficulty, COUNT(*) AS n
       FROM puzzles
      GROUP BY engine, grid_size, stars, difficulty`
  ).all<CatalogueRow>()

  // engine -> "size-stars" -> { count, difficulties }
  const totals = new Map<string, Map<string, { size: number; stars: number; count: number; difficulties: Record<string, number> }>>()
  for (const row of results ?? []) {
    const perEngine = totals.get(row.engine) ?? new Map()
    totals.set(row.engine, perEngine)

    const key = `${row.grid_size}-${row.stars}`
    const combo = perEngine.get(key) ?? { size: row.grid_size, stars: row.stars, count: 0, difficulties: {} }
    combo.count += row.n
    // Rows predating the 0019 backfill can still have a NULL difficulty; they
    // count towards the total but cannot be offered as a difficulty choice.
    if (row.difficulty) combo.difficulties[row.difficulty] = (combo.difficulties[row.difficulty] ?? 0) + row.n
    perEngine.set(key, combo)
  }

  const styles = ENGINES.flatMap(engine => {
    const perEngine = totals.get(engine.id)
    if (!perEngine) return []

    // Registry order, and only combos the engine declares *and* has puzzles for.
    const sizes = engine.combos
      .map(combo => perEngine.get(`${combo.size}-${combo.stars}`))
      .filter((combo): combo is NonNullable<typeof combo> => !!combo && combo.count > 0)

    if (!sizes.length) return []
    return [{
      engine: engine.id,
      name: engine.displayName,
      description: engine.description,
      sizes,
    }]
  })

  console.log(`[catalogue] → 200 ${styles.length} styles`)

  // Short edge cache: counts move only when the seed script runs.
  c.header('Cache-Control', 'public, max-age=300')
  return c.json({ styles })
}
