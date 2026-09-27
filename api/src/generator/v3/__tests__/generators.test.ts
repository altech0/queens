import { describe, it, expect } from 'vitest'
import {
  connectedWithout, findSolutions, isSymmetric, randomQueens, regionSizes, repair,
  regionsAreValid, snakeLayout, corridorCells, type Grid,
} from '../index'
import { generateSnakeV1 } from '../snake'
import { generateSnakeHardenV1, hardness, inBand, BAND_MIN, BAND_MAX } from '../snakeHarden'

/**
 * These are randomised generators, so the tests assert invariants over a batch
 * rather than exact output. Every property here is one a served puzzle depends
 * on: a wrong solution or a second solution is a broken board for a player.
 */

const SIZES = [8, 9] as const

/** Every property a generated puzzle must hold, whichever engine made it. */
function expectWellFormed(regions: Grid, solution: number[][], n: number) {
  // n regions, each contiguous and at least two cells, every cell claimed.
  expect(regionsAreValid(regions, n)).toBe(true)
  expect(regionSizes(regions, n)).toHaveLength(n)
  expect(isSymmetric(regions, n)).toBe(false)

  // Exactly one solution, and it is the one we shipped.
  const sols = findSolutions(regions, n, 3)
  expect(sols).toHaveLength(1)
  expect(sols[0].map(c => [c])).toEqual(solution)

  // The solution is a legal queen layout: one per row and column, none touching.
  const cols = solution.map(row => row[0])
  expect(new Set(cols).size).toBe(n)
  for (let r = 1; r < n; r++) {
    expect(Math.abs(cols[r] - cols[r - 1])).toBeGreaterThan(1)
  }
  // One queen per region.
  const queenRegions = cols.map((c, r) => regions[r][c])
  expect(new Set(queenRegions).size).toBe(n)
}

describe('snake-v1 (Winding)', () => {
  it.each(SIZES)('produces well-formed puzzles at size %i', (n) => {
    for (let i = 0; i < 12; i++) {
      const { puzzle } = generateSnakeV1(n)
      expect(puzzle).not.toBeNull()
      expect(puzzle!.gridSize).toBe(n)
      expect(puzzle!.stars).toBe(1)
      expectWellFormed(puzzle!.regions, puzzle!.solution, n)
    }
  })

  it('produces 1-wide corridors, which the v2 generator could not', () => {
    // v2 lockstep growth averaged ~1.5 corridor cells on 9x9; the LinkedIn
    // reference board has 11. Averaged over a batch to stay robust.
    const counts = Array.from({ length: 12 }, () => {
      const { puzzle } = generateSnakeV1(9)
      return corridorCells(puzzle!.regions, 9)
    })
    const avg = counts.reduce((s, x) => s + x, 0) / counts.length
    expect(avg).toBeGreaterThan(5)
  })

  it('produces regions of varied size rather than uniform blobs', () => {
    const { puzzle } = generateSnakeV1(9)
    const sizes = regionSizes(puzzle!.regions, 9)
    // Uniform growth would put every region near the 9-cell average.
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeGreaterThan(4)
  })
})

describe('snake-harden-v1 (Tangled)', () => {
  it('produces well-formed 9x9 puzzles inside the difficulty band', () => {
    for (let i = 0; i < 3; i++) {
      const { puzzle } = generateSnakeHardenV1(9)
      expect(puzzle).not.toBeNull()
      expectWellFormed(puzzle!.regions, puzzle!.solution, 9)

      const h = hardness(puzzle!.regions, 9)
      expect(inBand(h)).toBe(true)
      expect(h.teachFrac).toBeGreaterThanOrEqual(BAND_MIN)
      expect(h.teachFrac).toBeLessThanOrEqual(BAND_MAX)
    }
  }, 120_000)

  it('never returns a board the teachable solver cannot start', () => {
    // The overshoot the band exists to prevent: zero teachable progress means
    // tier-4 look-ahead from the very first move.
    const { puzzle } = generateSnakeHardenV1(9)
    expect(hardness(puzzle!.regions, 9).teachFrac).toBeGreaterThan(0)
  }, 60_000)
})

describe('repair', () => {
  it('never changes the region of a cell in the intended solution', () => {
    for (let i = 0; i < 25; i++) {
      const n = 9
      const { grid, solution } = snakeLayout(n)
      if (!regionsAreValid(grid, n)) continue

      // Region of each queen cell before repair.
      const before = solution.map((c, r) => grid[r][c])
      const result = repair(grid, n, solution)
      if (!result) continue

      const after = solution.map((c, r) => result.grid[r][c])
      expect(after).toEqual(before)
    }
  })

  it('leaves exactly one solution when it succeeds', () => {
    let checked = 0
    for (let i = 0; i < 40 && checked < 8; i++) {
      const n = 9
      const { grid, solution } = snakeLayout(n)
      if (!regionsAreValid(grid, n)) continue
      const result = repair(grid, n, solution)
      if (!result) continue
      checked++
      const sols = findSolutions(result.grid, n, 2)
      expect(sols).toHaveLength(1)
      expect(sols[0]).toEqual(solution)
    }
    expect(checked).toBeGreaterThan(0)
  })
})

describe('primitives', () => {
  it('randomQueens returns a legal layout', () => {
    for (const n of SIZES) {
      const queens = randomQueens(n)
      expect(queens).toHaveLength(n)
      const cols = queens.map(([, c]) => c)
      expect(new Set(cols).size).toBe(n)
      expect(queens.map(([r]) => r)).toEqual([...Array(n).keys()])
      for (let r = 1; r < n; r++) expect(Math.abs(cols[r] - cols[r - 1])).toBeGreaterThan(1)
    }
  })

  it('connectedWithout spots a cell whose removal splits a region', () => {
    // Region 0 is a 1-wide bridge; removing its middle cell splits it.
    const g = [
      [0, 1, 1],
      [0, 1, 1],
      [0, 2, 2],
    ]
    expect(connectedWithout(g, 3, 0, [-1, -1])).toBe(true)
    expect(connectedWithout(g, 3, 0, [1, 0])).toBe(false)
    expect(connectedWithout(g, 3, 0, [0, 0])).toBe(true)
  })

  it('findSolutions stops at the limit', () => {
    // One region per row: many solutions.
    const g = Array.from({ length: 6 }, (_, r) => new Array(6).fill(r))
    expect(findSolutions(g, 6, 2)).toHaveLength(2)
    expect(findSolutions(g, 6, 5)).toHaveLength(5)
  })

  it('regionsAreValid rejects a single-cell region', () => {
    // Region 2 has one cell; a region must have room for a queen plus slack.
    const g = [
      [0, 0, 1],
      [0, 1, 1],
      [0, 1, 2],
    ]
    expect(regionsAreValid(g, 3)).toBe(false)
  })

  it('isSymmetric spots a 180-degree rotation', () => {
    expect(isSymmetric([[0, 1], [1, 0]], 2)).toBe(true)
    expect(isSymmetric([[0, 0], [1, 1]], 2)).toBe(false)
  })
})
