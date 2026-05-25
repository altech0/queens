import { PuzzleConfig } from '../types/puzzleConfig'

/**
 * Returns `true` if the given region grid has exactly one valid queen placement.
 * Uses backtracking row-by-row, enforcing column uniqueness, kings-move
 * non-adjacency, and one queen per region. Stops as soon as a second solution
 * is found to avoid unnecessary work.
 *
 * Constraints are checked in O(1) per candidate cell using:
 * - A `usedCols` Set for column uniqueness
 * - A `usedRegions` Set for region uniqueness
 * - A single adjacency check against the previous row's queen only — valid
 *   because queens are placed row-by-row, so only row `row-1` can satisfy
 *   the kings-move adjacency condition `|r1 - r2| <= 1`.
 *
 * @param regions - N×N grid where `regions[r][c]` is the region ID of cell (r, c).
 */
export function hasUniqueSolution(regions: number[][], config: PuzzleConfig): boolean {
  const { size } = config
  let solutionCount = 0

  function solve(row: number, placed: number[], usedCols: Set<number>, usedRegions: Set<number>): void {
    if (solutionCount > 1) return
    if (row === size) { solutionCount++; return }
    const prevCol = row > 0 ? placed[row - 1] : -2
    for (let col = 0; col < size; col++) {
      if (usedCols.has(col)) continue
      if (Math.abs(col - prevCol) <= 1) continue
      const region = regions[row][col]
      if (usedRegions.has(region)) continue
      placed.push(col)
      usedCols.add(col)
      usedRegions.add(region)
      solve(row + 1, placed, usedCols, usedRegions)
      placed.pop()
      usedCols.delete(col)
      usedRegions.delete(region)
    }
  }

  solve(0, [], new Set(), new Set())
  return solutionCount === 1
}
