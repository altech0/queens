export interface Puzzle {
  id: string
  gridSize: number
  stars: number
  regions: number[][]
  solution: [number, number][]
  code: number
}

export type CellState = 'empty' | 'x' | 'star'

export interface GridPosition {
  row: number
  col: number
}
