/**
 * Seeds the dev database using wrangler (OAuth) instead of the D1 REST API.
 *
 * seedPuzzlesV2.ts talks to the REST API and so needs CLOUDFLARE_API_TOKEN +
 * CLOUDFLARE_ACCOUNT_ID. When only `wrangler login` OAuth is available, this
 * generates the same rows and inserts them with `wrangler d1 execute`, which
 * uses that OAuth session.
 *
 * Dev only: it hardcodes --env dev and refuses voronoi-v2 (use the main script
 * for that, which is also the only engine allowed anywhere near prod).
 *
 *   npx tsx scripts/seedViaWrangler.ts <engine> <size> <seconds>
 */
import { execFileSync } from 'child_process'
import { writeFileSync, unlinkSync } from 'fs'
import { V3_ENGINES } from '../src/generator/v3'
import { classifyDifficulty } from '@queens/solver'

const engineId = process.argv[2]
const size = Number(process.argv[3])
const seconds = Number(process.argv[4] ?? 60)

const engine = V3_ENGINES[engineId]
if (!engine) {
  console.error(`Unknown or non-v3 engine "${engineId}". Options: ${Object.keys(V3_ENGINES).join(', ')}`)
  process.exit(1)
}
if (!engine.combos.some(c => c.size === size && c.stars === 1)) {
  console.error(`${engineId} does not generate ${size}x${size} 1-star.`)
  process.exit(1)
}

const wrangler = './node_modules/.bin/wrangler'
/**
 * Runs SQL via wrangler and returns the parsed result.
 *
 * wrangler prints config warnings and upload progress before the JSON, so the
 * payload is taken from the first `[` onwards.
 *
 * `--command` and `--file` are NOT interchangeable: with `--file` wrangler
 * returns execution *statistics* ("Rows read", ...) rather than the rows, which
 * silently turns a SELECT into useless data. Reads therefore use --command, and
 * --file is only for big writes that would blow the argv limit.
 */
const d1 = (sql: string, mode: 'read' | 'write' = 'read'): any[] => {
  const base = ['d1', 'execute', 'queens-dev', '--remote', '--env', 'dev', '--json']
  let args: string[]
  let file: string | null = null
  if (mode === 'read') {
    args = [...base, '--command', sql]
  } else {
    file = `/tmp/.seed-${process.pid}.sql`
    writeFileSync(file, sql)
    args = [...base, '--file', file]
  }
  try {
    const out = execFileSync(wrangler, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    const start = out.indexOf('[')
    if (start === -1) throw new Error(`no JSON in wrangler output:\n${out.slice(0, 500)}`)
    return JSON.parse(out.slice(start))
  } finally {
    if (file) unlinkSync(file)
  }
}

const esc = (s: string) => s.replace(/'/g, "''")

// Existing solutions for this size, so we don't generate known duplicates, plus
// the global max code.
console.log(`Fetching existing ${size}x${size} state...`)
const existing = d1(`SELECT solution FROM puzzles WHERE grid_size = ${size} AND stars = 1;`)
const seen = new Set<string>(
  (existing[0]?.results ?? []).map((r: { solution: string }) => r.solution)
)
const codeRow = d1('SELECT MAX(code) AS m FROM puzzles;')
const maxCode = codeRow[0]?.results?.[0]?.m
if (typeof maxCode !== 'number') {
  // Guessing here would restart codes from 10001 and collide with every
  // existing row, which INSERT OR IGNORE then drops silently.
  console.error('Could not read MAX(code); refusing to guess. Got:', JSON.stringify(codeRow).slice(0, 300))
  process.exit(1)
}
let nextCode = maxCode + 1
console.log(`  ${seen.size} existing, next code ${nextCode}`)

console.log(`Generating ${engineId} ${size}x${size} for ${seconds}s...`)
const rows: string[] = []
const deadline = Date.now() + seconds * 1000
let dupes = 0
const started = new Date().toISOString()
let attempts = 0

while (Date.now() < deadline) {
  attempts++
  const { puzzle } = engine.generate(size)
  if (!puzzle) continue
  const solution = JSON.stringify(puzzle.solution)
  if (seen.has(solution)) { dupes++; continue }
  seen.add(solution)
  const d = classifyDifficulty(puzzle.regions, size, 1)
  rows.push(`('${crypto.randomUUID()}', ${size}, 1, '${esc(JSON.stringify(puzzle.regions))}', '${esc(solution)}', ${nextCode++}, '${new Date().toISOString()}', '${d.difficulty}', ${d.difficulty_score}, '${engineId}')`)
  if (rows.length % 25 === 0) process.stdout.write(`\r  ${rows.length} generated (${dupes} dupes)`)
}
console.log(`\r  ${rows.length} generated (${dupes} dupes, ${attempts} attempts)`)

if (!rows.length) { console.log('Nothing to upload.'); process.exit(0) }

const BATCH = 100
for (let i = 0; i < rows.length; i += BATCH) {
  const batch = rows.slice(i, i + BATCH)
  d1(`INSERT OR IGNORE INTO puzzles (id, grid_size, stars, regions, solution, code, created_at, difficulty, difficulty_score, engine) VALUES\n${batch.join(',\n')};`, 'write')
  console.log(`  uploaded ${Math.min(i + BATCH, rows.length)}/${rows.length}`)
}

d1(`INSERT INTO seed_runs (id, grid_size, stars, attempts, generated, duplicates, inserted, started_at, finished_at, engine) VALUES ('${crypto.randomUUID()}', ${size}, 1, ${attempts}, ${rows.length + dupes}, ${dupes}, ${rows.length}, '${started}', '${new Date().toISOString()}', '${engineId}');`)
console.log(`Done: ${rows.length} ${engineId} ${size}x${size} puzzles inserted.`)
