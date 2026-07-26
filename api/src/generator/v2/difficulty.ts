// Star Battle constraint-propagation solver + difficulty classifier.
//
// Faithful TypeScript port of scratchpad/starbattle-solver.js (the source of
// truth). All techniques are SOUND: they only assert a star/cross that is
// logically forced by the current board. Insertion-order semantics of the JS
// Map/Set are preserved via arrays and an OrderedIntSet so results match exactly.

export type Cell = 'unknown' | 'star' | 'cross'
export type Board = Cell[][]

export interface SolverPuzzle {
  n: number
  stars: number
  regions: number[][]
}

export interface SolveOptions {
  teachableOnly?: boolean
}

export interface SolveResult {
  board: Board
  steps: number
  maxTier: number
}

type GroupType = 'row' | 'column' | 'region'
interface Group {
  type: GroupType
  idx: number
  cells: [number, number][]
}
interface Context {
  n: number
  stars: number
  regions: number[][]
  groups: Group[]
  regionOrder: number[]
}
interface Move {
  r: number
  c: number
  action: 'star' | 'cross'
  tier: number
}

// Insertion-ordered set of ints (mirrors JS Set iteration order).
class OrderedIntSet {
  readonly items: number[] = []
  private present = new Set<number>()
  insert(x: number): void {
    if (!this.present.has(x)) { this.present.add(x); this.items.push(x) }
  }
  has(x: number): boolean { return this.present.has(x) }
  get size(): number { return this.items.length }
}

function neighbors8(r: number, c: number, n: number): [number, number][] {
  const out: [number, number][] = []
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue
      const rr = r + dr, cc = c + dc
      if (rr >= 0 && rr < n && cc >= 0 && cc < n) out.push([rr, cc])
    }
  return out
}

function buildGroups(n: number, regions: number[][]): { groups: Group[]; regionOrder: number[] } {
  const groups: Group[] = []
  for (let r = 0; r < n; r++) {
    const cells: [number, number][] = []
    for (let c = 0; c < n; c++) cells.push([r, c])
    groups.push({ type: 'row', idx: r, cells })
  }
  for (let c = 0; c < n; c++) {
    const cells: [number, number][] = []
    for (let r = 0; r < n; r++) cells.push([r, c])
    groups.push({ type: 'column', idx: c, cells })
  }
  const regionOrder: number[] = []
  const byReg = new Map<number, [number, number][]>()
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      const id = regions[r][c]
      if (!byReg.has(id)) { byReg.set(id, []); regionOrder.push(id) }
      byReg.get(id)!.push([r, c])
    }
  for (const id of regionOrder) groups.push({ type: 'region', idx: id, cells: byReg.get(id)! })
  return { groups, regionOrder }
}

function makeContext(puzzle: SolverPuzzle): Context {
  const { n, stars, regions } = puzzle
  const { groups, regionOrder } = buildGroups(n, regions)
  return { n, stars, regions, groups, regionOrder }
}

function groupStats(board: Board, cells: [number, number][]): { stars: number; unknown: [number, number][] } {
  let stars = 0
  const unknown: [number, number][] = []
  for (const [r, c] of cells) {
    const v = board[r][c]
    if (v === 'star') stars++
    else if (v === 'unknown') unknown.push([r, c])
  }
  return { stars, unknown }
}

function rowsOf(cells: [number, number][]): OrderedIntSet {
  const s = new OrderedIntSet(); for (const [r] of cells) s.insert(r); return s
}
function colsOf(cells: [number, number][]): OrderedIntSet {
  const s = new OrderedIntSet(); for (const [, c] of cells) s.insert(c); return s
}

function lineNeed(board: Board, ctx: Context, type: 'row' | 'column', idx: number): number {
  let s = 0
  if (type === 'row') { for (let c = 0; c < ctx.n; c++) if (board[idx][c] === 'star') s++ }
  else { for (let r = 0; r < ctx.n; r++) if (board[r][idx] === 'star') s++ }
  return ctx.stars - s
}

// ---- Techniques ----

function techAdjacency(board: Board, ctx: Context): Move[] {
  const { n } = ctx
  const moves: Move[] = []
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      if (board[r][c] !== 'star') continue
      for (const [rr, cc] of neighbors8(r, c, n))
        if (board[rr][cc] === 'unknown') moves.push({ r: rr, c: cc, action: 'cross', tier: 0 })
    }
  return moves
}

function techQuotaMet(board: Board, ctx: Context): Move[] {
  const { stars, groups } = ctx
  const moves: Move[] = []
  for (const g of groups) {
    const { stars: s, unknown } = groupStats(board, g.cells)
    if (s === stars && unknown.length)
      for (const [r, c] of unknown) moves.push({ r, c, action: 'cross', tier: 1 })
  }
  return moves
}

function techForcedFill(board: Board, ctx: Context): Move[] {
  const { stars, groups } = ctx
  const moves: Move[] = []
  for (const g of groups) {
    const { stars: s, unknown } = groupStats(board, g.cells)
    const need = stars - s
    if (need > 0 && unknown.length === need)
      for (const [r, c] of unknown) moves.push({ r, c, action: 'star', tier: 1 })
  }
  return moves
}

function techRegionConfinement(board: Board, ctx: Context): Move[] {
  const { n, regions, groups } = ctx
  const moves: Move[] = []
  for (const g of groups) {
    if (g.type !== 'region') continue
    const { stars: s, unknown } = groupStats(board, g.cells)
    const need = ctx.stars - s
    if (need <= 0 || unknown.length === 0) continue
    const rs = rowsOf(unknown)
    if (rs.size === 1) {
      const r = rs.items[0]
      if (lineNeed(board, ctx, 'row', r) === need)
        for (let c = 0; c < n; c++)
          if (board[r][c] === 'unknown' && regions[r][c] !== g.idx)
            moves.push({ r, c, action: 'cross', tier: 2 })
    }
    const cs = colsOf(unknown)
    if (cs.size === 1) {
      const c = cs.items[0]
      if (lineNeed(board, ctx, 'column', c) === need)
        for (let r = 0; r < n; r++)
          if (board[r][c] === 'unknown' && regions[r][c] !== g.idx)
            moves.push({ r, c, action: 'cross', tier: 2 })
    }
  }
  return moves
}

function techLineConfinement(board: Board, ctx: Context): Move[] {
  const { n, regions, groups } = ctx
  const moves: Move[] = []
  for (const g of groups) {
    if (g.type !== 'row' && g.type !== 'column') continue
    const { stars: s, unknown } = groupStats(board, g.cells)
    const need = ctx.stars - s
    if (need <= 0 || unknown.length === 0) continue
    const regs = new OrderedIntSet()
    for (const [r, c] of unknown) regs.insert(regions[r][c])
    if (regs.size === 1) {
      const id = regs.items[0]
      let rs = 0
      for (let r = 0; r < n; r++)
        for (let c = 0; c < n; c++)
          if (regions[r][c] === id && board[r][c] === 'star') rs++
      const regNeed = ctx.stars - rs
      if (regNeed !== need) continue
      for (let r = 0; r < n; r++)
        for (let c = 0; c < n; c++) {
          if (board[r][c] !== 'unknown' || regions[r][c] !== id) continue
          const inLine = g.type === 'row' ? r === g.idx : c === g.idx
          if (!inLine) moves.push({ r, c, action: 'cross', tier: 2 })
        }
    }
  }
  return moves
}

const MAX_SET_N = 5

function techSetCounting(board: Board, ctx: Context): Move[] {
  const { n, stars, regions } = ctx
  const moves: Move[] = []

  const regByStars = new Map<number, number>()
  const regUnknown = new Map<number, [number, number][]>()
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      const id = regions[r][c]
      if (board[r][c] === 'star') regByStars.set(id, (regByStars.get(id) ?? 0) + 1)
      else if (board[r][c] === 'unknown') {
        if (!regUnknown.has(id)) regUnknown.set(id, [])
        regUnknown.get(id)!.push([r, c])
      }
    }

  interface RegionInfo { id: number; need: number; rows: OrderedIntSet; cols: OrderedIntSet }
  const regionInfo: RegionInfo[] = []
  for (const id of ctx.regionOrder) {
    const sc = regByStars.get(id) ?? 0
    const need = stars - sc
    const unk = regUnknown.get(id) ?? []
    if (need <= 0 || unk.length === 0) continue
    regionInfo.push({ id, need, rows: rowsOf(unk), cols: colsOf(unk) })
  }

  const rowCap: number[] = [], colCap: number[] = []
  for (let i = 0; i < n; i++) {
    let rs = 0, cs = 0
    for (let j = 0; j < n; j++) { if (board[i][j] === 'star') rs++; if (board[j][i] === 'star') cs++ }
    rowCap[i] = stars - rs; colCap[i] = stars - cs
  }

  // Forms 1 & 2: N regions confined to N rows / N columns
  for (const orient of ['row', 'col'] as const) {
    const cap = orient === 'row' ? rowCap : colCap
    const cand = regionInfo.filter(ri => (orient === 'row' ? ri.rows.size : ri.cols.size) <= MAX_SET_N)
    forEachSubset(cand, 2, MAX_SET_N, subset => {
      const lines = new OrderedIntSet()
      let needSum = 0
      for (const ri of subset) {
        const items = orient === 'row' ? ri.rows.items : ri.cols.items
        for (const l of items) lines.insert(l)
        needSum += ri.need
      }
      if (lines.size !== subset.length) return
      let capSum = 0
      for (const l of lines.items) capSum += cap[l]
      if (needSum !== capSum) return
      const regIds = new OrderedIntSet()
      for (const ri of subset) regIds.insert(ri.id)
      for (const l of lines.items)
        for (let t = 0; t < n; t++) {
          const r = orient === 'row' ? l : t
          const c = orient === 'row' ? t : l
          if (board[r][c] === 'unknown' && !regIds.has(regions[r][c]))
            moves.push({ r, c, action: 'cross', tier: 3 })
        }
    })
  }

  // Forms 3 & 4: N rows / N columns confined to N regions
  for (const orient of ['row', 'col'] as const) {
    interface LineInfo { idx: number; need: number; regs: OrderedIntSet }
    const lineInfo: LineInfo[] = []
    for (let i = 0; i < n; i++) {
      const need = (orient === 'row' ? rowCap : colCap)[i]
      if (need <= 0) continue
      const unknown: [number, number][] = []
      for (let j = 0; j < n; j++) {
        const r = orient === 'row' ? i : j
        const c = orient === 'row' ? j : i
        if (board[r][c] === 'unknown') unknown.push([r, c])
      }
      if (!unknown.length) continue
      const regs = new OrderedIntSet()
      for (const [r, c] of unknown) regs.insert(regions[r][c])
      if (regs.size <= MAX_SET_N) lineInfo.push({ idx: i, need, regs })
    }
    forEachSubset(lineInfo, 2, MAX_SET_N, subset => {
      const regsUnion = new OrderedIntSet()
      let needSum = 0
      for (const li of subset) { for (const g of li.regs.items) regsUnion.insert(g); needSum += li.need }
      if (regsUnion.size !== subset.length) return
      let capSum = 0
      for (const id of regsUnion.items) capSum += stars - (regByStars.get(id) ?? 0)
      if (needSum !== capSum) return
      const lineIdxs = new OrderedIntSet()
      for (const li of subset) lineIdxs.insert(li.idx)
      for (const id of regsUnion.items)
        for (const [r, c] of (regUnknown.get(id) ?? [])) {
          const inLine = orient === 'row' ? lineIdxs.has(r) : lineIdxs.has(c)
          if (!inLine) moves.push({ r, c, action: 'cross', tier: 3 })
        }
    })
  }

  return moves
}

function forEachSubset<T>(arr: T[], minK: number, maxK: number, cb: (subset: T[]) => void): void {
  const m = arr.length
  const hi = Math.min(maxK, m)
  const idx: number[] = []
  const rec = (start: number, depth: number): void => {
    if (depth >= minK) cb(idx.map(i => arr[i]))
    if (depth === hi) return
    for (let i = start; i < m; i++) { idx.push(i); rec(i + 1, depth + 1); idx.pop() }
  }
  rec(0, 0)
}

const PAIR_MAX_CANDIDATES = 16

function techPairExclusion(board: Board, ctx: Context): Move[] {
  const { n, stars, groups } = ctx
  const moves: Move[] = []
  for (const g of groups) {
    const { stars: s, unknown } = groupStats(board, g.cells)
    const need = stars - s
    if (need < 2 || unknown.length <= need) continue
    if (unknown.length > PAIR_MAX_CANDIDATES) continue
    const cand = unknown.filter(([r, c]) => {
      for (const [rr, cc] of neighbors8(r, c, n)) if (board[rr][cc] === 'star') return false
      return true
    })
    if (cand.length < need) continue
    const m = cand.length
    const adj: number[][] = Array.from({ length: m }, () => [])
    for (let i = 0; i < m; i++)
      for (let j = i + 1; j < m; j++)
        if (Math.abs(cand[i][0] - cand[j][0]) <= 1 && Math.abs(cand[i][1] - cand[j][1]) <= 1) {
          adj[i].push(j); adj[j].push(i)
        }
    const usedCount = new Array<number>(m).fill(0)
    let placements = 0
    const chosen: number[] = []
    const blocked = new Array<number>(m).fill(0)
    let overflow = false
    const rec = (start: number, depth: number): void => {
      if (overflow) return
      if (depth === need) {
        placements++
        if (placements > 20000) { overflow = true; return }
        for (const i of chosen) usedCount[i]++
        return
      }
      for (let i = start; i < m; i++) {
        if (blocked[i]) continue
        chosen.push(i)
        for (const j of adj[i]) blocked[j]++
        rec(i + 1, depth + 1)
        for (const j of adj[i]) blocked[j]--
        chosen.pop()
      }
    }
    rec(0, 0)
    if (overflow || placements === 0) continue
    for (let i = 0; i < m; i++) {
      const [r, c] = cand[i]
      if (usedCount[i] === 0) moves.push({ r, c, action: 'cross', tier: 3 })
      else if (usedCount[i] === placements) moves.push({ r, c, action: 'star', tier: 3 })
    }
  }
  return moves
}

function techHypotheticalExclusion(board: Board, ctx: Context): Move[] {
  const { n } = ctx
  const moves: Move[] = []
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      if (board[r][c] !== 'unknown') continue
      const asStar = board.map(row => row.slice())
      asStar[r][c] = 'star'
      if (cheapPropagate(asStar, ctx)) { moves.push({ r, c, action: 'cross', tier: 4 }); continue }
      const asCross = board.map(row => row.slice())
      asCross[r][c] = 'cross'
      if (cheapPropagate(asCross, ctx)) moves.push({ r, c, action: 'star', tier: 4 })
    }
  return moves
}

// Returns true if a contradiction is detected, false at a consistent fixpoint.
function cheapPropagate(b: Board, ctx: Context): boolean {
  const { n, stars, groups } = ctx
  for (;;) {
    if (!consistent(b, ctx)) return true
    let changed = false
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++) {
        if (b[r][c] !== 'star') continue
        for (const [rr, cc] of neighbors8(r, c, n))
          if (b[rr][cc] === 'unknown') { b[rr][cc] = 'cross'; changed = true }
      }
    for (const g of groups) {
      const { stars: s, unknown } = groupStats(b, g.cells)
      if (s === stars && unknown.length) {
        for (const [r, c] of unknown) { b[r][c] = 'cross'; changed = true }
      } else {
        const need = stars - s
        if (need > 0 && unknown.length === need)
          for (const [r, c] of unknown) { b[r][c] = 'star'; changed = true }
      }
    }
    for (const mv of techRegionConfinement(b, ctx)) if (b[mv.r][mv.c] === 'unknown') { b[mv.r][mv.c] = mv.action; changed = true }
    for (const mv of techLineConfinement(b, ctx)) if (b[mv.r][mv.c] === 'unknown') { b[mv.r][mv.c] = mv.action; changed = true }
    for (const mv of techSetCounting(b, ctx)) if (b[mv.r][mv.c] === 'unknown') { b[mv.r][mv.c] = mv.action; changed = true }
    if (!changed) return !consistent(b, ctx)
  }
}

function consistent(b: Board, ctx: Context): boolean {
  const { stars, groups, n } = ctx
  for (const g of groups) {
    let s = 0
    const open: [number, number][] = []
    for (const [r, c] of g.cells) {
      const v = b[r][c]
      if (v === 'star') s++
      else if (v === 'unknown') open.push([r, c])
    }
    if (s > stars) return false
    const need = stars - s
    if (need === 0) continue
    if (open.length < need) return false
    if (maxIndependent(open, need) < need) return false
  }
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      if (b[r][c] !== 'star') continue
      for (const [rr, cc] of neighbors8(r, c, n)) if (b[rr][cc] === 'star') return false
    }
  return true
}

function maxIndependent(cells: [number, number][], cap: number): number {
  const m = cells.length
  const adj: number[][] = Array.from({ length: m }, () => [])
  for (let i = 0; i < m; i++)
    for (let j = i + 1; j < m; j++)
      if (Math.abs(cells[i][0] - cells[j][0]) <= 1 && Math.abs(cells[i][1] - cells[j][1]) <= 1) {
        adj[i].push(j); adj[j].push(i)
      }
  let best = 0
  const blocked = new Array<number>(m).fill(0)
  const bt = (i: number, count: number): boolean => {
    if (count >= cap) { best = count; return true }
    if (best >= cap) return true
    if (i === m) { if (count > best) best = count; return false }
    if (count + (m - i) < cap && count + (m - i) <= best) { if (count > best) best = count; return false }
    if (!blocked[i]) {
      for (const j of adj[i]) blocked[j]++
      if (bt(i + 1, count + 1)) { for (const j of adj[i]) blocked[j]--; return true }
      for (const j of adj[i]) blocked[j]--
    }
    return bt(i + 1, count)
  }
  bt(0, 0)
  return best
}

interface Technique { fn: (board: Board, ctx: Context) => Move[]; teachable: boolean }
const TECHNIQUES: Technique[] = [
  { fn: techAdjacency, teachable: true },
  { fn: techQuotaMet, teachable: true },
  { fn: techForcedFill, teachable: true },
  { fn: techRegionConfinement, teachable: true },
  { fn: techLineConfinement, teachable: true },
  { fn: techSetCounting, teachable: true },
  { fn: techPairExclusion, teachable: true },
  { fn: techHypotheticalExclusion, teachable: false },
]

/** Full solve from an optional starting board. */
export function solve(puzzle: SolverPuzzle, startBoard?: Board, opts: SolveOptions = {}): SolveResult {
  const { n } = puzzle
  const board: Board = startBoard
    ? startBoard.map(row => row.slice())
    : Array.from({ length: n }, () => Array.from({ length: n }, () => 'unknown' as Cell))
  const ctx = makeContext(puzzle)
  let steps = 0, maxTier = -1
  for (;;) {
    let applied = false
    for (const tech of TECHNIQUES) {
      if (opts.teachableOnly && !tech.teachable) continue
      const moves = tech.fn(board, ctx)
      for (const m of moves) {
        if (board[m.r][m.c] === 'unknown') {
          board[m.r][m.c] = m.action
          steps++
          if (m.tier > maxTier) maxTier = m.tier
          applied = true
        }
      }
      if (applied) break
    }
    if (!applied) break
  }
  return { board, steps, maxTier }
}

export function isComplete(board: Board, n: number): boolean {
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      if (board[r][c] === 'unknown') return false
  return true
}

export interface DifficultyResult {
  difficulty: string
  difficulty_score: number
}

/**
 * Classify a puzzle's difficulty from its region layout, using the exact logic
 * of the backfill applied to dev. Runs the solver twice (teachable-only and
 * full) and buckets by how much pure-teachable deduction cracks the board.
 */
export function classifyDifficulty(regions: number[][], gridSize: number, stars: number): DifficultyResult {
  const n = gridSize
  const puzzle: SolverPuzzle = { n, stars, regions }

  const teachable = solve(puzzle, undefined, { teachableOnly: true })
  const full = solve(puzzle, undefined, { teachableOnly: false })

  const teachSolved = isComplete(teachable.board, n)
  const teachFrac = teachable.steps / (n * n)
  const teachTier = teachable.maxTier
  const fullSolved = isComplete(full.board, n)

  if (n === 10) {
    if (!fullSolved) return { difficulty: 'very_hard', difficulty_score: -1 }
    if (teachSolved || teachFrac >= 0.40) return { difficulty: 'easy', difficulty_score: Math.round(teachFrac * 100) }
    if (teachFrac >= 0.20) return { difficulty: 'medium', difficulty_score: Math.round(teachFrac * 100) }
    return { difficulty: 'hard', difficulty_score: Math.round(teachFrac * 100) }
  }

  // 5 / 6 / 8
  if (teachSolved && teachTier <= 2) return { difficulty: 'easy', difficulty_score: teachTier }
  if (teachSolved && teachTier >= 3) return { difficulty: 'medium', difficulty_score: teachTier }
  return { difficulty: 'hard', difficulty_score: Math.round(teachFrac * 100) }
}
