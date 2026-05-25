import { PuzzleConfig } from '../../types/puzzleConfig'

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}


/**
 * Finds a random valid k-star placement for the given region layout using backtracking.
 *
 * Constraints per row:
 * - Exactly k stars placed
 * - No star in a column that already has k stars
 * - No star adjacent (kings-move) to any star in the previous row
 *   (only previous row needs checking since |row_diff| ≥ 2 can never be adjacent)
 * - No star adjacent to another star within the same row (for k ≥ 2)
 * - No star in a region that already has k stars
 *
 * Returns an array of length N where each entry is a sorted array of k column indices,
 * or `null` if no valid placement exists.
 */
export function solveStars(regions: number[][], config: PuzzleConfig): number[][] | null {
  const { size, starsPerUnit: k } = config
  const colCount = new Array(size).fill(0)
  const regionCount = new Array(size).fill(0)
  const solution: number[][] = []

  function validCombos(row: number, prevStars: number[]): number[][] {
    // Build the set of columns banned by adjacency with previous row
    const banned = new Set<number>()
    for (const ps of prevStars) {
      if (ps - 1 >= 0) banned.add(ps - 1)
      banned.add(ps)
      if (ps + 1 < size) banned.add(ps + 1)
    }

    // Columns still available (not full, not banned by prev row)
    const available = shuffle([...Array(size).keys()].filter(c =>
      colCount[c] < k && !banned.has(c)
    ))

    if (k === 1) return available.map(c => [c])

    // k=2: enumerate all valid pairs from available columns
    const pairs: number[][] = []
    for (let i = 0; i < available.length; i++) {
      for (let j = i + 1; j < available.length; j++) {
        // Ensure pair is sorted ascending; skip if adjacent within the row
        const c1 = Math.min(available[i], available[j])
        const c2 = Math.max(available[i], available[j])
        if (c2 - c1 <= 1) continue
        pairs.push([c1, c2])
      }
    }
    return shuffle(pairs)
  }

  function backtrack(row: number): boolean {
    if (row === size) return true
    const prevStars = row > 0 ? solution[row - 1] : []

    for (const combo of validCombos(row, prevStars)) {
      // Check region capacity, accounting for two stars potentially sharing a region
      const delta = new Map<number, number>()
      let ok = true
      for (const c of combo) {
        const reg = regions[row][c]
        const d = (delta.get(reg) ?? 0) + 1
        delta.set(reg, d)
        if (regionCount[reg] + d > k) { ok = false; break }
      }
      if (!ok) continue

      // Place
      combo.forEach(c => colCount[c]++)
      combo.forEach(c => regionCount[regions[row][c]]++)
      solution.push(combo)

      if (backtrack(row + 1)) return true

      // Unplace
      solution.pop()
      combo.forEach(c => colCount[c]--)
      combo.forEach(c => regionCount[regions[row][c]]--)
    }

    return false
  }

  return backtrack(0) ? solution : null
}
