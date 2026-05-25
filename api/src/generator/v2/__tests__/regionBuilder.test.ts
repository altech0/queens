import { describe, it, expect } from 'vitest'
import { buildRegionsV2 } from '../regionBuilder'

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

function isContiguous(cells: [number, number][], size: number): boolean {
  if (cells.length <= 1) return true
  const set = new Set(cells.map(([r, c]) => r * size + c))
  const visited = new Set<number>()
  const queue: [number, number][] = [cells[0]]
  visited.add(cells[0][0] * size + cells[0][1])
  while (queue.length > 0) {
    const [r, c] = queue.pop()!
    for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const nr = r + dr, nc = c + dc
      const key = nr * size + nc
      if (set.has(key) && !visited.has(key)) {
        visited.add(key)
        queue.push([nr, nc])
      }
    }
  }
  return visited.size === cells.length
}

function buildUntilSuccess(size: number, stars = 1): number[][] {
  for (let i = 0; i < 200; i++) {
    const grid = buildRegionsV2(cfg(size, stars))
    if (grid) return grid
  }
  throw new Error(`buildRegionsV2 returned null 200 times for size=${size}`)
}

describe('buildRegionsV2', () => {
  for (const size of [6, 8, 10]) {
    describe(`size ${size}`, () => {
      it('returns an N×N grid with exactly N distinct region IDs', () => {
        const grid = buildUntilSuccess(size)
        expect(grid.length).toBe(size)
        grid.forEach(row => expect(row.length).toBe(size))
        const ids = new Set(grid.flat())
        expect(ids.size).toBe(size)
        expect([...ids].every(id => id >= 0 && id < size)).toBe(true)
      })

      it('covers every cell (no unclaimed cells)', () => {
        const grid = buildUntilSuccess(size)
        expect(grid.flat().every(v => v >= 0)).toBe(true)
      })

      it('all regions are contiguous', () => {
        const grid = buildUntilSuccess(size)
        const regions = collectRegions(grid, size)
        for (const cells of regions.values()) {
          expect(isContiguous(cells, size)).toBe(true)
        }
      })

      it('no region below minimum size (1-star: ≥ 2)', () => {
        const grid = buildUntilSuccess(size, 1)
        const regions = collectRegions(grid, size)
        for (const cells of regions.values()) {
          expect(cells.length).toBeGreaterThanOrEqual(2)
        }
      })

      it('at most 2 regions at minimum size (size 2 for 1-star)', () => {
        for (let i = 0; i < 5; i++) {
          const grid = buildRegionsV2(cfg(size, 1))
          if (!grid) continue
          const regions = collectRegions(grid, size)
          const small = [...regions.values()].filter(cells => cells.length <= 2).length
          expect(small).toBeLessThanOrEqual(2)
        }
      })

      it('no mega-region exceeding 2× average size', () => {
        const grid = buildUntilSuccess(size)
        const regions = collectRegions(grid, size)
        const maxAllowed = 2 * size
        for (const cells of regions.values()) {
          expect(cells.length).toBeLessThanOrEqual(maxAllowed)
        }
      })
    })
  }

  it('returns different layouts across runs (randomness)', () => {
    const layouts = new Set<string>()
    for (let i = 0; i < 10; i++) {
      const grid = buildRegionsV2(cfg(8))
      if (grid) layouts.add(JSON.stringify(grid))
    }
    expect(layouts.size).toBeGreaterThan(1)
  })
})
