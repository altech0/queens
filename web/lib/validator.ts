import type { Puzzle, CellState } from './types'

export type ValidationResult = 'valid' | 'incomplete' | 'invalid'

export function validate(
  cells: CellState[][],
  puzzle: Puzzle
): { result: ValidationResult; conflicts: Set<string> } {
  const stars: [number, number][] = []
  const size = puzzle.gridSize

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (cells[r][c] === 'star') stars.push([r, c])
    }
  }

  const required = puzzle.gridSize
  const conflicts = new Set<string>()

  // Row/col/region counts
  const rowCounts    = new Map<number, number>()
  const colCounts    = new Map<number, number>()
  const regionCounts = new Map<number, number>()

  for (const [r, c] of stars) {
    rowCounts.set(r, (rowCounts.get(r) ?? 0) + 1)
    colCounts.set(c, (colCounts.get(c) ?? 0) + 1)
    regionCounts.set(puzzle.regions[r][c], (regionCounts.get(puzzle.regions[r][c]) ?? 0) + 1)
  }

  const starSet = new Set(stars.map(([r, c]) => `${r},${c}`))

  for (const [r, c] of stars) {
    const key = `${r},${c}`

    if ((rowCounts.get(r) ?? 0) > 1 || (colCounts.get(c) ?? 0) > 1 || (regionCounts.get(puzzle.regions[r][c]) ?? 0) > 1) {
      conflicts.add(key)
    }

    // Adjacency check
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue
        if (starSet.has(`${r + dr},${c + dc}`)) {
          conflicts.add(key)
        }
      }
    }
  }

  if (stars.length < required) return { result: 'incomplete', conflicts }
  if (conflicts.size > 0) return { result: 'invalid', conflicts }

  return { result: 'valid', conflicts }
}
