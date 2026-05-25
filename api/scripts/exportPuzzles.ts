/**
 * Exports all puzzles from the remote D1 database to a JSON file.
 * Also checks for duplicates by code, regions, and solution.
 *
 * Usage: npx tsx scripts/exportPuzzles.ts
 */

import { execSync } from 'child_process'
import { writeFileSync } from 'fs'
import { join } from 'path'

interface PuzzleRow {
  id: string
  grid_size: number
  stars: number
  regions: string
  solution: string
  difficulty: string | null
  code: number | null
  created_at: string
}

function queryAll(): PuzzleRow[] {
  const result = execSync(
    `npx wrangler d1 execute queens --remote --command "SELECT * FROM puzzles ORDER BY code ASC" --json`,
    { cwd: process.cwd(), stdio: ['pipe', 'pipe', 'pipe'] }
  ).toString()
  const parsed = JSON.parse(result)
  return parsed?.[0]?.results ?? []
}

function checkDuplicates(rows: PuzzleRow[]) {
  const codes = new Map<number, number>()
  const regionHashes = new Map<string, number[]>()
  const solutionHashes = new Map<string, number[]>()

  for (const row of rows) {
    if (row.code !== null) {
      codes.set(row.code, (codes.get(row.code) ?? 0) + 1)
    }
    const rKey = row.regions
    regionHashes.set(rKey, [...(regionHashes.get(rKey) ?? []), row.code ?? -1])

    const sKey = row.solution
    solutionHashes.set(sKey, [...(solutionHashes.get(sKey) ?? []), row.code ?? -1])
  }

  const dupCodes = [...codes.entries()].filter(([, count]) => count > 1)
  const dupRegions = [...regionHashes.entries()].filter(([, codes]) => codes.length > 1)
  const dupSolutions = [...solutionHashes.entries()].filter(([, codes]) => codes.length > 1)

  return { dupCodes, dupRegions, dupSolutions }
}

function run() {
  console.log('Fetching all puzzles from remote D1...')
  const rows = queryAll()
  console.log(`Fetched ${rows.length} puzzles.`)

  const { dupCodes, dupRegions, dupSolutions } = checkDuplicates(rows)

  console.log('\n--- Duplicate check ---')
  if (dupCodes.length === 0 && dupRegions.length === 0 && dupSolutions.length === 0) {
    console.log('No duplicates found.')
  } else {
    if (dupCodes.length > 0) {
      console.log(`\nDuplicate codes (${dupCodes.length}):`)
      dupCodes.forEach(([code, count]) => console.log(`  code ${code} appears ${count}×`))
    }
    if (dupRegions.length > 0) {
      console.log(`\nDuplicate region layouts (${dupRegions.length}):`)
      dupRegions.forEach(([, codes]) => console.log(`  codes: ${codes.join(', ')}`))
    }
    if (dupSolutions.length > 0) {
      console.log(`\nDuplicate solutions (${dupSolutions.length}):`)
      dupSolutions.forEach(([, codes]) => console.log(`  codes: ${codes.join(', ')}`))
    }
  }

  const outPath = join(process.cwd(), 'puzzles_export.json')
  const parsed = rows.map(row => ({
    id: row.id,
    code: row.code,
    gridSize: row.grid_size,
    stars: row.stars,
    regions: JSON.parse(row.regions),
    solution: JSON.parse(row.solution),
    difficulty: row.difficulty,
    createdAt: row.created_at,
  }))

  writeFileSync(outPath, JSON.stringify(parsed, null, 2), 'utf8')
  console.log(`\nExported to ${outPath}`)
}

run()
