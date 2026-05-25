import { describe, it, expect } from 'vitest'
import { hasUniqueSolution } from '../validator'

const cfg = (size: number) => ({ size, starsPerUnit: 1 })

describe('hasUniqueSolution', () => {
  it('returns true for a trivial 1×1 puzzle', () => {
    // Only one cell, one region, one valid placement
    expect(hasUniqueSolution([[0]], cfg(1))).toBe(true)
  })

  it('returns false for a 2×2 puzzle (no valid placement exists)', () => {
    // Any two queens in a 2×2 grid are adjacent — solutionCount stays 0
    const regions = [
      [0, 1],
      [0, 1],
    ]
    expect(hasUniqueSolution(regions, cfg(2))).toBe(false)
  })

  it('returns false when multiple solutions exist', () => {
    // Column-stripe regions on 4×4: exactly two valid queen placements exist
    // [1,3,0,2] and [2,0,3,1] both satisfy all constraints
    const regions = [
      [0, 1, 2, 3],
      [0, 1, 2, 3],
      [0, 1, 2, 3],
      [0, 1, 2, 3],
    ]
    expect(hasUniqueSolution(regions, cfg(4))).toBe(false)
  })

  it('returns false when all cells are the same region (no solution)', () => {
    // 4 queens needed but only 1 region — impossible
    const regions = [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]
    expect(hasUniqueSolution(regions, cfg(4))).toBe(false)
  })

  it('returns false when region count < N (not enough regions for N queens)', () => {
    // Only 2 regions for a 4×4 — can't place 4 queens one-per-region
    const regions = [
      [0, 0, 1, 1],
      [0, 0, 1, 1],
      [0, 0, 1, 1],
      [0, 0, 1, 1],
    ]
    expect(hasUniqueSolution(regions, cfg(4))).toBe(false)
  })

  it('stops counting after finding a second solution (does not enumerate all)', () => {
    // Same multi-solution grid — just verifying it returns quickly and correctly
    const regions = [
      [0, 1, 2, 3],
      [0, 1, 2, 3],
      [0, 1, 2, 3],
      [0, 1, 2, 3],
    ]
    const start = Date.now()
    const result = hasUniqueSolution(regions, cfg(4))
    expect(result).toBe(false)
    expect(Date.now() - start).toBeLessThan(100)
  })
})
