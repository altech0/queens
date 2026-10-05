/**
 * Engine metadata: which generators exist, what they are called in the UI, and
 * which size/stars combos each one produces.
 *
 * This is the metadata half of the registry — deliberately free of any import
 * from `src/generator/**`, because the worker bundle must not carry generator or
 * solver code it never runs. The seed script pairs these ids with the actual
 * `generate` functions.
 *
 * The id is what lives in `puzzles.engine` and is never shown to players. The
 * display name lives here so it can change without an app release, and two
 * engines may share one (an uncapped Voronoi variant would still read as
 * "Original"). When the solver is rewritten, hardened boards get a new id
 * (`snake-harden-v2`) rather than relabelling existing rows.
 */

export interface EngineCombo {
  size: number
  stars: number
}

export interface EngineMeta {
  id: string
  displayName: string
  description: string
  combos: EngineCombo[]
}

/** The engine every pre-existing puzzle was made by, and the default when none is asked for. */
export const DEFAULT_ENGINE = 'voronoi-v2'

export const ENGINES: EngineMeta[] = [
  {
    id: 'voronoi-v2',
    displayName: 'Original',
    description: 'Balanced regions that grow evenly from the centre out.',
    combos: [
      { size: 5, stars: 1 },
      { size: 6, stars: 1 },
      { size: 8, stars: 1 },
      { size: 10, stars: 2 },
    ],
  },
  {
    id: 'snake-v1',
    displayName: 'Winding',
    description: 'Long, twisting regions with narrow corridors.',
    combos: [
      { size: 8, stars: 1 },
      { size: 9, stars: 1 },
    ],
  },
  {
    id: 'snake-harden-v1',
    displayName: 'Tangled',
    description: 'Winding regions, tuned to need the trickiest deductions.',
    combos: [
      { size: 8, stars: 1 },
      { size: 9, stars: 1 },
    ],
  },
]

const BY_ID = new Map(ENGINES.map(e => [e.id, e]))

export const ENGINE_IDS = ENGINES.map(e => e.id)

export const isKnownEngine = (id: string): boolean => BY_ID.has(id)

export const getEngine = (id: string): EngineMeta | undefined => BY_ID.get(id)

/** True when `engine` is generated at this size/stars combination. */
export function engineSupports(engineId: string, size: number, stars: number): boolean {
  const engine = BY_ID.get(engineId)
  if (!engine) return false
  return engine.combos.some(c => c.size === size && c.stars === stars)
}

/** Every size/stars combo reachable across the given engines. */
export function combosFor(engineIds: string[]): EngineCombo[] {
  const seen = new Set<string>()
  const out: EngineCombo[] = []
  for (const id of engineIds) {
    for (const combo of BY_ID.get(id)?.combos ?? []) {
      const key = `${combo.size}-${combo.stars}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push(combo)
    }
  }
  return out
}
