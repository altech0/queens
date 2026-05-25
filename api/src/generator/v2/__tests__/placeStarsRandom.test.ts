import { describe, it, expect } from 'vitest'
import { placeStarsRandom } from '../index'

const cfg = (size: number, stars = 1) => ({ size, starsPerUnit: stars })

describe('placeStarsRandom', () => {
  for (const size of [5, 6, 8, 10]) {
    describe(`k=1, size=${size}`, () => {
      it('returns exactly 1 star per row', () => {
        const sol = placeStarsRandom(cfg(size, 1))
        expect(sol).not.toBeNull()
        expect(sol!.length).toBe(size)
        sol!.forEach(row => expect(row.length).toBe(1))
      })

      it('has exactly 1 star per column', () => {
        const sol = placeStarsRandom(cfg(size, 1))!
        const colCount = new Array(size).fill(0)
        sol.forEach(([c]) => colCount[c]++)
        colCount.forEach(count => expect(count).toBe(1))
      })

      it('has no two adjacent stars (kings-move)', () => {
        const sol = placeStarsRandom(cfg(size, 1))!
        for (let r1 = 0; r1 < sol.length; r1++) {
          for (let r2 = r1 + 1; r2 < sol.length; r2++) {
            const c1 = sol[r1][0], c2 = sol[r2][0]
            if (Math.abs(r1 - r2) <= 1) {
              expect(Math.abs(c1 - c2)).toBeGreaterThan(1)
            }
          }
        }
      })
    })
  }

  for (const size of [8, 10]) {
    describe(`k=2, size=${size}`, () => {
      it('returns exactly 2 stars per row', () => {
        const sol = placeStarsRandom(cfg(size, 2))
        expect(sol).not.toBeNull()
        sol!.forEach(row => expect(row.length).toBe(2))
      })

      it('has exactly 2 stars per column', () => {
        const sol = placeStarsRandom(cfg(size, 2))!
        const colCount = new Array(size).fill(0)
        sol.forEach(([c1, c2]) => { colCount[c1]++; colCount[c2]++ })
        colCount.forEach(count => expect(count).toBe(2))
      })

      it('has no two adjacent stars (kings-move)', () => {
        const sol = placeStarsRandom(cfg(size, 2))!
        const allStars: [number, number][] = sol.flatMap((cols, r) => cols.map(c => [r, c] as [number, number]))
        for (let i = 0; i < allStars.length; i++) {
          for (let j = i + 1; j < allStars.length; j++) {
            const [r1, c1] = allStars[i], [r2, c2] = allStars[j]
            expect(Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1).toBe(false)
          }
        }
      })
    })
  }

  it('returns different placements on repeated calls', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 20; i++) {
      const sol = placeStarsRandom(cfg(8, 1))
      if (sol) seen.add(JSON.stringify(sol))
    }
    expect(seen.size).toBeGreaterThan(1)
  })
})
