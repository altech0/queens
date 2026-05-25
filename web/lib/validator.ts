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

  for (let i = 0; i < stars.length; i++) {
    for (let j = i + 1; j < stars.length; j++) {
      const [r1, c1] = stars[i]
      const [r2, c2] = stars[j]
      const sameRow = r1 === r2
      const sameCol = c1 === c2
      const adjacent = Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1

      if (sameRow || sameCol || adjacent) {
        conflicts.add(`${r1},${c1}`)
        conflicts.add(`${r2},${c2}`)
      }
    }
  }

  if (stars.length < required) return { result: 'incomplete', conflicts }
  if (conflicts.size > 0) return { result: 'invalid', conflicts }

  // Check one star per row, column, region
  const rows    = new Set(stars.map(([r]) => r))
  const cols    = new Set(stars.map(([, c]) => c))
  const regions = new Set(stars.map(([r, c]) => puzzle.regions[r][c]))

  if (rows.size === required && cols.size === required && regions.size === required) {
    return { result: 'valid', conflicts }
  }

  // Find which stars violate row/col/region uniqueness
  const rowCounts    = new Map<number, number>()
  const colCounts    = new Map<number, number>()
  const regionCounts = new Map<number, number>()

  for (const [r, c] of stars) {
    rowCounts.set(r, (rowCounts.get(r) ?? 0) + 1)
    colCounts.set(c, (colCounts.get(c) ?? 0) + 1)
    const reg = puzzle.regions[r][c]
    regionCounts.set(reg, (regionCounts.get(reg) ?? 0) + 1)
  }

  for (const [r, c] of stars) {
    if ((rowCounts.get(r) ?? 0) > 1 || (colCounts.get(c) ?? 0) > 1 || (regionCounts.get(puzzle.regions[r][c]) ?? 0) > 1) {
      conflicts.add(`${r},${c}`)
    }
  }

  return { result: 'invalid', conflicts }
}
