import { describe, it, expect } from 'vitest'
import { buildRegions } from '../regionBuilder'
import { placeQueens } from '../queensSolver'

const cfg = (size: number) => ({ size, starsPerUnit: 1 })

describe('buildRegions', () => {
  it('returns an N×N grid', () => {
    const size = 6
    const sol = placeQueens(cfg(size))!
    const regions = buildRegions(cfg(size), sol)
    expect(regions).not.toBeNull()
    expect(regions!.length).toBe(size)
    regions!.forEach(row => expect(row.length).toBe(size))
  })

  it('produces exactly N distinct region IDs', () => {
    const size = 6
    const sol = placeQueens(cfg(size))!
    const regions = buildRegions(cfg(size), sol)!
    const ids = new Set(regions.flat())
    expect(ids.size).toBe(size)
  })

  it('region IDs are in range [0, N-1]', () => {
    const size = 6
    const sol = placeQueens(cfg(size))!
    const regions = buildRegions(cfg(size), sol)!
    regions.flat().forEach(id => {
      expect(id).toBeGreaterThanOrEqual(0)
      expect(id).toBeLessThan(size)
    })
  })

  it('queen in row r is in region r (remap invariant)', () => {
    const size = 6
    const sol = placeQueens(cfg(size))!
    const regions = buildRegions(cfg(size), sol)!
    for (let r = 0; r < size; r++) {
      expect(regions[r][sol[r]]).toBe(r)
    }
  })

  it('remap invariant holds across multiple sizes', () => {
    for (const size of [4, 5, 6, 7, 8]) {
      const sol = placeQueens(cfg(size))!
      if (!sol) continue
      const regions = buildRegions(cfg(size), sol)!
      if (!regions) continue
      for (let r = 0; r < size; r++) {
        expect(regions[r][sol[r]]).toBe(r)
      }
    }
  })

  it('each region covers at least one cell', () => {
    const size = 6
    const sol = placeQueens(cfg(size))!
    const regions = buildRegions(cfg(size), sol)!
    const counts = new Array(size).fill(0)
    regions.flat().forEach(id => counts[id]++)
    counts.forEach(count => expect(count).toBeGreaterThan(0))
  })

  it('region sizes sum to N*N', () => {
    const size = 6
    const sol = placeQueens(cfg(size))!
    const regions = buildRegions(cfg(size), sol)!
    expect(regions.flat().length).toBe(size * size)
  })

  it('returns different region shapes across runs (randomness)', () => {
    const size = 8
    const results = new Set<string>()
    for (let i = 0; i < 10; i++) {
      const sol = placeQueens(cfg(size))!
      if (!sol) continue
      const regions = buildRegions(cfg(size), sol)
      if (regions) results.add(JSON.stringify(regions))
    }
    expect(results.size).toBeGreaterThan(1)
  })
})
