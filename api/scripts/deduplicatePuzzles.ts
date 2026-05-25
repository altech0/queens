/**
 * Checks the remote D1 database for duplicate puzzles (by solution)
 * and optionally deletes them, keeping the lowest code in each group.
 *
 * Usage: npx tsx scripts/deduplicatePuzzles.ts
 */

import { execSync } from 'child_process'
import { createInterface } from 'readline'

interface PuzzleRow {
  code: number
  grid_size: number
  stars: number
  solution: string
}

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

function fetchAll(): PuzzleRow[] {
  const result = execSync(
    `npx wrangler d1 execute queens --remote --command "SELECT code, grid_size, stars, solution FROM puzzles ORDER BY code ASC" --json`,
    { cwd: process.cwd(), stdio: ['pipe', 'pipe', 'pipe'] }
  ).toString()
  const parsed = JSON.parse(result)
  return parsed?.[0]?.results ?? []
}

function deleteRows(codes: number[]) {
  const sql = codes.map(c => `DELETE FROM puzzles WHERE code = ${c};`).join('\n')
  const { writeFileSync, unlinkSync } = require('fs')
  const { join } = require('path')
  const { tmpdir } = require('os')
  const tmpFile = join(tmpdir(), `queens_dedup_${Date.now()}.sql`)
  writeFileSync(tmpFile, sql, 'utf8')
  try {
    execSync(`npx wrangler d1 execute queens --remote --file "${tmpFile}"`, {
      stdio: 'inherit',
      cwd: process.cwd(),
    })
  } finally {
    unlinkSync(tmpFile)
  }
}

function label(gridSize: number, stars: number) {
  return `${gridSize}×${gridSize} ${stars}★`
}

async function run() {
  console.log('Fetching all puzzles from remote DB...')
  const rows = fetchAll()
  console.log(`Fetched ${rows.length} puzzles.\n`)

  // Group duplicates by solution, bucket by type
  const bySolution = new Map<string, PuzzleRow[]>()
  for (const row of rows) {
    const key = row.solution
    if (!bySolution.has(key)) bySolution.set(key, [])
    bySolution.get(key)!.push(row)
  }

  const dupGroups = [...bySolution.values()].filter(g => g.length > 1)

  if (dupGroups.length === 0) {
    console.log('No duplicates found.')
    rl.close()
    return
  }

  // Summarise per type
  const byType = new Map<string, { groups: number, toDelete: number }>()
  const allToDelete: number[] = []

  for (const group of dupGroups) {
    const { grid_size, stars } = group[0]
    const key = label(grid_size, stars)
    const dupes = group.sort((a, b) => a.code - b.code).slice(1).map(r => r.code)
    allToDelete.push(...dupes)
    if (!byType.has(key)) byType.set(key, { groups: 0, toDelete: 0 })
    const entry = byType.get(key)!
    entry.groups++
    entry.toDelete += dupes.length
  }

  console.log('--- Duplicates found ---')
  for (const [type, { groups, toDelete }] of byType) {
    console.log(`  ${type}  ${groups} duplicate group${groups !== 1 ? 's' : ''}  ${toDelete} to delete`)
  }
  console.log(`  Total to delete: ${allToDelete.length} (${rows.length - allToDelete.length} will remain)`)
  console.log('------------------------\n')

  const answer = await prompt('Delete duplicates? (y/n): ')
  rl.close()

  if (answer.toLowerCase() !== 'y') {
    console.log('Aborted.')
    return
  }

  console.log(`\nDeleting ${allToDelete.length} puzzles...`)
  deleteRows(allToDelete)
  console.log('Done.')
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
