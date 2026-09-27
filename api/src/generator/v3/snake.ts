import {
  type Grid, type Cell,
  emptyGrid, eden, expWeights, findSolutions, isSymmetric, randomQueens,
  regionsAreValid, repair, shuffle, snake, toSolutionRows,
} from './common'

export interface PuzzleResultV3 {
  gridSize: number
  stars: number
  regions: number[][]
  solution: number[][]
}

export interface GenerateCountersV3 {
  attempts: number
  failedLayout: number
  failedRepair: number
  failedSymmetry: number
  failedRegions: number
  failedBand: number
}

export interface GenerateResultV3 {
  puzzle: PuzzleResultV3 | null
  counters: GenerateCountersV3
}

export const emptyCounters = (): GenerateCountersV3 => ({
  attempts: 0, failedLayout: 0, failedRepair: 0, failedSymmetry: 0, failedRegions: 0, failedBand: 0,
})

/** Soft ceiling on region size. Roughly 2.5x the average, which is n cells. */
export const sizeCap = (n: number) => Math.round(2.5 * n)

/**
 * One candidate layout: queens first, a few 1-wide snakes, then Eden fill.
 *
 * Seeding each region with a queen means the layout is solvable by construction
 * — the queen layout itself is a valid solution — so the generator never has to
 * search for one. Uniqueness is what still has to be earned, by `repair`.
 */
export function snakeLayout(n: number): { grid: Grid; queens: Cell[]; solution: number[] } {
  const queens = randomQueens(n)
  const solution = queens.map(([, c]) => c)

  const grid = emptyGrid(n)
  queens.forEach(([r, c], id) => { grid[r][c] = id })

  // 1-3 regions grow as corridors, then freeze so Eden cannot thicken them.
  const snakeIds = shuffle([...Array(n).keys()]).slice(0, 1 + Math.floor(Math.random() * 3))
  for (const id of snakeIds) {
    snake(grid, n, id, queens[id], 3 + Math.floor(Math.random() * (n - 2)))
  }

  const weights = expWeights(n)
  // Nudge one non-snake region to grow large, for a LinkedIn-style dominant blob.
  const fat = shuffle([...Array(n).keys()].filter(i => !snakeIds.includes(i)))[0]
  if (fat !== undefined) weights[fat] *= 3

  eden(grid, n, weights, new Set(snakeIds), sizeCap(n))
  return { grid, queens, solution }
}

/**
 * `snake-v1` — "Winding".
 *
 * Builds a layout, then repairs it until the intended solution is the only one.
 * Rejects symmetric or structurally invalid results and tries again.
 */
export function generateSnakeV1(gridSize: number, maxAttempts = 400): GenerateResultV3 {
  const n = gridSize
  const counters = emptyCounters()

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    counters.attempts = attempt + 1

    const { grid, solution } = snakeLayout(n)
    if (!regionsAreValid(grid, n)) { counters.failedRegions++; continue }

    const repaired = repair(grid, n, solution)
    if (!repaired) { counters.failedRepair++; continue }

    const g = repaired.grid
    if (!regionsAreValid(g, n)) { counters.failedRegions++; continue }
    if (isSymmetric(g, n)) { counters.failedSymmetry++; continue }

    // Repair guarantees this, but the solution is what players get served:
    // verify rather than trust.
    const sols = findSolutions(g, n, 2)
    if (sols.length !== 1) { counters.failedLayout++; continue }
    if (sols[0].some((c, r) => c !== solution[r])) { counters.failedLayout++; continue }

    return {
      puzzle: { gridSize: n, stars: 1, regions: g, solution: toSolutionRows(solution) },
      counters,
    }
  }

  return { puzzle: null, counters }
}
