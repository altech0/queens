import { PuzzleConfig } from '../../types/puzzleConfig'

/**
 * Returns `true` if the given region grid has exactly one valid k-star placement.
 *
 * Uses the same backtracking structure as the solver but counts solutions up to 2,
 * stopping as soon as a second is found. Column and region constraints use count-based
 * tracking (Map<id, count>) to support k > 1.
 */
export function hasUniqueSolutionV2(regions: number[][], config: PuzzleConfig): boolean {
  const { size, starsPerUnit: k } = config
  let solutionCount = 0

  function getValidCombos(row: number, prevStars: number[], colCount: number[], regionCount: number[]): number[][] {
    const banned = new Set<number>()
    for (const ps of prevStars) {
      if (ps - 1 >= 0) banned.add(ps - 1)
      banned.add(ps)
      if (ps + 1 < size) banned.add(ps + 1)
    }

    const available = [...Array(size).keys()].filter(c =>
      colCount[c] < k && !banned.has(c)
    )

    if (k === 1) return available.map(c => [c])

    const pairs: number[][] = []
    for (let i = 0; i < available.length; i++) {
      for (let j = i + 1; j < available.length; j++) {
        if (Math.abs(available[i] - available[j]) <= 1) continue
        pairs.push([available[i], available[j]])
      }
    }
    return pairs
  }

  function solve(row: number, prevStars: number[], colCount: number[], regionCount: number[]): void {
    if (solutionCount > 1) return
    if (row === size) { solutionCount++; return }

    for (const combo of getValidCombos(row, prevStars, colCount, regionCount)) {
      const delta = new Map<number, number>()
      let ok = true
      for (const c of combo) {
        const reg = regions[row][c]
        const d = (delta.get(reg) ?? 0) + 1
        delta.set(reg, d)
        if (regionCount[reg] + d > k) { ok = false; break }
      }
      if (!ok) continue

      combo.forEach(c => colCount[c]++)
      combo.forEach(c => regionCount[regions[row][c]]++)

      solve(row + 1, combo, colCount, regionCount)

      combo.forEach(c => colCount[c]--)
      combo.forEach(c => regionCount[regions[row][c]]--)
    }
  }

  solve(0, [], new Array(size).fill(0), new Array(size).fill(0))
  return solutionCount === 1
}
