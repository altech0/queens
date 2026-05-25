import { describe, it, expect } from 'vitest'
import { buildRegionsV2 } from '../regionBuilder'

// Tests focused on the tighter size constraints introduced in v2 (maxRegionSize = floor(N * 1.5))

const cfg = (size: number, stars = 1) => ({ size, starsPerUnit: stars })

function collectRegions(grid: number[][], size: number): Map<number, [number, number][]> {
  const map = new Map<number, [number, number][]>()
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const id = grid[r][c]
      if (!map.has(id)) map.set(id, [])
      map.get(id)!.push([r, c])
    }
  }
  return map
}

for (const size of [6, 8, 10]) {
  describe(`buildRegionsV2 size constraints, size=${size}`, () => {
    function getGrid(stars = 1) {
      // Retry to avoid flakiness from legitimate null returns
      for (let i = 0; i < 20; i++) {
        const g = buildRegionsV2(cfg(size, stars))
        if (g) return g
      }
      return null
    }

    it('returns a non-null grid within 20 attempts', () => {
      expect(getGrid()).not.toBeNull()
    })

    it('no region exceeds 1.5× average size', () => {
      const grid = getGrid()!
      const regions = collectRegions(grid, size)
      const maxAllowed = Math.floor(size * 1.5)
      for (const cells of regions.values()) {
        expect(cells.length).toBeLessThanOrEqual(maxAllowed)
      }
    })

    it('all regions have at least 2 cells (stars=1)', () => {
      const grid = getGrid(1)!
      const regions = collectRegions(grid, size)
      for (const cells of regions.values()) {
        expect(cells.length).toBeGreaterThanOrEqual(2)
      }
    })

    it('produces exactly gridSize distinct regions', () => {
      const grid = getGrid()!
      const ids = new Set(grid.flat())
      expect(ids.size).toBe(size)
    })
  })
}
