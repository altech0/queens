/**
 * Generates puzzles for each valid v2 size/star combination and uploads
 * them to the deployed D1 database via `wrangler d1 execute --remote`.
 *
 * Fetches existing solutions from the DB at startup and checks locally
 * before inserting, so only genuinely new puzzles hit the DB.
 *
 * Combos: stars=1 × sizes [5,6,8] | stars=2 × sizes [8,10]
 *
 * Usage:
 *   npx tsx scripts/seedPuzzlesV2.ts                        (interactive)
 *   npx tsx scripts/seedPuzzlesV2.ts --seconds 600 --yes    (CI / non-interactive)
 *   npx tsx scripts/seedPuzzlesV2.ts --size 6 --stars 1     (filter config)
 *
 * Email report (optional):
 *   Set RESEND_API_KEY and RESEND_TO env vars to receive a summary email.
 */

import { execSync } from 'child_process'
import { writeFileSync, unlinkSync } from 'fs'
import { createInterface } from 'readline'
import { tmpdir } from 'os'
import { join } from 'path'
import { generatePuzzleV2 } from '../src/generator/v2'
import type { PuzzleConfig } from '../src/types/puzzleConfig'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const ALL_CONFIGS: PuzzleConfig[] = [
  { size: 6,  starsPerUnit: 1 },
  { size: 8,  starsPerUnit: 1 },
  { size: 10, starsPerUnit: 2 },
]

const CODE_START_DEFAULT = 10001

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------

interface Args {
  configs: PuzzleConfig[]
  seconds: number | null  // seconds per config type (null = prompt)
  yes: boolean            // skip all interactive prompts
}

function parseArgs(): Args {
  const argv = process.argv.slice(2)

  const get = (flag: string) => {
    const i = argv.indexOf(flag)
    return i !== -1 ? argv[i + 1] : null
  }

  const size    = get('--size')  !== null ? Number(get('--size'))    : null
  const stars   = get('--stars') !== null ? Number(get('--stars'))   : null
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
// Readline helpers (only used in interactive mode)
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

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

function fetchExistingState(): { existingSolutions: Set<string>, maxCode: number | null } {
  try {
    const result = execSync(
      `npx wrangler d1 execute queens --remote --command "SELECT solution, code FROM puzzles" --json`,
      { cwd: process.cwd(), stdio: ['pipe', 'pipe', 'pipe'] }
    ).toString()
    const parsed = JSON.parse(result)
    const rows: { solution: string, code: number | null }[] = parsed?.[0]?.results ?? []
    const existingSolutions = new Set(rows.map(r => r.solution))
    const maxCode = rows.reduce((max, r) => r.code !== null && r.code > max ? r.code : max, 0) || null
    return { existingSolutions, maxCode }
  } catch {
    return { existingSolutions: new Set(), maxCode: null }
  }
}

// ---------------------------------------------------------------------------
// Batch generation
// ---------------------------------------------------------------------------

interface BatchStats {
  label: string
  attempts: number    // calls to generatePuzzleV2
  generated: number   // puzzle !== null (passed all generator checks)
  duplicates: number  // already existed in DB
  inserted: number    // new puzzles written to DB
  elapsedMs: number
}

async function generateBatch(
  config: PuzzleConfig,
  seconds: number,
  nextCode: { value: number },
  existingSolutions: Set<string>
): Promise<{ inserts: string[], stats: BatchStats }> {
  const { size, starsPerUnit: stars } = config
  const label = `${size}×${size} ${stars}★`
  const inserts: string[] = []
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

    const id = crypto.randomUUID()
    const createdAt = new Date().toISOString()
    const regions = escape(JSON.stringify(puzzle.regions))
    const solution = escape(solutionKey)
    const code = nextCode.value++

    inserts.push(
      `INSERT OR IGNORE INTO puzzles (id, grid_size, stars, regions, solution, code, created_at) ` +
      `VALUES ('${id}', ${puzzle.gridSize}, ${puzzle.stars}, '${regions}', '${solution}', ${code}, '${createdAt}');`
    )

    const remaining = Math.max(0, deadline - Date.now())
    process.stdout.write(`\r  ${label}  ${inserts.length} found  ${formatElapsed(Date.now() - start)} elapsed  ${formatElapsed(remaining)} remaining`)
  }

  console.log = originalLog

  const elapsedMs = Date.now() - start

  if (puzzleTimes.length > 0) {
    const avg = Math.round(puzzleTimes.reduce((a, b) => a + b, 0) / puzzleTimes.length)
    const min = Math.min(...puzzleTimes)
    const max = Math.max(...puzzleTimes)
    process.stdout.write(`\r  ${label}  ${inserts.length} new  ${formatElapsed(elapsedMs)}  ✓  (avg ${formatElapsed(avg)}  min ${formatElapsed(min)}  max ${formatElapsed(max)})\n`)
  } else {
    process.stdout.write(`\r  ${label}  0 found  ${formatElapsed(elapsedMs)}  ✓\n`)
  }

  return {
    inserts,
    stats: { label, attempts, generated, duplicates, inserted: inserts.length, elapsedMs },
  }
}

// ---------------------------------------------------------------------------
// Email report
// ---------------------------------------------------------------------------

interface RunStats {
  date: string
  configStats: BatchStats[]
  totalInserted: number
  uploadedToDb: number  // rows actually written (from D1 response)
}

async function sendEmail(runStats: RunStats): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const to = process.env.RESEND_TO
  if (!apiKey || !to) return

  const rows = runStats.configStats.map(s => `
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
      <tbody>${rows}</tbody>
    </table>
    <p style="font-family:monospace;margin-top:16px">
      <strong>Total inserted into DB: ${runStats.uploadedToDb}</strong>
    </p>`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
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

  console.log('Fetching existing puzzles from remote DB...')
  const { existingSolutions, maxCode } = fetchExistingState()
  console.log(`Found ${existingSolutions.size} existing puzzles. Highest code: ${maxCode ?? 'none'}.`)

  const startCode = maxCode !== null ? maxCode + 1 : CODE_START_DEFAULT
  console.log(`New codes will start from: ${startCode}`)

  let seconds: number
  let selectedConfigs: PuzzleConfig[]

  if (args.yes) {
    seconds = args.seconds ?? 60
    selectedConfigs = args.configs
    console.log(`\nNon-interactive: ${seconds}s per type — ${selectedConfigs.map(c => `${c.size}×${c.size} ${c.starsPerUnit}★`).join(', ')}`)
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

  const nextCode = { value: startCode }
  const allInserts: string[] = []
  const configStats: BatchStats[] = []

  for (const config of selectedConfigs) {
    const { inserts, stats } = await generateBatch(config, seconds, nextCode, existingSolutions)
    allInserts.push(...inserts)
    configStats.push(stats)
  }

  if (allInserts.length === 0) {
    console.log('\nNothing new to upload.')
    await sendEmail({ date: new Date().toISOString(), configStats, totalInserted: 0, uploadedToDb: 0 })
    return
  }

  console.log(`\nUploading ${allInserts.length} puzzles to deployed D1...`)

  const sql = allInserts.join('\n')
  const tmpFile = join(tmpdir(), `queens_seed_${Date.now()}.sql`)
  let uploadedToDb = 0

  writeFileSync(tmpFile, sql, 'utf8')
  try {
    const output = execSync(
      `npx wrangler d1 execute queens --remote --file "${tmpFile}" --json`,
      { cwd: process.cwd(), stdio: ['pipe', 'pipe', 'pipe'] }
    ).toString()
    const jsonStart = output.indexOf('[')
    const jsonEnd = output.lastIndexOf(']')
    if (jsonStart !== -1 && jsonEnd !== -1) {
      const parsed = JSON.parse(output.slice(jsonStart, jsonEnd + 1))
      uploadedToDb = parsed?.[0]?.meta?.rows_written ?? allInserts.length
      const ignored = allInserts.length - uploadedToDb
      console.log(`Inserted: ${uploadedToDb}  Ignored (duplicates): ${ignored}`)
    } else {
      uploadedToDb = allInserts.length
      console.log(`Uploaded ${allInserts.length} puzzles (could not parse response).`)
    }
    console.log('Done.')
    unlinkSync(tmpFile)
  } catch (err) {
    console.error(`\nUpload failed. SQL file preserved at: ${tmpFile}`)
    console.error(`Retry with: npx wrangler d1 execute queens --remote --file "${tmpFile}"`)
    throw err
  }

  await sendEmail({
    date: new Date().toISOString(),
    configStats,
    totalInserted: allInserts.length,
    uploadedToDb,
  })
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
