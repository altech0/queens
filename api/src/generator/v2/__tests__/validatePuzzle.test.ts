import { describe, it, expect } from 'vitest'
import { validatePuzzle } from '../validatePuzzle'

// Valid 5×5 puzzle (stars=1)
// Regions:
//   0 0 0 0 0
//   1 1 1 0 0
//   2 2 1 3 3
//   2 4 4 3 3
//   4 4 4 4 3
// Solution: row 0→col 4, row 1→col 2, row 2→col 0, row 3→col 3, row 4→col 1
// Each region contains exactly one star; no two stars are kings-move adjacent.
const VALID_REGIONS: number[][] = [
  [0, 0, 0, 0, 0],
  [1, 1, 1, 0, 0],
  [2, 2, 1, 3, 3],
  [2, 4, 4, 3, 3],
  [4, 4, 4, 4, 3],
]
const VALID_SOLUTION: number[][] = [[4], [2], [0], [3], [1]]

describe('validatePuzzle', () => {
  it('passes a known-good 5×5 puzzle', () => {
    const result = validatePuzzle(5, 1, VALID_REGIONS, VALID_SOLUTION)
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('fails when a column has 0 stars', () => {
    // move row 0 star from col 4 to col 2 (duplicates col 2, col 4 empty)
    const badSol = [[2], [2], [0], [3], [1]]
    const result = validatePuzzle(5, 1, VALID_REGIONS, badSol)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('Column'))).toBe(true)
  })

  it('fails when two stars are diagonally adjacent', () => {
    // (0,3) and (1,2) are diagonally adjacent
    const badSol = [[3], [2], [0], [4], [1]]
    const result = validatePuzzle(5, 1, VALID_REGIONS, badSol)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('adjacent'))).toBe(true)
  })

  it('fails when a region has 0 stars', () => {
    // solution that covers region 0 twice, skips region 3
    // (0,3)→region 0, (1,2)→region 1, (2,0)→region 2, (3,4)→region 3... wait need to skip 3
    // put 2 stars in region 0: (0,4)→0 and (2,3)→3 → actually swap rows
    // simpler: just put both (0,4) and (1,0) in region 0 — regions[1][0]=1 so that won't work
    // Use a solution that hits region 0 twice: cols 4 and 3 are both region 0
    const badSol = [[4], [3], [0], [2], [1]] // (1,3)→regions[1][3]=0 duplicates (0,4)→0
    const result = validatePuzzle(5, 1, VALID_REGIONS, badSol)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('Region') && e.includes('stars'))).toBe(true)
  })

  it('fails when regions grid has wrong dimensions', () => {
    const badRegions = VALID_REGIONS.slice(0, 4) // only 4 rows
    const result = validatePuzzle(5, 1, badRegions, VALID_SOLUTION)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('rows'))).toBe(true)
  })

  it('fails when solution coords do not match grid size', () => {
    const badSol = [[1], [3], [0], [4], [5]] // col 5 out of range for 5×5
    const result = validatePuzzle(5, 1, VALID_REGIONS, badSol)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('out of range'))).toBe(true)
  })

  it('fails when regions are not contiguous', () => {
    // split region 0 by punching a hole at (0,2) and (0,3), isolating (0,0)+(0,1) from (0,4)+(1,3)+(1,4)
    const badRegions = VALID_REGIONS.map(row => [...row])
    badRegions[0][2] = 4
    badRegions[0][3] = 4
    const result = validatePuzzle(5, 1, badRegions, VALID_SOLUTION)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('contiguous'))).toBe(true)
  })
})
