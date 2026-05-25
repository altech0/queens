import { generatePuzzleV2 } from '../src/generator/v2'
import { validatePuzzle } from '../src/generator/v2/validatePuzzle'
import type { PuzzleConfig } from '../src/types/puzzleConfig'

interface HarnessResult {
  successes: number
  totalAttempts: number
  successRate: string
  failedRegions: number
  failedSolve: number
  failedSymmetry: number
  failedUniqueness: number
  validationErrors: string[]
  avgAttemptsPerSuccess: number
  durationMs: number
}

async function runConfig(config: PuzzleConfig, target: number, timeLimitMs = 15000): Promise<HarnessResult> {
  const start = Date.now()
  let successes = 0
  let totalAttempts = 0
  let failedRegions = 0
  let failedSolve = 0
  let failedSymmetry = 0
  let failedUniqueness = 0
  const validationErrors: string[] = []

  while (successes < target && Date.now() - start < timeLimitMs) {
    const { puzzle, counters } = generatePuzzleV2(config)
    totalAttempts += counters.attempts
    failedRegions += counters.failedRegions
    failedSolve += counters.failedSolve
    failedSymmetry += counters.failedSymmetry
    failedUniqueness += counters.failedUniqueness

    if (puzzle) {
      successes++
      const vr = validatePuzzle(puzzle.gridSize, puzzle.stars, puzzle.regions, puzzle.solution)
      if (!vr.valid) {
        validationErrors.push(...vr.errors.map(e => `puzzle #${successes}: ${e}`))
      }
    }
  }

  return {
    successes,
    totalAttempts,
    successRate: totalAttempts > 0 ? `${((successes / totalAttempts) * 100).toFixed(1)}%` : '0%',
    failedRegions,
    failedSolve,
    failedSymmetry,
    failedUniqueness,
    validationErrors,
    avgAttemptsPerSuccess: successes > 0 ? totalAttempts / successes : totalAttempts,
    durationMs: Date.now() - start,
  }
}

function printResult(config: PuzzleConfig, result: HarnessResult) {
  console.log(`\n--- size=${config.size} stars=${config.starsPerUnit} ---`)
  console.log(`Successes:        ${result.successes}`)
  console.log(`Success rate:     ${result.successRate}`)
  console.log(`Failed regions:   ${result.failedRegions}`)
  console.log(`Failed solve:     ${result.failedSolve}`)
  console.log(`Failed symmetry:  ${result.failedSymmetry}`)
  console.log(`Failed unique:    ${result.failedUniqueness}`)
  console.log(`Avg attempts:     ${result.avgAttemptsPerSuccess.toFixed(1)}`)
  console.log(`Duration:         ${result.durationMs}ms`)
  if (result.validationErrors.length > 0) {
    console.log(`VALIDATION ERRORS:`)
    result.validationErrors.forEach(e => console.log(`  ✗ ${e}`))
  } else {
    console.log(`Validation:       all ${result.successes} puzzles valid`)
  }
}

async function run() {
  const configs: PuzzleConfig[] = [
    { size: 6,  starsPerUnit: 1 },
    { size: 8,  starsPerUnit: 1 },
    { size: 10, starsPerUnit: 1 },
    { size: 8,  starsPerUnit: 2 },
    { size: 10, starsPerUnit: 2 },
  ]

  console.log('Running V2 generator harness...')
  for (const config of configs) {
    const result = await runConfig(config, 30)
    printResult(config, result)
  }
}

run()
