import { PuzzleConfig } from '../types/puzzleConfig'
import { placeQueens } from './queensSolver'
import { buildRegions } from './regionBuilder'
import { hasUniqueSolution } from './validator'

export interface PuzzleResult {
  size: number
  regions: number[][]
  solution: number[]
}

/**
 * Returns true if the region grid has 180° rotational symmetry
 * (i.e. `regions[r][c] === regions[N-1-r][N-1-c]` for every cell).
 * Symmetric puzzles are rejected because they tend to feel less interesting.
 */
function isSymmetric(regions: number[][], size: number): boolean {
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (regions[r][c] !== regions[size - 1 - r][size - 1 - c]) return false
    }
  }
  return true
}

/**
 * Attempts to generate a valid Queens puzzle for the given config.
 * Runs up to 500 attempts, each time: placing queens, building regions,
 * rejecting symmetric grids, then verifying uniqueness.
 * Returns the first passing result, or `null` if all attempts fail.
 * Logs per-stage failure counts on success or exhaustion.
 */
export function generatePuzzle(config: PuzzleConfig): PuzzleResult | null {
  const { size } = config
  let failedQueens = 0, failedRegions = 0, failedSymmetry = 0, failedUniqueness = 0
  const maxAttempts = size >= 10 ? 2000 : size >= 9 ? 1000 : 500

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const solution = placeQueens(config)
    if (!solution) { failedQueens++; continue }

    const regions = buildRegions(config, solution)
    if (!regions) { failedRegions++; continue }

    if (isSymmetric(regions, size)) { failedSymmetry++; continue }

    const valid = hasUniqueSolution(regions, config)
    if (!valid) { failedUniqueness++; continue }

    console.log(`[generator] success on attempt ${attempt + 1} — failedQueens: ${failedQueens}, failedRegions: ${failedRegions}, failedSymmetry: ${failedSymmetry}, failedUniqueness: ${failedUniqueness}`)
    return { size: config.size, regions, solution }
  }

  console.log(`[generator] exhausted ${maxAttempts} attempts — failedQueens: ${failedQueens}, failedRegions: ${failedRegions}, failedSymmetry: ${failedSymmetry}, failedUniqueness: ${failedUniqueness}`)
  return null
}
