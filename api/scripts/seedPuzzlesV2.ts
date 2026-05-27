/**
 * Generates puzzles for each valid v2 size/star combination and uploads
 * them to the deployed D1 database via the Cloudflare REST API.
 *
 * Fetches existing solutions from the DB at startup and checks locally
 * before inserting, so only genuinely new puzzles hit the DB.
 *
 * Usage:
 *   npx tsx scripts/seedPuzzlesV2.ts                        (interactive)
 *   npx tsx scripts/seedPuzzlesV2.ts --seconds 600 --yes    (CI / non-interactive)
 *   npx tsx scripts/seedPuzzlesV2.ts --size 6 --stars 1     (filter config)
 *
 * Email report (optional):
 *   Set RESEND_API_KEY and RESEND_TO env vars to receive a summary email.
 */

import { createInterface } from 'readline'
import { generatePuzzleV2 } from '../src/generator/v2'
import type { PuzzleConfig } from '../src/types/puzzleConfig'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const ALL_CONFIGS: PuzzleConfig[] = [
  { size: 5,  starsPerUnit: 1 },
  { size: 6,  starsPerUnit: 1 },
  { size: 8,  starsPerUnit: 1 },
  { size: 10, starsPerUnit: 2 },
]

const CODE_START_DEFAULT = 10001
const D1_DATABASE_ID = '4b75d895-b2d5-4465-aa7a-f3eb65d30ff0'

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------

interface Args {
  configs: PuzzleConfig[]
  seconds: number | null
  yes: boolean
}

function parseArgs(): Args {
  const argv = process.argv.slice(2)

  const get = (flag: string) => {
    const i = argv.indexOf(flag)
    return i !== -1 ? argv[i + 1] : null
  }

  const size    = get('--size')    !== null ? Number(get('--size'))    : null
  const stars   = get('--stars')   !== null ? Number(get('--stars'))   : null
  const seconds = get('--seconds') !== null ? Number(get('--seconds')) : null
  const yes = argv.includes('--yes')

  let configs = ALL_CONFIGS
  if (size !== null || stars !== null) {
    configs = ALL_CONFIGS.filter(c =>
      (size  === null || c.size         === size) &&
      (stars === null || c.starsPerUnit === stars)
    )
    if (configs.length === 0) {
      console.error(`No valid config for size=${size ?? 'any'} stars=${stars ?? 'any'}`)
      console.error(`Valid combos: ${ALL_CONFIGS.map(c => `size=${c.size} stars=${c.starsPerUnit}`).join(', ')}`)
      process.exit(1)
    }
  }

  return { configs, seconds, yes }
}

// ---------------------------------------------------------------------------
// Readline helpers (interactive mode only)
// ---------------------------------------------------------------------------

const rl = createInterface({ input: process.stdin, output: process.stdout })
const lineBuffer: string[] = []
let lineResolve: ((line: string) => void) | null = null

rl.on('line', line => {
  if (lineResolve) {
    const resolve = lineResolve
    lineResolve = null
    resolve(line.trim())
  } else {
    lineBuffer.push(line.trim())
  }
})

function prompt(question: string): Promise<string> {
  process.stdout.write(question)
  if (lineBuffer.length > 0) return Promise.resolve(lineBuffer.shift()!)
  return new Promise(resolve => { lineResolve = resolve })
}

function closePrompt() {
  rl.close()
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatElapsed(ms: number): string {
  if (ms < 1000)  return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  const m = Math.floor(ms / 60000)
  const s = Math.round((ms % 60000) / 1000)
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

function escape(s: string): string {
  return s.replace(/'/g, "''")
}

function d1Url(path: string): string {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID ?? ''
  return `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${D1_DATABASE_ID}${path}`
}

function d1Headers(): Record<string, string> {
  return {
    'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN ?? ''}`,
    'Content-Type': 'application/json',
  }
}

// ---------------------------------------------------------------------------
// DB helpers — direct REST API, no wrangler CLI
// ---------------------------------------------------------------------------

async function fetchExistingState(config: PuzzleConfig): Promise<{ existingSolutions: Set<string>, maxCode: number | null }> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const apiToken  = process.env.CLOUDFLARE_API_TOKEN

  if (!accountId || !apiToken) {
    console.warn('⚠️  Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN — starting with empty state')
    return { existingSolutions: new Set(), maxCode: null }
  }

  const res = await fetch(d1Url('/query'), {
    method: 'POST',
    headers: d1Headers(),
    body: JSON.stringify({ sql: `SELECT solution, code FROM puzzles WHERE grid_size = ${config.size} AND stars = ${config.starsPerUnit}` }),
  })

  if (!res.ok) {
    console.warn(`⚠️  Failed to fetch existing puzzles: ${res.status} ${res.statusText}`)
    return { existingSolutions: new Set(), maxCode: null }
  }

  const data = await res.json() as any
  const rows: { solution: string, code: number | null }[] = data.result?.[0]?.results ?? []
  const existingSolutions = new Set<string>(rows.map(r => r.solution))
  const maxCode = rows.reduce((max, r) => r.code != null && r.code > max ? r.code : max, 0) || null
  console.log(`  Found ${existingSolutions.size} existing ${config.size}×${config.size} ${config.starsPerUnit}★ puzzles. Highest code: ${maxCode ?? 'none'}.`)
  return { existingSolutions, maxCode }
}

interface PuzzleRow {
  id: string
  gridSize: number
  stars: number
  regions: string
  solution: string
  code: number
  createdAt: string
}

async function uploadBatch(batch: PuzzleRow[], batchIndex: number, totalBatches: number, retries = 3): Promise<void> {
  const values = batch.map(r =>
    `('${r.id}', ${r.gridSize}, ${r.stars}, '${r.regions}', '${r.solution}', ${r.code}, '${r.createdAt}')`
  ).join(',\n')
  const sql = `INSERT OR IGNORE INTO puzzles (id, grid_size, stars, regions, solution, code, created_at) VALUES\n${values}`

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(d1Url('/query'), {
        method: 'POST',
        headers: d1Headers(),
        body: JSON.stringify({ sql }),
      })
      const data = await res.json() as any
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${JSON.stringify(data)}`)
      console.log(`  Batch ${batchIndex}/${totalBatches} uploaded (${batch.length} rows)`)
      return
    } catch (err) {
      const cause = (err as any)?.cause
      const detail = cause ? ` (cause: ${cause})` : ''
      if (attempt === retries) throw new Error(`D1 upload failed (batch ${batchIndex}) after ${retries} attempts: ${err}${detail}`)
      const delay = 2000 * attempt
      console.warn(`  Batch ${batchIndex}/${totalBatches} attempt ${attempt} failed (${err}${detail}), retrying in ${delay / 1000}s...`)
      await new Promise(r => setTimeout(r, delay))
    }
  }
}

async function uploadRows(rows: PuzzleRow[], batchSize = 50): Promise<void> {
  const totalBatches = Math.ceil(rows.length / batchSize)
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    await uploadBatch(batch, Math.floor(i / batchSize) + 1, totalBatches)
  }
}

// ---------------------------------------------------------------------------
// Batch generation
// ---------------------------------------------------------------------------

interface BatchStats {
  label: string
  attempts: number
  generated: number
  duplicates: number
  inserted: number
  elapsedMs: number
}

async function generateBatch(
  config: PuzzleConfig,
  seconds: number,
  nextCode: { value: number },
  existingSolutions: Set<string>
): Promise<{ rows: PuzzleRow[], stats: BatchStats }> {
  const { size, starsPerUnit: stars } = config
  const label = `${size}×${size} ${stars}★`
  const rows: PuzzleRow[] = []
  const start = Date.now()
  const deadline = start + seconds * 1000
  const puzzleTimes: number[] = []
  let attempts = 0
  let generated = 0
  let duplicates = 0

  const originalLog = console.log
  console.log = () => {}

  while (Date.now() < deadline) {
    const puzzleStart = Date.now()
    attempts++
    const { puzzle } = generatePuzzleV2(config)
    if (!puzzle) continue

    generated++
    const solutionKey = JSON.stringify(puzzle.solution)
    if (existingSolutions.has(solutionKey)) {
      duplicates++
      continue
    }

    puzzleTimes.push(Date.now() - puzzleStart)
    existingSolutions.add(solutionKey)

    rows.push({
      id: crypto.randomUUID(),
      gridSize: puzzle.gridSize,
      stars: puzzle.stars,
      regions: escape(JSON.stringify(puzzle.regions)),
      solution: escape(solutionKey),
      code: nextCode.value++,
      createdAt: new Date().toISOString(),
    })

    const remaining = Math.max(0, deadline - Date.now())
    process.stdout.write(`\r  ${label}  ${rows.length} found  ${formatElapsed(Date.now() - start)} elapsed  ${formatElapsed(remaining)} remaining`)
  }

  console.log = originalLog

  const elapsedMs = Date.now() - start

  if (puzzleTimes.length > 0) {
    const avg = Math.round(puzzleTimes.reduce((a, b) => a + b, 0) / puzzleTimes.length)
    const min = Math.min(...puzzleTimes)
    const max = Math.max(...puzzleTimes)
    process.stdout.write(`\r  ${label}  ${rows.length} new  ${formatElapsed(elapsedMs)}  ✓  (avg ${formatElapsed(avg)}  min ${formatElapsed(min)}  max ${formatElapsed(max)})\n`)
  } else {
    process.stdout.write(`\r  ${label}  0 found  ${formatElapsed(elapsedMs)}  ✓\n`)
  }

  return {
    rows,
    stats: { label, attempts, generated, duplicates, inserted: rows.length, elapsedMs },
  }
}

// ---------------------------------------------------------------------------
// Email report
// ---------------------------------------------------------------------------

interface RunStats {
  date: string
  configStats: BatchStats[]
  totalInserted: number
  uploadedToDb: number
}

async function sendEmail(runStats: RunStats): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const to = process.env.RESEND_TO
  if (!apiKey || !to) return

  const tableRows = runStats.configStats.map(s => `
    <tr>
      <td style="padding:6px 12px">${s.label}</td>
      <td style="padding:6px 12px;text-align:right">${s.attempts}</td>
      <td style="padding:6px 12px;text-align:right">${s.generated}</td>
      <td style="padding:6px 12px;text-align:right">${s.duplicates}</td>
      <td style="padding:6px 12px;text-align:right"><strong>${s.inserted}</strong></td>
      <td style="padding:6px 12px;text-align:right">${formatElapsed(s.elapsedMs)}</td>
    </tr>`).join('')

  const html = `
    <p style="font-family:monospace;color:#555">Run: ${runStats.date}</p>
    <table style="border-collapse:collapse;font-family:monospace;font-size:14px">
      <thead>
        <tr style="background:#f0f0f0">
          <th style="padding:6px 12px;text-align:left">Config</th>
          <th style="padding:6px 12px">Attempts</th>
          <th style="padding:6px 12px">Generated</th>
          <th style="padding:6px 12px">Duplicates</th>
          <th style="padding:6px 12px">Inserted</th>
          <th style="padding:6px 12px">Time</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>
    <p style="font-family:monospace;margin-top:16px">
      <strong>Total inserted into DB: ${runStats.uploadedToDb}</strong>
    </p>`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Queens <noreply@knittedmice.com>',
      to: [to],
      subject: `Queens seed — ${runStats.uploadedToDb} new puzzles (${runStats.date})`,
      html,
    }),
  })

  if (res.ok) {
    console.log('Email sent.')
  } else {
    console.error(`Email failed: ${await res.text()}`)
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function run() {
  const args = parseArgs()

  let seconds: number
  let selectedConfigs: PuzzleConfig[]

  if (args.yes) {
    seconds = args.seconds ?? 60
    selectedConfigs = args.configs
    console.log(`Non-interactive: ${seconds}s per type — ${selectedConfigs.map(c => `${c.size}×${c.size} ${c.starsPerUnit}★`).join(', ')}`)
    console.log(`Estimated total: ~${formatElapsed(seconds * selectedConfigs.length * 1000)}\n`)
  } else {
    const timeInput = await prompt('\nHow many seconds to generate per type? (default 60): ')
    seconds = timeInput === '' ? 60 : parseInt(timeInput, 10)

    if (isNaN(seconds) || seconds < 1) {
      closePrompt()
      console.error('Invalid number.')
      process.exit(1)
    }

    console.log()
    selectedConfigs = []
    for (const config of args.configs) {
      const label = `${config.size}×${config.size} ${config.starsPerUnit}★`
      const answer = await prompt(`Run ${label}? (y/n): `)
      if (answer.toLowerCase() === 'y') selectedConfigs.push(config)
    }

    closePrompt()

    if (selectedConfigs.length === 0) {
      console.log('Nothing selected.')
      process.exit(0)
    }

    console.log('\n--- Plan ---')
    console.log(`Time per type:  ${seconds}s`)
    console.log(`Types:          ${selectedConfigs.map(c => `${c.size}×${c.size} ${c.starsPerUnit}★`).join(', ')}`)
    console.log(`Total time:     ~${formatElapsed(seconds * selectedConfigs.length * 1000)}`)
    console.log('------------\n')
  }

  const allRows: PuzzleRow[] = []
  const configStats: BatchStats[] = []

  for (const config of selectedConfigs) {
    console.log(`Fetching existing ${config.size}×${config.size} ${config.starsPerUnit}★ puzzles from DB...`)
    const { existingSolutions, maxCode } = await fetchExistingState(config)
    const startCode = maxCode !== null ? maxCode + 1 : CODE_START_DEFAULT
    console.log(`  New codes will start from: ${startCode}`)
    const nextCode = { value: startCode }
    const { rows, stats } = await generateBatch(config, seconds, nextCode, existingSolutions)
    allRows.push(...rows)
    configStats.push(stats)
  }

  if (allRows.length === 0) {
    console.log('\nNothing new to upload.')
    await sendEmail({ date: new Date().toISOString(), configStats, totalInserted: 0, uploadedToDb: 0 })
    return
  }

  console.log(`\nUploading ${allRows.length} new puzzles to D1...`)

  try {
    await uploadRows(allRows)
    console.log(`Done. ${allRows.length} puzzles inserted.`)
  } catch (err) {
    console.error(`\nUpload failed: ${err}`)
    throw err
  }

  await sendEmail({
    date: new Date().toISOString(),
    configStats,
    totalInserted: allRows.length,
    uploadedToDb: allRows.length,
  })
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
