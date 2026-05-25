import { describe, it, expect } from 'vitest'
import { generatePuzzle } from '../index'
import { hasUniqueSolution } from '../validator'

const cfg = (size: number) => ({ size, starsPerUnit: 1 })

function isValidQueenPlacement(solution: number[], size: number): boolean {
  if (solution.length !== size) return false
  if (new Set(solution).size !== size) return false
  for (let r1 = 0; r1 < size; r1++) {
    for (let r2 = r1 + 1; r2 < size; r2++) {
      if (Math.abs(r1 - r2) <= 1 && Math.abs(solution[r1] - solution[r2]) <= 1) return false
    }
  }
  return true
}

function isValidRegionGrid(regions: number[][], size: number): boolean {
  if (regions.length !== size) return false
  if (regions.some(row => row.length !== size)) return false
  const ids = new Set(regions.flat())
  if (ids.size !== size) return false
  if ([...ids].some(id => id < 0 || id >= size)) return false
  return true
}

function assertPuzzleValid(size: number) {
  const result = generatePuzzle(cfg(size))
  expect(result).not.toBeNull()
  const { regions, solution } = result!

  expect(result!.size).toBe(size)
  expect(isValidQueenPlacement(solution, size)).toBe(true)
  expect(isValidRegionGrid(regions, size)).toBe(true)

  // Queen in row r is in region r
  for (let r = 0; r < size; r++) {
    expect(regions[r][solution[r]]).toBe(r)
  }

  // Puzzle has exactly one solution
  expect(hasUniqueSolution(regions, cfg(size))).toBe(true)
}

describe('generatePuzzle', () => {
  describe('always produces a valid puzzle (run 10 times each)', () => {
    for (const size of [4, 5, 6, 7, 8]) {
      it(`size ${size}`, () => {
        for (let i = 0; i < 10; i++) {
          assertPuzzleValid(size)
        }
      })
    }
  })

  it('produces a valid puzzle for size 10', () => {
    assertPuzzleValid(10)
  })

  it('result.size matches the config size', () => {
    const result = generatePuzzle(cfg(6))
    expect(result!.size).toBe(6)
  })

  it('solution has correct length', () => {
    const result = generatePuzzle(cfg(6))
    expect(result!.solution.length).toBe(6)
  })

  it('regions grid is N×N', () => {
    const size = 6
    const result = generatePuzzle(cfg(size))
    expect(result!.regions.length).toBe(size)
    result!.regions.forEach(row => expect(row.length).toBe(size))
  })

  it('never produces a symmetric puzzle', () => {
    // Run many times and verify none are 180° rotationally symmetric
    for (let i = 0; i < 20; i++) {
      const result = generatePuzzle(cfg(6))
      if (!result) continue
      const { regions, size } = result
      let symmetric = true
      outer: for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (regions[r][c] !== regions[size - 1 - r][size - 1 - c]) {
            symmetric = false
            break outer
          }
        }
      }
      expect(symmetric).toBe(false)
    }
  })

  it('produces different puzzles across runs (randomness)', () => {
    const results = new Set<string>()
    for (let i = 0; i < 10; i++) {
      const result = generatePuzzle(cfg(8))
      if (result) results.add(JSON.stringify(result.regions))
    }
    expect(results.size).toBeGreaterThan(1)
  })
})
