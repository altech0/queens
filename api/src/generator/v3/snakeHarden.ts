import { solve, isComplete } from '@queens/solver'
import {
  type Grid,
  connectedWithout, findSolutions, isSymmetric, nb4, regionSizes, regionsAreValid,
  repair, toSolutionRows,
} from './common'
import {
  type GenerateResultV3, emptyCounters, snakeLayout,
} from './snake'

/**
 * The band of teachable progress a Tangled board must land in, as a fraction of
 * cells the teachable-only solver places before it stalls.
 *
 * Hill-climbing towards "as hard as possible" overshoots: it finds boards where
 * the teachable solver makes *zero* moves, which need tier-4 look-ahead from the
 * very first move and read as unfair rather than hard. So this targets a band and
 * stops climbing on entry, rather than maximising.
 *
 * Lower bound keeps a foothold for a human solver; upper bound keeps the board
 * meaningfully harder than Winding.
 */
export const BAND_MIN = 0.15
export const BAND_MAX = 0.60

/**
 * Where inside the band to aim.
 *
 * The band alone is too wide to aim at: `classifyDifficulty` calls a 9x9 `easy`
 * at teachFrac >= 0.40 and `medium` at >= 0.20, so a board that merely lands
 * inside the band is usually labelled `easy` — useless for the style whose whole
 * point is to be the hard one. Aiming below that keeps boards in `medium`/`hard`
 * while BAND_MIN still leaves a human solver a foothold.
 *
 * 0.30 rather than something tighter: measured over 20s runs at 9x9, targets of
 * 0.22 / 0.30 / 0.35 / 0.39 yielded 0.61 / 1.28 / 1.25 / 1.12 boards per second,
 * and 0.30 produced the best difficulty mix (~85% medium or hard). Aiming lower
 * than 0.30 halves throughput without making the boards measurably harder — the
 * climb has to accept many more moves, and every one costs a solve.
 */
export const TARGET = 0.30

export interface Hardness {
  /** Fraction of cells the teachable-only solver places before stalling. */
  teachFrac: number
  /**
   * Whether the full solver finishes the board — but reported as `false`, without
   * running it, when `teachFrac` already puts the board outside the band. Callers
   * always pair this with a band check, so the two are equivalent for them; read
   * it as "acceptable", not as a fact about the full solver.
   */
  fullSolved: boolean
}

export function hardness(regions: Grid, n: number): Hardness {
  const puzzle = { n, stars: 1, regions }
  const teachable = solve(puzzle, undefined, { teachableOnly: true })
  const teachFrac = teachable.steps / (n * n)

  // Two shortcuts, because the full solve is the expensive half and the hill
  // climb calls this on every trial move:
  //  - teachable-only finished it, so the full solver trivially would too;
  //  - the board is already outside the band on teachFrac alone, so the caller
  //    will reject it whatever the full solver says.
  if (isComplete(teachable.board, n)) return { teachFrac, fullSolved: true }
  if (teachFrac < BAND_MIN || teachFrac > BAND_MAX) return { teachFrac, fullSolved: false }

  return {
    teachFrac,
    fullSolved: isComplete(solve(puzzle, undefined, { teachableOnly: false }).board, n),
  }
}


export const inBand = (h: Hardness): boolean =>
  h.fullSolved && h.teachFrac >= BAND_MIN && h.teachFrac <= BAND_MAX

/**
 * Nudges a board harder by moving boundary cells between regions, one at a time.
 *
 * A move is kept only if the board stays unique, asymmetric, structurally valid,
 * fully solvable by the full solver, and got *closer to the band* than before.
 * Once inside the band it stops immediately — the goal is a target, not a maximum.
 *
 * Queen cells are never moved: that would change the intended solution.
 */
export function harden(grid: Grid, n: number, solution: number[], iterations: number): Grid {
  const queenCells = new Set(solution.map((c, r) => r + ',' + c))

  /**
   * Lower is better. Two tiers, so a board can climb from anywhere:
   * outside the band it scores 1 + how far outside (so getting closer to the
   * band always helps), inside the band it scores how far from TARGET. Any
   * in-band board therefore beats every out-of-band one.
   */
  const score = (h: Hardness): number => {
    if (!h.fullSolved) return Infinity
    if (h.teachFrac > BAND_MAX) return 1 + (h.teachFrac - BAND_MAX)
    if (h.teachFrac < BAND_MIN) return 1 + (BAND_MIN - h.teachFrac)
    return Math.abs(h.teachFrac - TARGET)
  }

  let current = hardness(grid, n)
  let best = score(current)
  // Already in the band at or below the target: hard enough, leave it be.
  if (current.fullSolved && current.teachFrac >= BAND_MIN && current.teachFrac <= TARGET) return grid

  for (let i = 0; i < iterations; i++) {
    // Sample a cell at random and reject it if it cannot move. Enumerating all
    // legal moves instead was measurably slower: it runs connectedWithout over
    // the whole grid every iteration, which costs more than the trial solves it
    // saves.
    const r = Math.floor(Math.random() * n)
    const c = Math.floor(Math.random() * n)
    if (queenCells.has(r + ',' + c)) continue

    const from = grid[r][c]
    if (regionSizes(grid, n)[from] <= 2) continue

    const others = [...new Set(nb4(r, c, n).map(([a, b]) => grid[a][b]).filter(x => x !== from))]
    if (!others.length) continue
    if (!connectedWithout(grid, n, from, [r, c])) continue

    grid[r][c] = others[Math.floor(Math.random() * others.length)]

    const stillOk =
      regionsAreValid(grid, n) &&
      !isSymmetric(grid, n) &&
      findSolutions(grid, n, 2).length === 1

    const candidate = stillOk ? hardness(grid, n) : null
    const candidateScore = candidate ? score(candidate) : Infinity
    if (candidateScore < best) {
      best = candidateScore
      current = candidate!
      // In the band and at or past the target: no need to climb further.
      if (current.teachFrac >= BAND_MIN && current.teachFrac <= TARGET) return grid
    } else {
      grid[r][c] = from             // revert
    }
  }
  return grid
}

/**
 * `snake-harden-v1` — "Tangled".
 *
 * A Winding layout, hill-climbed into the difficulty band. Throughput is roughly
 * 1-3 boards/s versus ~40/s for Winding, because every accepted move re-solves
 * the board twice.
 */
/**
 * 600 attempts rather than a couple of hundred: an individual layout only lands
 * in the band some of the time, and at 200 roughly 1 call in 40 gave up and
 * returned null. A caller asking for one puzzle should get one. Attempts are
 * cheap relative to the climb, so this costs throughput only on the rare board
 * that needs the extra tries.
 */
export function generateSnakeHardenV1(gridSize: number, maxAttempts = 600): GenerateResultV3 {
  const n = gridSize
  const counters = emptyCounters()

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    counters.attempts = attempt + 1

    const { grid, solution } = snakeLayout(n)
    if (!regionsAreValid(grid, n)) { counters.failedRegions++; continue }

    const repaired = repair(grid, n, solution)
    if (!repaired) { counters.failedRepair++; continue }

    const hardened = harden(repaired.grid, n, solution, 300)

    if (!regionsAreValid(hardened, n)) { counters.failedRegions++; continue }
    if (isSymmetric(hardened, n)) { counters.failedSymmetry++; continue }

    const sols = findSolutions(hardened, n, 2)
    if (sols.length !== 1) { counters.failedLayout++; continue }
    if (sols[0].some((c, r) => c !== solution[r])) { counters.failedLayout++; continue }

    if (!inBand(hardness(hardened, n))) { counters.failedBand++; continue }

    return {
      puzzle: { gridSize: n, stars: 1, regions: hardened, solution: toSolutionRows(solution) },
      counters,
    }
  }

  return { puzzle: null, counters }
}
