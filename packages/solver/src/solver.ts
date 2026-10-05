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

export type GroupType = 'row' | 'column' | 'region'
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

export interface GroupRef {
  type: GroupType
  id: number
}
export interface LineRef {
  type: 'row' | 'column'
  idx: number
}
export type ConfinementDirection = 'region-in-line' | 'line-in-region'
export type SetCountingDirection = 'regions-in-lines' | 'lines-in-regions'
export type PlacementRole = 'never-used' | 'always-used'

/**
 * Structured, teachable explanation for a move. Mirrors the `MoveExplain` enum
 * in StarBattleSolver.swift; uses 0-indexed ids/indices and never names colours
 * (the UI translates region ids to colours).
 */
export type MoveExplain =
  | { kind: 'adjacency'; star: [number, number] }
  | { kind: 'quota-met'; group: GroupRef }
  | { kind: 'forced-fill'; group: GroupRef; need: number }
  | { kind: 'confinement'; direction: ConfinementDirection; region: number; line: LineRef }
  | {
      kind: 'set-counting'
      direction: SetCountingDirection
      regions: number[]
      lineType: GroupType
      lineIdxs: number[]
    }
  | { kind: 'placement'; group: GroupRef; need: number; role: PlacementRole }
  | { kind: 'hypothetical'; group: GroupRef }

export interface Move {
  r: number
  c: number
  action: 'star' | 'cross'
  tier: number
  explain?: MoveExplain
  /**
   * Human-readable justification. Built lazily: the tier-4 look-ahead
   * generates and discards huge numbers of candidate moves inside
   * `cheapPropagate`, and eagerly interpolating this string there costs
   * orders of magnitude more than the search itself.
   */
  readonly reason?: string
}

/**
 * Attaches an explanation to a move, deferring the `reason` string until it is
 * actually read. Callers that only inspect `r`/`c`/`action` pay nothing.
 */
function explained(
  move: { r: number; c: number; action: 'star' | 'cross'; tier: number },
  explain: MoveExplain,
  reason: () => string,
): Move {
  return Object.defineProperties({ ...move, explain } as Move, {
    reason: { get: reason, enumerable: true, configurable: true },
  })
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

// ---- Explanation helpers (mirror StarBattleSolver.swift) ----

function glabel(g: Group): string {
  return `${g.type} ${g.idx + 1}`
}
function gref(g: Group): GroupRef {
  return { type: g.type, id: g.idx }
}
function grefLabel(ref: GroupRef): string {
  return `${ref.type} ${ref.id + 1}`
}
function capitalizeFirst(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s
}
/** "s" when n is plural, matching the Swift string interpolation. */
function plural(n: number): string {
  return n > 1 ? 's' : ''
}
/** 1-indexed, comma-joined list of ids for reason strings. */
function idList(xs: number[]): string {
  return xs.map(x => String(x + 1)).join(', ')
}

// ---- Techniques ----

function techAdjacency(board: Board, ctx: Context): Move[] {
  const { n } = ctx
  const moves: Move[] = []
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      if (board[r][c] !== 'star') continue
      for (const [rr, cc] of neighbors8(r, c, n))
        if (board[rr][cc] === 'unknown')
          moves.push({
            r: rr,
            c: cc,
            action: 'cross',
            tier: 0,
            explain: { kind: 'adjacency', star: [r, c] },
            reason: `Adjacent to the star at R${r + 1}C${c + 1}, so it can't be a star.`,
          })
    }
  return moves
}

function techQuotaMet(board: Board, ctx: Context): Move[] {
  const { stars, groups } = ctx
  const moves: Move[] = []
  for (const g of groups) {
    const { stars: s, unknown } = groupStats(board, g.cells)
    if (s === stars && unknown.length)
      for (const [r, c] of unknown)
        moves.push({
          r,
          c,
          action: 'cross',
          tier: 1,
          explain: { kind: 'quota-met', group: gref(g) },
          reason: `${capitalizeFirst(glabel(g))} already has its ${stars} star${plural(stars)}, so this must be a cross.`,
        })
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
      for (const [r, c] of unknown)
        moves.push({
          r,
          c,
          action: 'star',
          tier: 1,
          explain: { kind: 'forced-fill', group: gref(g), need },
          reason: `${capitalizeFirst(glabel(g))} needs ${need} more star${plural(need)} and has exactly ${need} open cell${plural(need)} left.`,
        })
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
            moves.push(
              explained(
                { r, c, action: 'cross', tier: 2 },
                {
                  kind: 'confinement',
                  direction: 'region-in-line',
                  region: g.idx,
                  line: { type: 'row', idx: r },
                },
                () =>
                  `Region ${g.idx + 1}'s ${need} remaining star${plural(need)} must all lie in row ${r + 1}, filling that row's quota, so the rest of row ${r + 1} can't hold a star.`,
              ),
            )
    }
    const cs = colsOf(unknown)
    if (cs.size === 1) {
      const c = cs.items[0]
      if (lineNeed(board, ctx, 'column', c) === need)
        for (let r = 0; r < n; r++)
          if (board[r][c] === 'unknown' && regions[r][c] !== g.idx)
            moves.push(
              explained(
                { r, c, action: 'cross', tier: 2 },
                {
                  kind: 'confinement',
                  direction: 'region-in-line',
                  region: g.idx,
                  line: { type: 'column', idx: c },
                },
                () =>
                  `Region ${g.idx + 1}'s ${need} remaining star${plural(need)} must all lie in column ${c + 1}, filling that column's quota, so the rest of column ${c + 1} can't hold a star.`,
              ),
            )
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
          if (!inLine)
            moves.push(
              explained(
                { r, c, action: 'cross', tier: 2 },
                {
                  kind: 'confinement',
                  direction: 'line-in-region',
                  region: id,
                  line: { type: g.type as 'row' | 'column', idx: g.idx },
                },
                () =>
                  `${capitalizeFirst(glabel(g))}'s ${need} remaining star${plural(need)} must all lie in region ${id + 1}, filling that region's quota, so region ${id + 1}'s cells outside ${glabel(g)} can't hold a star.`,
              ),
            )
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
            moves.push(
              explained(
                { r, c, action: 'cross', tier: 3 },
                {
                  kind: 'set-counting',
                  direction: 'regions-in-lines',
                  regions: regIds.items.slice(),
                  lineType: orient === 'row' ? 'row' : 'column',
                  lineIdxs: lines.items.slice(),
                },
                () =>
                  `Regions ${idList(regIds.items)} are confined to ${orient === 'row' ? 'rows' : 'columns'} ${idList(lines.items)} and fill their stars, so other cells there can't hold a star.`,
              ),
            )
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
          if (!inLine)
            moves.push(
              explained(
                { r, c, action: 'cross', tier: 3 },
                {
                  kind: 'set-counting',
                  direction: 'lines-in-regions',
                  regions: regsUnion.items.slice(),
                  lineType: orient === 'row' ? 'row' : 'column',
                  lineIdxs: lineIdxs.items.slice(),
                },
                () =>
                  `${orient === 'row' ? 'Rows' : 'Columns'} ${idList(lineIdxs.items)} confine their stars to regions ${idList(regsUnion.items)} and fill them, so those regions' cells outside those ${orient === 'row' ? 'rows' : 'columns'} can't hold a star.`,
              ),
            )
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
      if (usedCount[i] === 0)
        moves.push({
          r,
          c,
          action: 'cross',
          tier: 3,
          explain: { kind: 'placement', group: gref(g), need, role: 'never-used' },
          reason: `No valid arrangement of ${glabel(g)}'s ${need} stars can place one at R${r + 1}C${c + 1}, so it must be a cross.`,
        })
      else if (usedCount[i] === placements)
        moves.push({
          r,
          c,
          action: 'star',
          tier: 3,
          explain: { kind: 'placement', group: gref(g), need, role: 'always-used' },
          reason: `Every valid arrangement of ${glabel(g)}'s ${need} stars places one at R${r + 1}C${c + 1}, so it must be a star.`,
        })
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
      const badA = cheapPropagate(asStar, ctx)
      if (badA) {
        moves.push({
          r,
          c,
          action: 'cross',
          tier: 4,
          explain: { kind: 'hypothetical', group: badA },
          reason: `Placing a star at R${r + 1}C${c + 1} would leave ${grefLabel(badA)} unable to place its stars, so it must be a cross.`,
        })
        continue
      }
      const asCross = board.map(row => row.slice())
      asCross[r][c] = 'cross'
      const badB = cheapPropagate(asCross, ctx)
      if (badB)
        moves.push({
          r,
          c,
          action: 'star',
          tier: 4,
          explain: { kind: 'hypothetical', group: badB },
          reason: `Crossing R${r + 1}C${c + 1} would leave ${grefLabel(badB)} unable to place its stars, so it must be a star.`,
        })
    }
  return moves
}

// Returns true if a contradiction is detected, false at a consistent fixpoint.
/**
 * Propagates cheap constraints in place. Returns the group that breaks if the
 * board becomes inconsistent, or null if propagation settles consistently.
 */
function cheapPropagate(b: Board, ctx: Context): GroupRef | null {
  const { n, stars, groups } = ctx
  for (;;) {
    const broken = firstBrokenGroup(b, ctx)
    if (broken) return broken
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
    if (!changed) return firstBrokenGroup(b, ctx)
  }
}

/**
 * Returns the first group that can no longer place its stars, or null when the
 * board is still consistent. Callers that only need a boolean check for null;
 * the returned group is used to explain tier-4 hypothetical moves.
 */
function firstBrokenGroup(b: Board, ctx: Context): GroupRef | null {
  const { stars, groups, n } = ctx
  for (const g of groups) {
    let s = 0
    const open: [number, number][] = []
    for (const [r, c] of g.cells) {
      const v = b[r][c]
      if (v === 'star') s++
      else if (v === 'unknown') open.push([r, c])
    }
    if (s > stars) return gref(g)
    const need = stars - s
    if (need === 0) continue
    if (open.length < need) return gref(g)
    if (maxIndependent(open, need) < need) return gref(g)
  }
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      if (b[r][c] !== 'star') continue
      for (const [rr, cc] of neighbors8(r, c, n))
        if (b[rr][cc] === 'star') return { type: 'row', id: r }
    }
  return null
}

function consistent(b: Board, ctx: Context): boolean {
  return firstBrokenGroup(b, ctx) === null
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

/**
 * The single next forced move given the current board, computed fresh.
 * Lowest-cost technique first. `teachableOnly` skips the look-ahead technique.
 */
export function nextMove(
  board: Board,
  puzzle: SolverPuzzle,
  opts: SolveOptions = {},
): Move | null {
  const ctx = makeContext(puzzle)
  for (const tech of TECHNIQUES) {
    if (opts.teachableOnly && !tech.teachable) continue
    for (const m of tech.fn(board, ctx)) if (board[m.r][m.c] === 'unknown') return m
  }
  return null
}

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
 * Classify a puzzle's difficulty from its region layout. Runs the solver twice
 * (teachable-only and full) and buckets by how much pure-teachable deduction
 * cracks the board.
 *
 * Two scales, because the small boards were classified before the large ones:
 *
 * - **n >= 9** buckets on `teachFrac`, and `difficulty_score` is that fraction
 *   as a percentage. A board the full solver cannot finish is `very_hard`.
 *   This is the logic the 10×10 backfill applied to dev, extended to 9×9 —
 *   without it a 9×9 fell through to the small-board branch below, where
 *   `fullSolved` is never consulted, so every 9×9 that stalled the teachable
 *   solver came out `hard` and could never be `very_hard`.
 * - **n <= 8** buckets on the highest technique tier the teachable solver
 *   needed, and `difficulty_score` is that tier (0–4), not a percentage.
 *
 * So `difficulty_score` means different things either side of that line. It is
 * only ever compared within a size, so the two scales never mix in practice.
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

  // 9 / 10 — fraction-based
  if (n >= 9) {
    if (!fullSolved) return { difficulty: 'very_hard', difficulty_score: -1 }
    if (teachSolved || teachFrac >= 0.40) return { difficulty: 'easy', difficulty_score: Math.round(teachFrac * 100) }
    if (teachFrac >= 0.20) return { difficulty: 'medium', difficulty_score: Math.round(teachFrac * 100) }
    return { difficulty: 'hard', difficulty_score: Math.round(teachFrac * 100) }
  }

  // 5 / 6 / 8 — tier-based
  if (teachSolved && teachTier <= 2) return { difficulty: 'easy', difficulty_score: teachTier }
  if (teachSolved && teachTier >= 3) return { difficulty: 'medium', difficulty_score: teachTier }
  return { difficulty: 'hard', difficulty_score: Math.round(teachFrac * 100) }
}
