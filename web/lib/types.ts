export interface Puzzle {
  id: string
  gridSize: number
  stars: number
  regions: number[][]
  solution: [number, number][]
  code: number
  /** Which generator made it. Absent from an API predating styles. */
  engine?: string
  /** easy | medium | hard | very_hard. Null on rows predating the 0019 backfill. */
  difficulty?: string | null
}

/**
 * A cell's mark.
 *
 * `x` is a cross the player made; `auto-x` is one the app derived from a placed
 * star (the autoCross setting). Only `auto-x` cells are cleared when the stars
 * that implied them change, so a player's own marks are never touched. The
 * distinction lives in the state rather than a parallel set so it travels with
 * `cells` through undo, redo and the offline cache for free.
 */
export type CellState = 'empty' | 'x' | 'auto-x' | 'star'

/** Any cross, however it got there. Most logic cares only about this. */
export const isCross = (s: CellState): boolean => s === 'x' || s === 'auto-x'

export interface GridPosition {
  row: number
  col: number
}

/** One size/stars combination of a style, with how many puzzles exist. */
export interface CatalogueSize {
  size: number
  stars: number
  count: number
  /** Counts per difficulty bucket, so a picker can hide ones with no puzzles. */
  difficulties: Record<string, number>
}

/** One playable style, e.g. Original / Winding / Tangled. */
export interface CatalogueStyle {
  /** Internal engine id, sent back as the `engine` query param. */
  engine: string
  name: string
  description: string
  sizes: CatalogueSize[]
}
