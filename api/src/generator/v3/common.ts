/**
 * Shared primitives for the v3 generators (Winding, Tangled).
 *
 * The v2 pipeline grows every region in lockstep from random seeds, which can
 * only make round, similar-sized blobs. v3 instead places the queens first and
 * grows regions around them, so every layout is solvable by construction, and
 * lets some regions grow as 1-wide corridors — the shape that makes a board
 * genuinely hard. See docs/puzzle-engine/PUZZLE_ENGINES_PLAN.md §3.
 *
 * 1-star only: a queen layout is one cell per row, so a solution is an array of
 * column indices. The 2-star 10x10 boards stay on v2.
 */

export type Grid = number[][]
export type Cell = [number, number]

const rnd = (n: number) => Math.floor(Math.random() * n)

export function shuffle<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = rnd(i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** The up-to-four orthogonal neighbours of a cell, inside the grid. */
export function nb4(r: number, c: number, n: number): Cell[] {
  const out: Cell[] = []
  if (r > 0) out.push([r - 1, c])
  if (r < n - 1) out.push([r + 1, c])
  if (c > 0) out.push([r, c - 1])
  if (c < n - 1) out.push([r, c + 1])
  return out
}

export const emptyGrid = (n: number): Grid =>
  Array.from({ length: n }, () => new Array(n).fill(-1))

export function regionSizes(g: Grid, n: number): number[] {
  const sizes = new Array(n).fill(0)
  for (const row of g) for (const v of row) if (v >= 0) sizes[v]++
  return sizes
}

/** 180° rotational symmetry reads as a "designed" board and is rejected, as in v2. */
export const isSymmetric = (g: Grid, n: number): boolean =>
  g.every((row, r) => row.every((v, c) => v === g[n - 1 - r][n - 1 - c]))

/**
 * Solutions as column-per-row, stopping at `limit`.
 *
 * Row-by-row backtracking that abandons the search as soon as `limit` is hit,
 * which is much cheaper than solving fully and counting: uniqueness only needs
 * to know whether a second solution exists.
 */
export function findSolutions(g: Grid, n: number, limit = 2): number[][] {
  const out: number[][] = []
  const colUsed = new Array(n).fill(false)
  const regionUsed = new Array(n).fill(false)
  const current: number[] = []

  const go = (r: number) => {
    if (out.length >= limit) return
    if (r === n) { out.push([...current]); return }
    for (let c = 0; c < n; c++) {
      if (colUsed[c] || regionUsed[g[r][c]]) continue
      if (r > 0 && Math.abs(current[r - 1] - c) <= 1) continue  // no diagonal touching
      colUsed[c] = regionUsed[g[r][c]] = true
      current.push(c)
      go(r + 1)
      colUsed[c] = regionUsed[g[r][c]] = false
      current.pop()
    }
  }
  go(0)
  return out
}

/** A random valid queen layout: one per row and column, none touching. */
export function randomQueens(n: number): Cell[] {
  const cols: number[] = []
  const used = new Array(n).fill(false)
  const go = (r: number): boolean => {
    if (r === n) return true
    for (const c of shuffle([...Array(n).keys()])) {
      if (used[c] || (r > 0 && Math.abs(cols[r - 1] - c) <= 1)) continue
      used[c] = true
      cols.push(c)
      if (go(r + 1)) return true
      used[c] = false
      cols.pop()
    }
    return false
  }
  go(0)
  return cols.map((c, r) => [r, c] as Cell)
}

/** Whether region `id` stays connected if `skip` were removed from it. */
export function connectedWithout(g: Grid, n: number, id: number, skip: Cell): boolean {
  const cells: Cell[] = []
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (g[r][c] === id && !(r === skip[0] && c === skip[1])) cells.push([r, c])
    }
  }
  if (!cells.length) return false

  const seen = new Set([cells[0].join()])
  const stack: Cell[] = [cells[0]]
  while (stack.length) {
    const [r, c] = stack.pop()!
    for (const [a, b] of nb4(r, c, n)) {
      const key = a + ',' + b
      if (g[a][b] === id && !(a === skip[0] && b === skip[1]) && !seen.has(key)) {
        seen.add(key)
        stack.push([a, b])
      }
    }
  }
  return seen.size === cells.length
}

/**
 * Grows region `id` from `start` as a 1-wide random walk, biased to keep going
 * straight so it reads as a corridor rather than a scribble. Stops early if it
 * paints itself into a corner.
 *
 * A candidate cell is only taken if it touches no cell of this region other than
 * the one we came from — that is what keeps the corridor exactly one cell wide.
 */
export function snake(g: Grid, n: number, id: number, start: Cell, len: number): void {
  let [r, c] = start
  const dirs: Cell[] = [[1, 0], [-1, 0], [0, 1], [0, -1]]
  let dir = dirs[rnd(4)]

  for (let i = 0; i < len; i++) {
    // Prefer carrying straight on; occasionally take a genuinely random turn.
    const ordered = shuffle([...dirs]).sort((a, b) => (a === dir ? -1 : 0) - (b === dir ? -1 : 0))
    const options = Math.random() < 0.75 ? ordered : shuffle(ordered)

    let moved = false
    for (const d of options) {
      const a = r + d[0], b = c + d[1]
      if (a < 0 || b < 0 || a >= n || b >= n || g[a][b] !== -1) continue
      const touching = nb4(a, b, n).filter(([x, y]) => g[x][y] === id && !(x === r && y === c))
      if (touching.length) continue
      g[a][b] = id
      r = a; c = b; dir = d
      moved = true
      break
    }
    if (!moved) return
  }
}

/**
 * Fills every remaining cell, one at a time, each claimed by a weighted random
 * region chosen from those adjacent to it. Growing one cell at a time (rather
 * than in lockstep like v2) is what produces uneven, interlocking shapes.
 *
 * `frozen` regions — the snakes — are skipped so they stay 1-wide, unless a
 * pocket is enclosed such that only a frozen region can reach it. `cap` is a
 * soft ceiling on region size, ignored under the same circumstances.
 */
export function eden(
  g: Grid,
  n: number,
  weights: number[],
  frozen: Set<number> = new Set(),
  cap = Infinity,
): void {
  for (;;) {
    const sizes = regionSizes(g, n)
    const candidates = new Map<number, Cell[]>()
    let anyEmpty = false

    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (g[r][c] !== -1) continue
        anyEmpty = true
        for (const [a, b] of nb4(r, c, n)) {
          const id = g[a][b]
          if (id < 0) continue
          if (!candidates.has(id)) candidates.set(id, [])
          candidates.get(id)!.push([r, c])
        }
      }
    }
    if (!anyEmpty) return

    let ids = [...candidates.keys()].filter(id => !frozen.has(id) && sizes[id] < cap)
    if (!ids.length) ids = [...candidates.keys()]  // enclosed pocket: let anyone fill it
    if (!ids.length) return                        // unreachable empty cell; caller rejects

    const total = ids.reduce((s, id) => s + weights[id], 0)
    let x = Math.random() * total
    let pick = ids[0]
    for (const id of ids) {
      x -= weights[id]
      if (x <= 0) { pick = id; break }
    }

    const cells = candidates.get(pick)!
    const [r, c] = cells[rnd(cells.length)]
    g[r][c] = pick
  }
}

/**
 * Exponential weights, so region sizes come out varied rather than uniform:
 * a few regions win often and grow large, most stay small.
 */
export const expWeights = (n: number): number[] =>
  Array.from({ length: n }, () => -Math.log(1 - Math.random()))

/**
 * Removes every solution but the intended one, `S`.
 *
 * If a rival solution T exists, one of T's queen cells that is *not* in S is
 * moved into a neighbouring region. This cannot break S — no cell of S changes
 * region, so S still has exactly one queen per region — and it must break T,
 * which needed that cell to belong to the region it was taken from.
 *
 * Moves that would disconnect a region or shrink it below two cells are skipped.
 * Returns null if no legal move exists, or if it fails to converge.
 */
export function repair(g: Grid, n: number, S: number[], maxIter = 60): { grid: Grid; steps: number } | null {
  for (let step = 0; step < maxIter; step++) {
    const sols = findSolutions(g, n, 2)
    if (sols.length === 0) return null          // over-constrained; caller retries
    if (sols.length === 1) return { grid: g, steps: step }

    const rival = sols.find(s => s.some((c, r) => c !== S[r]))
    if (!rival) return null                     // both solutions are S: cannot happen

    const movable = shuffle(
      rival.map((c, r) => [r, c] as Cell).filter(([r, c]) => S[r] !== c)
    )

    let moved = false
    for (const [r, c] of movable) {
      const from = g[r][c]
      if (regionSizes(g, n)[from] <= 2) continue
      if (!connectedWithout(g, n, from, [r, c])) continue
      const others = [...new Set(nb4(r, c, n).map(([a, b]) => g[a][b]).filter(x => x !== from))]
      if (!others.length) continue
      g[r][c] = others[rnd(others.length)]
      moved = true
      break
    }
    if (!moved) return null
  }
  return null
}

/** Exactly n regions, every one at least two cells, contiguous, no cell unclaimed. */
export function regionsAreValid(g: Grid, n: number): boolean {
  if (g.some(row => row.some(v => v < 0 || v >= n))) return false
  const sizes = regionSizes(g, n)
  if (sizes.some(s => s < 2)) return false
  // A skip outside the grid makes this a plain connectivity check.
  return Array.from({ length: n }, (_, id) => id).every(id => connectedWithout(g, n, id, [-1, -1]))
}

/** Cells sitting in a 1-wide corridor — the shape v2 could not produce. */
export function corridorCells(g: Grid, n: number): number {
  const same = (r: number, c: number, id: number) =>
    r >= 0 && c >= 0 && r < n && c < n && g[r][c] === id
  let count = 0
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const id = g[r][c]
      const up = same(r - 1, c, id), down = same(r + 1, c, id)
      const left = same(r, c - 1, id), right = same(r, c + 1, id)
      if (up && down && !left && !right) count++
      else if (left && right && !up && !down) count++
    }
  }
  return count
}

/** Column-per-row solution → the `solution[row] = [col]` shape the API stores. */
export const toSolutionRows = (S: number[]): number[][] => S.map(c => [c])
