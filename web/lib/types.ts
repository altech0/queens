export interface Puzzle {
  id: string
  gridSize: number
  stars: number
  regions: number[][]
  solution: [number, number][]
  code: number
  /** Which generator made it. Absent from an API predating styles. */
  engine?: string
}

export type CellState = 'empty' | 'x' | 'star'

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
