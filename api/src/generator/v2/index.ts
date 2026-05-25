import { PuzzleConfig } from '../../types/puzzleConfig'
import { buildRegionsV2 } from './regionBuilder'
import { solveStars } from './solver'
import { hasUniqueSolutionV2 } from './validator'

export interface PuzzleResultV2 {
  gridSize: number
  stars: number
  regions: number[][]
  solution: number[][]
}

export interface GenerateCounters {
  failedRegions: number
  failedSolve: number
  failedSymmetry: number
  failedUniqueness: number
  attempts: number
}

export interface GenerateResultV2 {
  puzzle: PuzzleResultV2 | null
  counters: GenerateCounters
}

/**
 * Places k stars per row satisfying row/column/adjacency constraints with no region context.
 * Returns a solution in the same format as solveStars — solution[row] = sorted column indices.
 * Kept for potential future use; not called in the generation loop.
 */
export function placeStarsRandom(config: PuzzleConfig): number[][] | null {
  const { size, starsPerUnit: k } = config
  const colCount = new Array(size).fill(0)
  const solution: number[][] = []

  function validCombos(row: number, prevStars: number[]): number[][] {
    const banned = new Set<number>()
    for (const ps of prevStars) {
      if (ps - 1 >= 0) banned.add(ps - 1)
      banned.add(ps)
      if (ps + 1 < size) banned.add(ps + 1)
    }
    const available: number[] = []
    for (let c = 0; c < size; c++) {
      if (colCount[c] < k && !banned.has(c)) available.push(c)
    }
    for (let i = available.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[available[i], available[j]] = [available[j], available[i]]
    }
    if (k === 1) return available.map(c => [c])
    const pairs: number[][] = []
    for (let i = 0; i < available.length; i++) {
      for (let j = i + 1; j < available.length; j++) {
        if (Math.abs(available[i] - available[j]) <= 1) continue
        pairs.push([available[i], available[j]])
      }
    }
    for (let i = pairs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[pairs[i], pairs[j]] = [pairs[j], pairs[i]]
    }
    return pairs
  }

  function backtrack(row: number): boolean {
    if (row === size) return true
    for (const combo of validCombos(row, row > 0 ? solution[row - 1] : [])) {
      combo.forEach(c => colCount[c]++)
      solution.push(combo)
      if (backtrack(row + 1)) return true
      solution.pop()
      combo.forEach(c => colCount[c]--)
    }
    return false
  }

  return backtrack(0) ? solution : null
}

/**
 * Fast pre-filter: rejects region layouts that are obviously too unbalanced to
 * produce a unique solution. Runs before the expensive solveStars/hasUniqueSolution
 * checks — O(N²) cell scan vs O(N!) backtracking.
 *
 * Rejects if any single region exceeds 60% of average size, which indicates a
 * dominant mega-region with many alternative star positions.
 */
function hasOvercrowdedRows(regions: number[][], gridSize: number, stars: number): boolean {
  const maxRowSpan = stars === 1 ? Math.ceil(gridSize / 2) : Math.ceil(gridSize * 0.75)
  const regionRowMin = new Array(gridSize).fill(gridSize)
  const regionRowMax = new Array(gridSize).fill(-1)
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const id = regions[row][col]
      if (row < regionRowMin[id]) regionRowMin[id] = row
      if (row > regionRowMax[id]) regionRowMax[id] = row
    }
  }
  for (let r = 0; r < gridSize; r++) {
    if (regionRowMax[r] - regionRowMin[r] + 1 > maxRowSpan) return true
  }
  return false
}

function hasOvercrowdedCols(regions: number[][], gridSize: number, stars: number): boolean {
  const maxColSpan = stars === 1 ? Math.ceil(gridSize / 2) : Math.ceil(gridSize * 0.75)
  const regionColMin = new Array(gridSize).fill(gridSize)
  const regionColMax = new Array(gridSize).fill(-1)
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const id = regions[row][col]
      if (col < regionColMin[id]) regionColMin[id] = col
      if (col > regionColMax[id]) regionColMax[id] = col
    }
  }
  for (let r = 0; r < gridSize; r++) {
    if (regionColMax[r] - regionColMin[r] + 1 > maxColSpan) return true
  }
  return false
}

function isLikelyUnique(regions: number[][], gridSize: number, stars: number): boolean {
  const hardCap = Math.floor(gridSize * 1.5)
  const regionSizes = new Array(gridSize).fill(0)
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      regionSizes[regions[r][c]]++
    }
  }
  return !regionSizes.some(s => s > hardCap)
}

function isSymmetric(regions: number[][], size: number): boolean {
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (regions[r][c] !== regions[size - 1 - r][size - 1 - c]) return false
    }
  }
  return true
}

/**
 * Attempts to generate a valid v2 Queens puzzle for the given config.
 *
 * Each attempt:
 * 1. Build a region layout via BFS Voronoi growth (random seeds, size-capped).
 * 2. Reject 180° rotationally symmetric layouts.
 * 3. Pre-filter: reject obviously unbalanced region layouts.
 * 4. Find a valid k-star placement via backtracking solver.
 * 5. Verify the puzzle has exactly one valid solution.
 *
 * Returns the first passing result, or null if all attempts are exhausted.
 */
export function generatePuzzleV2(config: PuzzleConfig): GenerateResultV2 {
  const { size, starsPerUnit: stars } = config
  const maxAttempts = size >= 8 ? 2000 : 500
  let failedRegions = 0, failedSolve = 0, failedSymmetry = 0, failedUniqueness = 0

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const regions = buildRegionsV2(config)
    if (!regions) { failedRegions++; continue }

    if (isSymmetric(regions, size)) { failedSymmetry++; continue }

    if (!isLikelyUnique(regions, size, stars)) { failedRegions++; continue }

    const solution = solveStars(regions, config)
    if (!solution) { failedSolve++; continue }

    if (!hasUniqueSolutionV2(regions, config)) { failedUniqueness++; continue }

    const counters = { failedRegions, failedSolve, failedSymmetry, failedUniqueness, attempts: attempt + 1 }
    console.log(`[v2 generator] size=${size} stars=${stars} — success on attempt ${attempt + 1}/${maxAttempts} — failedRegions: ${failedRegions}, failedSolve: ${failedSolve}, failedSymmetry: ${failedSymmetry}, failedUniqueness: ${failedUniqueness}`)
    return { puzzle: { gridSize: size, stars, regions, solution }, counters }
  }

  const counters = { failedRegions, failedSolve, failedSymmetry, failedUniqueness, attempts: maxAttempts }
  console.log(`[v2 generator] size=${size} stars=${stars} — exhausted ${maxAttempts} attempts — failedRegions: ${failedRegions}, failedSolve: ${failedSolve}, failedSymmetry: ${failedSymmetry}, failedUniqueness: ${failedUniqueness}`)
  return { puzzle: null, counters }
}
