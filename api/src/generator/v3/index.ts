/**
 * v3 generators, paired with the engine ids they produce.
 *
 * This is the half of the registry that carries generator code, so only the seed
 * script imports it. The API imports `src/types/engines.ts` instead, which holds
 * the metadata alone and keeps the worker bundle free of generator and solver code.
 *
 * v2 (`voronoi-v2`) is untouched and still produces every 2-star board.
 */
import { ENGINES, type EngineMeta } from '../../types/engines'
import { generateSnakeV1, type GenerateResultV3 } from './snake'
import { generateSnakeHardenV1 } from './snakeHarden'

export type { GenerateResultV3, PuzzleResultV3, GenerateCountersV3 } from './snake'
export * from './common'
export { generateSnakeV1, snakeLayout, sizeCap } from './snake'
export { generateSnakeHardenV1, harden, hardness, inBand, BAND_MIN, BAND_MAX } from './snakeHarden'

export interface EngineV3 extends EngineMeta {
  generate: (gridSize: number) => GenerateResultV3
}

/** The v3 engines, keyed by id. `voronoi-v2` is not here — it lives in v2. */
export const V3_ENGINES: Record<string, EngineV3> = Object.fromEntries(
  (['snake-v1', 'snake-harden-v1'] as const).map(id => {
    const meta = ENGINES.find(e => e.id === id)
    if (!meta) throw new Error(`engine metadata missing for ${id}`)
    const generate = id === 'snake-v1' ? generateSnakeV1 : generateSnakeHardenV1
    return [id, { ...meta, generate }]
  })
)

export const isV3Engine = (id: string): boolean => id in V3_ENGINES
