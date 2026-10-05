/**
 * Experiment: region-growth strategies for 1-star puzzles. Local only — writes JSON.
 *   npx tsx scripts/experimentGrowth.ts <size> <secondsPerStrategy> <out.json> [strategies,comma,sep]
 */
import { writeFileSync } from 'fs'
import { solve, isComplete, classifyDifficulty } from '@queens/solver'

type Grid = number[][]
type Cell = [number, number]
const rnd = (n: number) => Math.floor(Math.random() * n)
const shuffle = <T>(a: T[]) => { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]] } return a }
const nb4 = (r: number, c: number, n: number): Cell[] => {
  const o: Cell[] = []
  if (r > 0) o.push([r - 1, c]); if (r < n - 1) o.push([r + 1, c])
  if (c > 0) o.push([r, c - 1]); if (c < n - 1) o.push([r, c + 1])
  return o
}
const empty = (n: number): Grid => Array.from({ length: n }, () => new Array(n).fill(-1))

// ---------- solutions ----------
/** Up to `limit` solutions; each is col-per-row. */
function findSolutions(g: Grid, n: number, limit = 2): number[][] {
  const out: number[][] = [], cols = new Array(n).fill(false), regs = new Array(n).fill(false), cur: number[] = []
  const go = (r: number) => {
    if (out.length >= limit) return
    if (r === n) { out.push([...cur]); return }
    for (let c = 0; c < n; c++) {
      if (cols[c] || regs[g[r][c]]) continue
      if (r > 0 && Math.abs(cur[r - 1] - c) <= 1) continue
      cols[c] = regs[g[r][c]] = true; cur.push(c)
      go(r + 1)
      cols[c] = regs[g[r][c]] = false; cur.pop()
    }
  }
  go(0)
  return out
}

/** Random valid queen layout (one per row/col, no touching). */
function randomQueens(n: number): Cell[] {
  const cur: number[] = [], used = new Array(n).fill(false)
  const go = (r: number): boolean => {
    if (r === n) return true
    for (const c of shuffle([...Array(n).keys()])) {
      if (used[c] || (r > 0 && Math.abs(cur[r - 1] - c) <= 1)) continue
      used[c] = true; cur.push(c)
      if (go(r + 1)) return true
      used[c] = false; cur.pop()
    }
    return false
  }
  go(0)
  return cur.map((c, r) => [r, c])
}

function randomSeeds(n: number): Cell[] {
  const minD = Math.max(2, Math.floor(Math.sqrt(n))), s: Cell[] = []
  for (let t = 0; s.length < n && t < 5000; t++) {
    const r = rnd(n), c = rnd(n)
    if (s.every(([a, b]) => Math.abs(a - r) + Math.abs(b - c) >= minD)) s.push([r, c])
  }
  return s
}

// ---------- growth ----------
function voronoi(n: number, seeds: Cell[]): Grid {
  const g = empty(n); seeds.forEach(([r, c], i) => g[r][c] = i)
  let f = shuffle([...seeds])
  while (f.length) {
    const next: Cell[] = []
    for (const [r, c] of f) for (const [a, b] of shuffle(nb4(r, c, n))) if (g[a][b] === -1) { g[a][b] = g[r][c]; next.push([a, b]) }
    f = shuffle(next)
  }
  return g
}

/** One cell at a time; region picked by weight among those that can still grow. frozen regions skipped unless nothing else can reach a cell. */
function eden(n: number, g: Grid, weights: number[], frozen = new Set<number>(), cap = Infinity) {
  for (;;) {
    const sz = sizesOf(g, n)
    const cand: Map<number, Cell[]> = new Map()
    let anyEmpty = false
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      if (g[r][c] !== -1) continue
      anyEmpty = true
      for (const [a, b] of nb4(r, c, n)) { const id = g[a][b]; if (id >= 0) { if (!cand.has(id)) cand.set(id, []); cand.get(id)!.push([r, c]) } }
    }
    if (!anyEmpty) return
    let ids = [...cand.keys()].filter(id => !frozen.has(id) && sz[id] < cap)
    if (!ids.length) ids = [...cand.keys()] // enclosed pocket: let frozen region fill it
    const tot = ids.reduce((s, id) => s + weights[id], 0)
    let x = Math.random() * tot, pick = ids[0]
    for (const id of ids) { x -= weights[id]; if (x <= 0) { pick = id; break } }
    const cells = cand.get(pick)!
    const [r, c] = cells[rnd(cells.length)]
    g[r][c] = pick
  }
}

/** 1-wide random walk from the seed, biased to go straight. */
function snake(n: number, g: Grid, id: number, start: Cell, len: number) {
  let [r, c] = start
  const dirs: Cell[] = [[1, 0], [-1, 0], [0, 1], [0, -1]]
  let d = dirs[rnd(4)]
  for (let i = 0; i < len; i++) {
    const opts = shuffle([...dirs]).sort((a, b) => (a === d ? -1 : 0) - (b === d ? -1 : 0))
    let moved = false
    for (const nd of Math.random() < 0.75 ? opts : shuffle(opts)) {
      const a = r + nd[0], b = c + nd[1]
      if (a < 0 || b < 0 || a >= n || b >= n || g[a][b] !== -1) continue
      // stay 1-wide: new cell may only touch the cell we came from
      const touching = nb4(a, b, n).filter(([x, y]) => g[x][y] === id && !(x === r && y === c))
      if (touching.length) continue
      g[a][b] = id; r = a; c = b; d = nd; moved = true; break
    }
    if (!moved) return
  }
}

// ---------- checks ----------
const sizesOf = (g: Grid, n: number) => { const s = new Array(n).fill(0); g.flat().forEach(v => s[v]++); return s }
const isSym = (g: Grid, n: number) => g.every((row, r) => row.every((v, c) => v === g[n - 1 - r][n - 1 - c]))
function connectedWithout(g: Grid, n: number, id: number, skip: Cell): boolean {
  const cells: Cell[] = []
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (g[r][c] === id && !(r === skip[0] && c === skip[1])) cells.push([r, c])
  if (!cells.length) return false
  const seen = new Set([cells[0].join()]), st = [cells[0]]
  while (st.length) { const [r, c] = st.pop()!; for (const [a, b] of nb4(r, c, n)) { const k = a + ',' + b; if (g[a][b] === id && !(a === skip[0] && b === skip[1]) && !seen.has(k)) { seen.add(k); st.push([a, b]) } } }
  return seen.size === cells.length
}
/** Cells in a 1-wide corridor: same region on both sides along one axis, different on both sides of the other. */
function corridorCells(g: Grid, n: number): number {
  const same = (r: number, c: number, id: number) => r >= 0 && c >= 0 && r < n && c < n && g[r][c] === id
  let k = 0
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const id = g[r][c], U = same(r - 1, c, id), D = same(r + 1, c, id), L = same(r, c - 1, id), R = same(r, c + 1, id)
    if ((U || D) && !L && !R && (U && D)) k++
    else if ((L || R) && !U && !D && (L && R)) k++
  }
  return k
}

// ---------- repair: break alternative solutions by moving one cell ----------
function repair(g: Grid, n: number, S: number[], maxIter = 60): { g: Grid, steps: number } | null {
  for (let it = 0; it < maxIter; it++) {
    const sols = findSolutions(g, n, 2)
    if (sols.length === 1) return { g, steps: it }
    const T = sols.find(s => s.some((c, r) => c !== S[r]))!
    const cells = shuffle(T.map((c, r) => [r, c] as Cell).filter(([r, c]) => S[r] !== c))
    let done = false
    for (const [r, c] of cells) {
      const R = g[r][c]
      if (sizesOf(g, n)[R] <= 2 || !connectedWithout(g, n, R, [r, c])) continue
      const others = [...new Set(nb4(r, c, n).map(([a, b]) => g[a][b]).filter(x => x !== R))]
      if (!others.length) continue
      g[r][c] = others[rnd(others.length)]; done = true; break
    }
    if (!done) return null
  }
  return null
}

// ---------- difficulty ----------
function hardness(g: Grid, n: number) {
  const p = { n, stars: 1, regions: g } as any
  const t = solve(p, undefined, { teachableOnly: true })
  const tSolved = isComplete(t.board, n)
  const full = tSolved ? true : isComplete(solve(p, undefined, { teachableOnly: false }).board, n)
  // teachable-solvable: 0..3 by tier; otherwise 10 + how early the teachable solver stalls
  const h = tSolved ? t.maxTier : 10 + 10 * (1 - t.steps / (n * n))
  return { h, full, teachFrac: t.steps / (n * n) }
}

/** Hill-climb: move boundary cells (keeping S valid + unique + fully solvable) toward harder. */
function harden(g: Grid, n: number, S: number[], iters: number): Grid {
  const queen = new Set(S.map((c, r) => r + ',' + c))
  let best = hardness(g, n).h
  for (let i = 0; i < iters; i++) {
    const r = rnd(n), c = rnd(n)
    if (queen.has(r + ',' + c)) continue
    const R = g[r][c]
    const others = [...new Set(nb4(r, c, n).map(([a, b]) => g[a][b]).filter(x => x !== R))]
    if (!others.length || sizesOf(g, n)[R] <= 2 || !connectedWithout(g, n, R, [r, c])) continue
    g[r][c] = others[rnd(others.length)]
    const ok = findSolutions(g, n, 2).length === 1 && !isSym(g, n)
    const hd = ok ? hardness(g, n) : null
    if (hd && hd.full && hd.h >= best) best = hd.h
    else g[r][c] = R
  }
  return g
}

// ---------- strategies ----------
type Result = { g: Grid, S: number[], repairs?: number } | { fail: string }
const expWeights = (n: number) => Array.from({ length: n }, () => -Math.log(1 - Math.random()))

function qfSnakeLayout(n: number, cap = Infinity) {
  const Q = randomQueens(n), S = Q.map(([, c]) => c)
  const g = empty(n); Q.forEach(([r, c], i) => g[r][c] = i)
  const snakes = shuffle([...Array(n).keys()]).slice(0, 1 + rnd(3))
  for (const id of snakes) snake(n, g, id, Q[id], 3 + rnd(n - 2))
  const w = expWeights(n)
  w[shuffle([...Array(n).keys()].filter(i => !snakes.includes(i)))[0]] *= 3 // one likely-big region
  eden(n, g, w, new Set(snakes), cap)
  return { g, S }
}

const STRATEGIES: Record<string, (n: number) => Result> = {
  'final': n => {
    const { g, S } = qfSnakeLayout(n, Math.round(2.5 * n))
    const r = repair(g, n, S); if (!r) return { fail: 'repair' }
    return { g: harden(r.g, n, S, 300), S, repairs: r.steps }
  },
  'voronoi': n => {
    const s = randomSeeds(n); if (s.length < n) return { fail: 'seeds' }
    const g = voronoi(n, s); const sol = findSolutions(g, n)
    if (!sol.length) return { fail: 'solve' }; if (sol.length > 1) return { fail: 'notUnique' }
    return { g, S: sol[0] }
  },
  'eden': n => {
    const s = randomSeeds(n); if (s.length < n) return { fail: 'seeds' }
    const g = empty(n); s.forEach(([r, c], i) => g[r][c] = i); eden(n, g, expWeights(n))
    const sol = findSolutions(g, n)
    if (!sol.length) return { fail: 'solve' }; if (sol.length > 1) return { fail: 'notUnique' }
    return { g, S: sol[0] }
  },
  'qf-eden': n => {
    const Q = randomQueens(n), g = empty(n); Q.forEach(([r, c], i) => g[r][c] = i); eden(n, g, expWeights(n))
    if (findSolutions(g, n).length > 1) return { fail: 'notUnique' }
    return { g, S: Q.map(([, c]) => c) }
  },
  'qf-snake': n => {
    const { g, S } = qfSnakeLayout(n)
    if (findSolutions(g, n).length > 1) return { fail: 'notUnique' }
    return { g, S }
  },
  'qf-snake-repair': n => {
    const { g, S } = qfSnakeLayout(n)
    const r = repair(g, n, S); if (!r) return { fail: 'repair' }
    return { g: r.g, S, repairs: r.steps }
  },
  'qf-snake-repair-harden': n => {
    const { g, S } = qfSnakeLayout(n)
    const r = repair(g, n, S); if (!r) return { fail: 'repair' }
    return { g: harden(r.g, n, S, 150), S, repairs: r.steps }
  },
}

// ---------- run ----------
const n = Number(process.argv[2] ?? 8), secs = Number(process.argv[3] ?? 10), outPath = process.argv[4] ?? 'growth.json'
const which = (process.argv[5] ?? Object.keys(STRATEGIES).join(',')).split(',')
const results: any[] = []
for (const name of which) {
  const fails: Record<string, number> = {}, puzzles: any[] = [], seen = new Set<string>()
  let attempts = 0; const end = Date.now() + secs * 1000
  while (Date.now() < end) {
    attempts++
    const res = STRATEGIES[name](n)
    if ('fail' in res) { fails[res.fail] = (fails[res.fail] ?? 0) + 1; continue }
    const { g, S } = res, sz = sizesOf(g, n)
    if (sz.some(s => s < 2)) { fails.minSize = (fails.minSize ?? 0) + 1; continue }
    if (isSym(g, n)) { fails.sym = (fails.sym ?? 0) + 1; continue }
    const key = JSON.stringify(g); if (seen.has(key)) continue; seen.add(key)
    const d = classifyDifficulty(g, n, 1), hd = hardness(g, n)
    puzzles.push({ strategy: name, gridSize: n, regions: g, solution: S.map(c => [c]), difficulty: d.difficulty, score: d.difficulty_score,
      teachFrac: +hd.teachFrac.toFixed(2), corridor: corridorCells(g, n), sizes: sz.sort((a, b) => b - a), repairs: (res as any).repairs })
  }
  const cnt: Record<string, number> = {}; puzzles.forEach(p => cnt[p.difficulty] = (cnt[p.difficulty] ?? 0) + 1)
  const avg = (f: (p: any) => number) => puzzles.length ? (puzzles.reduce((s, p) => s + f(p), 0) / puzzles.length).toFixed(1) : '-'
  const pct = Object.fromEntries(Object.entries(cnt).map(([k, v]) => [k, Math.round(100 * v / puzzles.length) + '%']))
  console.log(`${n}x${n} ${name.padEnd(24)} ${String(puzzles.length).padStart(4)} puzzles  ${(puzzles.length / secs).toFixed(2).padStart(6)}/s  largest=${avg(p => p.sizes[0])} corridor=${avg(p => p.corridor)} teachFrac=${avg(p => p.teachFrac * 100)}%  ${JSON.stringify(pct)}  fails=${JSON.stringify(fails)}`)
  results.push({ name, n, attempts, fails, puzzles })
}
writeFileSync(outPath, JSON.stringify(results))
