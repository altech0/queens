import { describe, it, expect } from 'vitest'
import { classifyDifficulty } from '../solver.js'

/**
 * `classifyDifficulty` uses two scales either side of n = 9 (see its doc
 * comment). These pin both, and in particular that a 9×9 uses the
 * fraction-based branch — it used to fall through to the tier-based one, where
 * `fullSolved` is never consulted and so nothing could ever be `very_hard`.
 */

/** A real unique 9×9, found by the capped-Voronoi generator. Fully teachable-solvable. */
const NINE_EASY = [
  [1, 1, 3, 3, 3, 3, 7, 7, 7],
  [1, 1, 3, 3, 3, 3, 3, 7, 7],
  [1, 1, 0, 3, 3, 3, 3, 7, 7],
  [1, 0, 0, 0, 3, 3, 3, 4, 7],
  [0, 0, 0, 0, 0, 0, 4, 4, 4],
  [2, 0, 0, 0, 0, 4, 4, 4, 4],
  [2, 2, 0, 5, 5, 4, 4, 4, 4],
  [2, 8, 5, 5, 5, 6, 4, 4, 4],
  [8, 8, 8, 5, 6, 6, 6, 4, 4],
]

/** A real 8×8 that stalls the teachable solver at tier 3. */
const EIGHT_HARD = [
  [0, 0, 1, 1, 1, 2, 2, 2],
  [0, 0, 1, 1, 1, 2, 2, 2],
  [0, 0, 3, 3, 3, 2, 2, 2],
  [0, 4, 3, 3, 3, 5, 5, 5],
  [4, 4, 4, 3, 3, 5, 5, 5],
  [4, 4, 6, 6, 6, 5, 5, 7],
  [4, 6, 6, 6, 6, 7, 7, 7],
  [6, 6, 6, 7, 7, 7, 7, 7],
]

/** One region per row — the full solver cannot pin any cell. */
const rowsAsRegions = (n: number) => Array.from({ length: n }, (_, r) => Array(n).fill(r))

describe('classifyDifficulty — n >= 9 uses the fraction scale', () => {
  it('scores a fully teachable 9×9 as easy, with a percentage score', () => {
    const { difficulty, difficulty_score } = classifyDifficulty(NINE_EASY, 9, 1)
    expect(difficulty).toBe('easy')
    expect(difficulty_score).toBe(100)
  })

  it('marks a 9×9 the full solver cannot finish as very_hard', () => {
    // The regression this guards: on the tier scale this returned 'hard'.
    expect(classifyDifficulty(rowsAsRegions(9), 9, 1)).toEqual({
      difficulty: 'very_hard',
      difficulty_score: -1,
    })
  })

  it('still marks an unsolvable 10×10 as very_hard', () => {
    expect(classifyDifficulty(rowsAsRegions(10), 10, 2)).toEqual({
      difficulty: 'very_hard',
      difficulty_score: -1,
    })
  })
})

describe('classifyDifficulty — n <= 8 keeps the tier scale', () => {
  it('scores an 8×8 by technique tier, not percentage', () => {
    const { difficulty, difficulty_score } = classifyDifficulty(EIGHT_HARD, 8, 1)
    expect(difficulty).toBe('hard')
    // A tier (0–4), not a percentage — the two scales must not be conflated.
    expect(difficulty_score).toBeLessThanOrEqual(4)
  })

  it('never returns very_hard for a small board', () => {
    for (const n of [5, 6, 8]) {
      expect(classifyDifficulty(rowsAsRegions(n), n, 1).difficulty).not.toBe('very_hard')
    }
  })
})
