import { PuzzleConfig } from '../types/puzzleConfig'

/** Fisher-Yates shuffle. Mutates and returns the array. */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * Builds a random valid N-region partition of the N×N grid for the given
 * queen placement using a union-find merge approach.
 *
 * Algorithm:
 * 1. Every cell starts as its own singleton region (N² regions total).
 * 2. All adjacent cell pairs are shuffled randomly.
 * 3. Pairs are merged one by one, skipping any merge that would combine
 *    two queen-bearing regions (which would violate one-queen-per-region).
 * 4. Merging stops once exactly N regions remain.
 * 5. Region IDs are remapped so that the queen in row `r` is in region `r`.
 *
 * Returns `null` if the candidate pairs are exhausted before N regions are reached.
 *
 * @param solution - Array where `solution[row]` is the column of the queen in that row.
 * @returns An N×N grid of region IDs (0-indexed, matching queen row indices), or `null`.
 */
export function buildRegions(config: PuzzleConfig, solution: number[]): number[][] | null {
  const { size } = config
  const total = size * size

  // Every cell starts as its own singleton region (region ID = cell index)
  const grid: number[] = Array.from({ length: total }, (_, i) => i)
  const sizeOf: number[] = new Array(total).fill(1)
  let regionCount = total

  // All adjacent (horizontal + vertical) cell pairs, shuffled
  const pairs: [number, number][] = []
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (c + 1 < size) pairs.push([r * size + c, r * size + c + 1])
      if (r + 1 < size) pairs.push([r * size + c, (r + 1) * size + c])
    }
  }
  shuffle(pairs)

  // Track which canonical region IDs contain a queen cell
  const queenRegions = new Set<number>()
  for (let r = 0; r < size; r++) {
    queenRegions.add(r * size + solution[r])
  }

  let pairIdx = 0

  while (regionCount > size) {
    if (pairIdx >= pairs.length) {
      console.log(`[regionBuilder] stuck at ${regionCount} regions, needed ${size}`)
      return null
    }

    const [idxA, idxB] = pairs[pairIdx++]
    const regA = grid[idxA]
    const regB = grid[idxB]

    if (regA === regB) continue

    // Never merge two regions that both contain a queen — would violate one-queen-per-region
    if (queenRegions.has(regA) && queenRegions.has(regB)) continue

    // Merge smaller region into larger (keep the larger's ID as canonical)
    const keep = sizeOf[regA] >= sizeOf[regB] ? regA : regB
    const merge = keep === regA ? regB : regA

    for (let i = 0; i < total; i++) {
      if (grid[i] === merge) grid[i] = keep
    }
    sizeOf[keep] += sizeOf[merge]
    sizeOf[merge] = 0
    regionCount--

    // Propagate queen membership to the surviving canonical ID
    if (queenRegions.has(merge)) {
      queenRegions.add(keep)
      queenRegions.delete(merge)
    }
  }

  // Exactly `size` regions remain.
  // Remap canonical IDs so that queen in row r lives in region r.
  const remap = new Map<number, number>()
  for (let r = 0; r < size; r++) {
    remap.set(grid[r * size + solution[r]], r)
  }

  return Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => remap.get(grid[r * size + c])!)
  )
}
