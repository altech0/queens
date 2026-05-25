import { describe, it } from 'vitest'
import { generatePuzzle } from '../index'

describe('generatePuzzle timing', () => {
  for (const size of [4, 5, 6, 7, 8, 9, 10]) {
    it(`size ${size}`, () => {
      const times: number[] = []
      for (let i = 0; i < 20; i++) {
        const start = performance.now()
        generatePuzzle({ size, starsPerUnit: 1 })
        times.push(performance.now() - start)
      }
      const avg = times.reduce((a, b) => a + b, 0) / times.length
      const max = Math.max(...times)
      console.log(`size ${size}: avg ${avg.toFixed(1)}ms, max ${max.toFixed(1)}ms`)
    })
  }
})
