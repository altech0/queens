import { PuzzleConfig } from '../../types/puzzleConfig'

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function manhattan(r1: number, c1: number, r2: number, c2: number): number {
  return Math.abs(r1 - r2) + Math.abs(c1 - c2)
}

function neighbours(r: number, c: number, size: number): [number, number][] {
  const result: [number, number][] = []
  if (r > 0) result.push([r - 1, c])
  if (r < size - 1) result.push([r + 1, c])
  if (c > 0) result.push([r, c - 1])
  if (c < size - 1) result.push([r, c + 1])
  return result
}

/**
 * Returns true if a 3-cell region is collinear (all same row or all same column).
 * Used to validate the minimum-size exception for 2-star puzzles.
 */
function isCollinear(cells: [number, number][]): boolean {
  return cells.every(([r]) => r === cells[0][0]) ||
    cells.every(([, c]) => c === cells[0][1])
}

/**
 * Returns true if the region meets the minimum size requirement for the puzzle type.
 * 1-star: ≥ 2 cells. 2-star: ≥ 4 cells, or exactly 3 if collinear.
 */
function meetsMinSize(cells: [number, number][], stars: number): boolean {
  if (stars === 1) return cells.length >= 2
  if (cells.length >= 4) return true
  if (cells.length === 3) return isCollinear(cells)
  return false
}

/**
 * Builds an N-region partition of the N×N grid using simultaneous BFS Voronoi growth.
 *
 * Algorithm:
 * 1. Place N seeds spread across the grid (min Manhattan distance enforced).
 * 2. Grow all regions simultaneously via BFS — each cell passes its region ID to
 *    unclaimed neighbours. Regions stop growing once they hit maxRegionSize.
 *    Shuffling the frontier each round adds organic randomness.
 * 3. Validate post-growth constraints:
 *    - Every region meets the minimum size for the puzzle type.
 *    - At most 2 regions are at minimum size.
 *    - No region exceeds maxRegionSize (1.5× average).
 *
 * Returns an N×N grid of region IDs, or `null` if any constraint fails.
 */
export function buildRegionsV2(config: PuzzleConfig): number[][] | null {
  const { size, starsPerUnit: stars } = config
  const minSeedDist = Math.max(2, Math.floor(Math.sqrt(size)))
  const maxRegionSize = Math.floor(size * 1.5)

  // 1. Place N seeds with minimum Manhattan distance between any two
  const seeds: [number, number][] = []
  let seedAttempts = 0
  while (seeds.length < size && seedAttempts < 2000) {
    seedAttempts++
    const r = Math.floor(Math.random() * size)
    const c = Math.floor(Math.random() * size)
    if (seeds.every(([sr, sc]) => manhattan(r, c, sr, sc) >= minSeedDist)) {
      seeds.push([r, c])
    }
  }
  if (seeds.length < size) return null

  // 2. Initialise grid: -1 = unclaimed; seeds are claimed immediately
  const grid: number[][] = Array.from({ length: size }, () => new Array(size).fill(-1))
  seeds.forEach(([r, c], i) => { grid[r][c] = i })

  // 3. Simultaneous BFS — all seeds expand in lockstep
  let frontier: [number, number][] = shuffle([...seeds])

  while (frontier.length > 0) {
    const next: [number, number][] = []
    for (const [r, c] of frontier) {
      for (const [nr, nc] of shuffle(neighbours(r, c, size))) {
        if (grid[nr][nc] === -1) {
          grid[nr][nc] = grid[r][c]
          next.push([nr, nc])
        }
      }
    }
    frontier = shuffle(next)
  }

  // Safety: BFS Voronoi always fills the grid, but guard against edge cases
  if (grid.some(row => row.some(v => v === -1))) return null

  // 4. Collect cells per region for constraint checks
  const regionCells: [number, number][][] = Array.from({ length: size }, () => [])
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      regionCells[grid[r][c]].push([r, c])
    }
  }

  const minSizeThreshold = stars === 1 ? 2 : 4

  let smallCount = 0
  for (let i = 0; i < size; i++) {
    const cells = regionCells[i]
    if (!meetsMinSize(cells, stars)) return null
    if (cells.length > maxRegionSize) return null
    if (cells.length <= minSizeThreshold) smallCount++
  }

  if (smallCount > 2) return null

  return grid
}
