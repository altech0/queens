import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { solve, nextMove, isComplete, type Board, type Cell, type SolverPuzzle } from '../solver.js'

const here = dirname(fileURLToPath(import.meta.url))

// The Swift test target ships the cross-language reference fixture; both the
// Swift and TypeScript solvers are ports of the same starbattle-solver.js, so
// they must agree cell-for-cell on every case.
const REFERENCE_PATH = resolve(here, '../../../../app/queensTests/solver-reference.json')

interface ExpectedResult {
  solved: boolean
  steps: number
  maxTier: number
  board: string
}
interface ReferenceCase {
  n: number
  stars: number
  regions: number[][]
  full: ExpectedResult
  teachable: ExpectedResult
}

const reference: { count: number; cases: ReferenceCase[] } = JSON.parse(
  readFileSync(REFERENCE_PATH, 'utf8'),
)

/** Fixture boards are "/"-joined rows of `*` (star), `x` (cross), `.` (unknown). */
function encodeBoard(board: Board): string {
  return board.map(row => row.map(cellChar).join('')).join('/')
}
function cellChar(c: Cell): string {
  return c === 'star' ? '*' : c === 'cross' ? 'x' : '.'
}

describe('solver reference parity (Swift ↔ TypeScript)', () => {
  it('loads the full fixture', () => {
    expect(reference.cases).toHaveLength(reference.count)
    expect(reference.count).toBe(600)
  })

  /** Compares one case against the Swift-generated expectation. */
  function checkCase(tc: ReferenceCase, i: number, mode: 'full' | 'teachable'): string | null {
    const puzzle: SolverPuzzle = { n: tc.n, stars: tc.stars, regions: tc.regions }
    const expected = tc[mode]
    const got = solve(puzzle, undefined, { teachableOnly: mode === 'teachable' })
    const actual = {
      solved: isComplete(got.board, tc.n),
      steps: got.steps,
      maxTier: got.maxTier,
      board: encodeBoard(got.board),
    }
    if (
      actual.solved !== expected.solved ||
      actual.steps !== expected.steps ||
      actual.maxTier !== expected.maxTier ||
      actual.board !== expected.board
    ) {
      return (
        `case ${i} (n=${tc.n}, stars=${tc.stars}): ` +
        `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
      )
    }
    return null
  }

  // Teachable mode skips the tier-4 look-ahead, so the whole fixture is cheap.
  it(`matches the Swift solver on all ${reference.count} cases (teachable)`, () => {
    const mismatches = reference.cases
      .map((tc, i) => checkCase(tc, i, 'teachable'))
      .filter((m): m is string => m !== null)
    expect(mismatches.slice(0, 5)).toEqual([])
    expect(mismatches).toHaveLength(0)
  })

  // Full mode runs the tier-4 look-ahead, which costs seconds on some 10x10
  // boards (the whole fixture takes ~5min). CI checks a fixed, evenly-spaced
  // sample; SOLVER_FULL_SWEEP=1 runs all 600 before touching technique logic.
  const FULL_SWEEP = process.env.SOLVER_FULL_SWEEP === '1'
  const SAMPLE_STRIDE = 12
  const fullCases = FULL_SWEEP
    ? reference.cases.map((tc, i) => [tc, i] as const)
    : reference.cases
        .map((tc, i) => [tc, i] as const)
        .filter(([, i]) => i % SAMPLE_STRIDE === 0)

  it(`matches the Swift solver on ${fullCases.length} cases (full)`, () => {
    const mismatches = fullCases
      .map(([tc, i]) => checkCase(tc, i, 'full'))
      .filter((m): m is string => m !== null)
    expect(mismatches.slice(0, 5)).toEqual([])
    expect(mismatches).toHaveLength(0)
  })

  // Known-pathological boards for the tier-4 search: these two took 133s and
  // 900s when explanation strings were built eagerly. Guards the lazy `reason`
  // getter against a future change that accidentally forces it.
  it.each([74, 314])('solves pathological case %i without blowing up', i => {
    const tc = reference.cases[i]
    const t0 = Date.now()
    expect(checkCase(tc, i, 'full')).toBeNull()
    expect(Date.now() - t0).toBeLessThan(10_000)
  })
})

describe('nextMove', () => {
  const tc = reference.cases[0]
  const puzzle: SolverPuzzle = { n: tc.n, stars: tc.stars, regions: tc.regions }
  const empty = (): Board =>
    Array.from({ length: tc.n }, () => Array.from({ length: tc.n }, () => 'unknown' as Cell))

  it('returns a move carrying an explanation and a reason', () => {
    const mv = nextMove(empty(), puzzle)
    expect(mv).not.toBeNull()
    expect(mv!.explain).toBeDefined()
    expect(typeof mv!.reason).toBe('string')
    expect(mv!.reason!.length).toBeGreaterThan(0)
  })

  it('returns null once the board is solved', () => {
    const solved = solve(puzzle).board
    expect(isComplete(solved, tc.n)).toBe(true)
    expect(nextMove(solved, puzzle)).toBeNull()
  })

  it('agrees with solve(): applying nextMove repeatedly reaches the same board', () => {
    const board = empty()
    let guard = 0
    for (;;) {
      const mv = nextMove(board, puzzle, { teachableOnly: true })
      if (!mv) break
      board[mv.r][mv.c] = mv.action
      if (++guard > tc.n * tc.n + 1) throw new Error('nextMove failed to terminate')
    }
    expect(encodeBoard(board)).toBe(tc.teachable.board)
  })

  it('never exceeds tier 3 when teachableOnly is set', () => {
    const board = empty()
    for (;;) {
      const mv = nextMove(board, puzzle, { teachableOnly: true })
      if (!mv) break
      expect(mv.tier).toBeLessThanOrEqual(3)
      board[mv.r][mv.c] = mv.action
    }
  })
})

describe('explanations', () => {
  it('every move produced on a real puzzle carries a reason', () => {
    // Walk a few fixtures, asserting the explain layer never leaves a gap.
    // Kept small: each nextMove() call re-runs the tier-4 look-ahead.
    for (const tc of reference.cases.slice(0, 3)) {
      const puzzle: SolverPuzzle = { n: tc.n, stars: tc.stars, regions: tc.regions }
      const board: Board = Array.from({ length: tc.n }, () =>
        Array.from({ length: tc.n }, () => 'unknown' as Cell),
      )
      for (;;) {
        const mv = nextMove(board, puzzle)
        if (!mv) break
        expect(mv.explain, `missing explain at R${mv.r + 1}C${mv.c + 1}`).toBeDefined()
        expect(mv.reason, `missing reason at R${mv.r + 1}C${mv.c + 1}`).toBeTruthy()
        board[mv.r][mv.c] = mv.action
      }
    }
  })

  it('uses 0-indexed ids in explain but 1-indexed labels in reason text', () => {
    const tc = reference.cases[0]
    const puzzle: SolverPuzzle = { n: tc.n, stars: tc.stars, regions: tc.regions }
    const board: Board = Array.from({ length: tc.n }, () =>
      Array.from({ length: tc.n }, () => 'unknown' as Cell),
    )
    const seen = new Set<string>()
    for (;;) {
      const mv = nextMove(board, puzzle)
      if (!mv) break
      seen.add(mv.explain!.kind)
      board[mv.r][mv.c] = mv.action
    }
    // A 10x10 two-star puzzle should exercise more than one technique.
    expect(seen.size).toBeGreaterThan(1)
  })
})
