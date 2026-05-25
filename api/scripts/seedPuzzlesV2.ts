/**
 * Generates puzzles for each valid v2 size/star combination and uploads
 * them to the deployed D1 database via `wrangler d1 execute --remote`.
 *
 * Fetches existing solutions from the DB at startup and checks locally
 * before inserting, so only genuinely new puzzles hit the DB.
 *
 * Combos: stars=1 × sizes [5,6,8] | stars=2 × sizes [8,10]
 *
 * Usage: npx tsx scripts/seedPuzzlesV2.ts
 */

import { execSync } from 'child_process'
import { writeFileSync, unlinkSync } from 'fs'
import { createInterface } from 'readline'
import { tmpdir } from 'os'
import { join } from 'path'
import { generatePuzzleV2 } from '../src/generator/v2'
import type { PuzzleConfig } from '../src/types/puzzleConfig'

const ALL_CONFIGS: PuzzleConfig[] = [
  { size: 5,  starsPerUnit: 1 },
  { size: 6,  starsPerUnit: 1 },
  { size: 8,  starsPerUnit: 1 },
  { size: 8,  starsPerUnit: 2 },
  { size: 10, starsPerUnit: 2 },
]

function parseArgs(): PuzzleConfig[] {
  const args = process.argv.slice(2)
  const sizeIdx = args.indexOf('--size')
  const starsIdx = args.indexOf('--stars')
  const size = sizeIdx !== -1 ? Number(args[sizeIdx + 1]) : null
  const stars = starsIdx !== -1 ? Number(args[starsIdx + 1]) : null

  if (size !== null || stars !== null) {
    const filtered = ALL_CONFIGS.filter(c =>
      (size === null || c.size === size) &&
      (stars === null || c.starsPerUnit === stars)
    )
    if (filtered.length === 0) {
      console.error(`No valid config for size=${size ?? 'any'} stars=${stars ?? 'any'}`)
      console.error(`Valid combos: ${ALL_CONFIGS.map(c => `size=${c.size} stars=${c.starsPerUnit}`).join(', ')}`)
      process.exit(1)
    }
    return filtered
  }

  return ALL_CONFIGS
}

const CONFIGS = parseArgs()

const CODE_START_DEFAULT = 10001

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

function formatElapsed(ms: number): string {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`
}

function escape(s: string): string {
  return s.replace(/'/g, "''")
}

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

async function generateBatch(
  config: PuzzleConfig,
  seconds: number,
  nextCode: { value: number },
  existingSolutions: Set<string>
): Promise<string[]> {
  const { size, starsPerUnit: stars } = config
  const label = `${size}×${size} ${stars}★`
  const inserts: string[] = []
  const start = Date.now()
  const deadline = start + seconds * 1000
  const puzzleTimes: number[] = []

  const originalLog = console.log
  console.log = () => {}

  while (Date.now() < deadline) {
    const puzzleStart = Date.now()
    const { puzzle } = generatePuzzleV2(config)
    if (!puzzle) continue

    const solutionKey = JSON.stringify(puzzle.solution)
    if (existingSolutions.has(solutionKey)) continue

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

  if (puzzleTimes.length > 0) {
    const avg = Math.round(puzzleTimes.reduce((a, b) => a + b, 0) / puzzleTimes.length)
    const min = Math.min(...puzzleTimes)
    const max = Math.max(...puzzleTimes)
    process.stdout.write(`\r  ${label}  ${inserts.length} found  ${formatElapsed(Date.now() - start)}  ✓  (avg ${formatElapsed(avg)}  min ${formatElapsed(min)}  max ${formatElapsed(max)})\n`)
  } else {
    process.stdout.write(`\r  ${label}  0 found  ${formatElapsed(seconds * 1000)}  ✓\n`)
  }

  return inserts
}

async function run() {
  console.log('Fetching existing puzzles from remote DB...')
  const { existingSolutions, maxCode } = fetchExistingState()
  console.log(`Found ${existingSolutions.size} existing puzzles. Highest code: ${maxCode ?? 'none'}.`)

  const startCode = maxCode !== null ? maxCode + 1 : CODE_START_DEFAULT
  console.log(`New codes will start from: ${startCode}`)

  const timeInput = await prompt('\nHow many seconds to generate per type? (default 60): ')
  const seconds = timeInput === '' ? 60 : parseInt(timeInput, 10)

  if (isNaN(seconds) || seconds < 1) {
    closePrompt()
    console.error('Invalid number.')
    process.exit(1)
  }

  console.log()
  const selectedConfigs: PuzzleConfig[] = []
  for (const config of CONFIGS) {
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
  console.log(`Total time:     ~${seconds * selectedConfigs.length}s`)
  console.log('------------\n')

  const nextCode = { value: startCode }
  const allInserts: string[] = []

  for (const config of selectedConfigs) {
    const inserts = await generateBatch(config, seconds, nextCode, existingSolutions)
    allInserts.push(...inserts)
  }

  if (allInserts.length === 0) {
    console.log('\nNothing new to upload.')
    return
  }

  console.log(`\nUploading ${allInserts.length} puzzles to deployed D1...`)

  const sql = allInserts.join('\n')
  const tmpFile = join(tmpdir(), `queens_seed_${Date.now()}.sql`)

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
      const rowsWritten = parsed?.[0]?.meta?.rows_written ?? '?'
      const ignored = allInserts.length - Number(rowsWritten)
      console.log(`Inserted: ${rowsWritten}  Ignored (duplicates): ${ignored}`)
    } else {
      console.log(`Uploaded ${allInserts.length} puzzles (could not parse response).`)
    }
    console.log('Done.')
    unlinkSync(tmpFile)
  } catch (err) {
    console.error(`\nUpload failed. SQL file preserved at: ${tmpFile}`)
    console.error(`Retry with: npx wrangler d1 execute queens --remote --file "${tmpFile}"`)
    throw err
  }
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
