import { describe, it, expect } from 'vitest'
import { placeQueens } from '../queensSolver'

const cfg = (size: number) => ({ size, starsPerUnit: 1 })

function isValidPlacement(solution: number[], size: number): boolean {
  if (solution.length !== size) return false
  // Unique columns
  if (new Set(solution).size !== size) return false
  // No two queens touch (kings-move adjacency)
  for (let r1 = 0; r1 < size; r1++) {
    for (let r2 = r1 + 1; r2 < size; r2++) {
      if (Math.abs(r1 - r2) <= 1 && Math.abs(solution[r1] - solution[r2]) <= 1) return false
    }
  }
  return true
}

describe('placeQueens', () => {
  it('returns [0] for size 1', () => {
    expect(placeQueens(cfg(1))).toEqual([0])
  })

  it('returns null for size 2 (no valid placement exists)', () => {
    expect(placeQueens(cfg(2))).toBeNull()
  })

  it('returns null for size 3 (no valid placement exists)', () => {
    expect(placeQueens(cfg(3))).toBeNull()
  })

  it('returns a valid placement for size 4', () => {
    const sol = placeQueens(cfg(4))
    expect(sol).not.toBeNull()
    expect(isValidPlacement(sol!, 4)).toBe(true)
  })

  it('returns a valid placement for size 6', () => {
    const sol = placeQueens(cfg(6))
    expect(sol).not.toBeNull()
    expect(isValidPlacement(sol!, 6)).toBe(true)
  })

  it('returns a valid placement for size 8', () => {
    const sol = placeQueens(cfg(8))
    expect(sol).not.toBeNull()
    expect(isValidPlacement(sol!, 8)).toBe(true)
  })

  it('returns a valid placement for size 10', () => {
    const sol = placeQueens(cfg(10))
    expect(sol).not.toBeNull()
    expect(isValidPlacement(sol!, 10)).toBe(true)
  })

  it('returns different placements across runs (randomness)', () => {
    const results = new Set<string>()
    for (let i = 0; i < 20; i++) {
      const sol = placeQueens(cfg(8))
      if (sol) results.add(JSON.stringify(sol))
    }
    expect(results.size).toBeGreaterThan(1)
  })
})
