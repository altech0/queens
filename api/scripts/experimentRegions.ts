/**
 * Experiment: compare current region rules vs relaxed rules (min size 2, no max cap,
 * no "at most 2 small regions" limit). Local only — writes JSON, never touches remote D1.
 *
 *   npx tsx scripts/experimentRegions.ts [secondsPerRun] [out.json]
 */
import { writeFileSync } from 'fs'
import { solveStars } from '../src/generator/v2/solver'
import { hasUniqueSolutionV2 } from '../src/generator/v2/validator'
import { classifyDifficulty } from '@queens/solver'

interface Rules { name: string; minSize: number; maxSize: number | null; maxSmall: number | null }
const CURRENT = (n: number): Rules => ({ name: 'current', minSize: 2, maxSize: Math.floor(n * 1.5), maxSmall: 2 })
const RELAXED = (_n: number): Rules => ({ name: 'relaxed', minSize: 2, maxSize: null, maxSmall: null })

const shuffle = <T>(a: T[]) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }

// Same seed placement + lockstep BFS as buildRegionsV2; only the post-growth checks differ.
function buildRegions(n: number, rules: Rules): number[][] | null {
  const minSeedDist = Math.max(2, Math.floor(Math.sqrt(n)))
  const seeds: [number, number][] = []
  for (let t = 0; seeds.length < n && t < 2000; t++) {
    const r = Math.floor(Math.random() * n), c = Math.floor(Math.random() * n)
    if (seeds.every(([sr, sc]) => Math.abs(r - sr) + Math.abs(c - sc) >= minSeedDist)) seeds.push([r, c])
  }
  if (seeds.length < n) return null
  const g = Array.from({ length: n }, () => new Array(n).fill(-1))
  seeds.forEach(([r, c], i) => { g[r][c] = i })
  let frontier = shuffle([...seeds])
  while (frontier.length) {
    const next: [number, number][] = []
    for (const [r, c] of frontier) {
      const nb: [number, number][] = []
      if (r > 0) nb.push([r - 1, c]); if (r < n - 1) nb.push([r + 1, c])
      if (c > 0) nb.push([r, c - 1]); if (c < n - 1) nb.push([r, c + 1])
      for (const [nr, nc] of shuffle(nb)) if (g[nr][nc] === -1) { g[nr][nc] = g[r][c]; next.push([nr, nc]) }
    }
    frontier = shuffle(next)
  }
  const sizes = new Array(n).fill(0); g.flat().forEach(v => sizes[v]++)
  if (sizes.some(s => s < rules.minSize)) return null
  if (rules.maxSize !== null && sizes.some(s => s > rules.maxSize!)) return null
  if (rules.maxSmall !== null && sizes.filter(s => s <= 2).length > rules.maxSmall) return null
  return g
}

const isSym = (g: number[][], n: number) => g.every((row, r) => row.every((v, c) => v === g[n - 1 - r][n - 1 - c]))

function run(n: number, rules: Rules, seconds: number) {
  const out: any[] = []
  const c = { attempts: 0, failedRegions: 0, failedSymmetry: 0, failedSolve: 0, failedUniqueness: 0 }
  const seen = new Set<string>()
  const end = Date.now() + seconds * 1000
  while (Date.now() < end) {
    c.attempts++
    const regions = buildRegions(n, rules)
    if (!regions) { c.failedRegions++; continue }
    if (isSym(regions, n)) { c.failedSymmetry++; continue }
    const solution = solveStars(regions, { size: n, starsPerUnit: 1 } as any)
    if (!solution) { c.failedSolve++; continue }
    if (!hasUniqueSolutionV2(regions, { size: n, starsPerUnit: 1 } as any)) { c.failedUniqueness++; continue }
    const key = JSON.stringify(regions); if (seen.has(key)) continue; seen.add(key)
    const d = classifyDifficulty(regions, n, 1)
    const sizes = new Array(n).fill(0); regions.flat().forEach(v => sizes[v]++)
    out.push({ gridSize: n, stars: 1, rules: rules.name, regions, solution, difficulty: d.difficulty, score: d.difficulty_score, sizes: sizes.sort((a, b) => b - a) })
  }
  return { n, rules: rules.name, counters: c, puzzles: out }
}

const secs = Number(process.argv[2] ?? 20)
const outPath = process.argv[3] ?? 'experiment.json'
const results = [] as any[]
for (const n of [8, 9]) for (const mk of [CURRENT, RELAXED]) {
  const r = run(n, mk(n), secs)
  const p = r.puzzles
  const diff: Record<string, number> = {}
  p.forEach(x => diff[x.difficulty] = (diff[x.difficulty] ?? 0) + 1)
  const maxes = p.map(x => x.sizes[0]), mins = p.map(x => x.sizes[n - 1])
  const avg = (a: number[]) => a.length ? (a.reduce((s, v) => s + v, 0) / a.length).toFixed(1) : '-'
  console.log(`\n${n}x${n} ${r.rules}: ${p.length} unique puzzles from ${r.counters.attempts} attempts (${(p.length / secs).toFixed(1)}/s)`)
  console.log(`  rejects: regions=${r.counters.failedRegions} sym=${r.counters.failedSymmetry} solve=${r.counters.failedSolve} notUnique=${r.counters.failedUniqueness}`)
  console.log(`  largest region avg=${avg(maxes)} max=${Math.max(...maxes)} | smallest avg=${avg(mins)} min=${Math.min(...mins)}`)
  console.log(`  difficulty: ${JSON.stringify(diff)}`)
  results.push(r)
}
writeFileSync(outPath, JSON.stringify(results))
