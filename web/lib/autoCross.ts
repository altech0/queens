import type { Puzzle, CellState } from './types'

/**
 * Rebuilds every automatic cross from the stars currently on the board.
 *
 * Recomputed wholesale rather than patched incrementally, because whether a
 * unit's row/column/region should be crossed depends on how many stars it holds
 * *now*. Placing the second star of a 2-star region and then removing the first
 * has to leave the board as if only one star had ever been placed, and deriving
 * the whole set each time is what makes that fall out for free instead of
 * needing its own case.
 *
 * Rules, per the setting:
 *  - every star rules out the eight cells touching it;
 *  - a row, column or region rules out its remaining cells once it holds all
 *    the stars it is allowed (so on a 1-star puzzle, immediately).
 *
 * Never touches a star or a cross the player placed by hand. Ported from
 * `refreshAutoCrosses()` in app/queens/GameView.swift — the two must agree.
 */
export function refreshAutoCrosses(
  cells: CellState[][],
  puzzle: Puzzle,
  enabled: boolean,
): CellState[][] {
  const size = puzzle.gridSize
  // Clear the previous derivation. Player marks and stars are left alone.
  const next = cells.map(row => row.map(c => (c === 'auto-x' ? 'empty' : c) as CellState))
  if (!enabled) return next

  const stars: [number, number][] = []
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) if (next[r][c] === 'star') stars.push([r, c])
  }
  if (!stars.length) return next

  const perUnit = puzzle.stars
  const implied = new Set<string>()

  // Adjacency: no two stars may touch, including diagonally.
  for (const [sr, sc] of stars) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue
        const r = sr + dr, c = sc + dc
        if (r >= 0 && r < size && c >= 0 && c < size) implied.add(`${r},${c}`)
      }
    }
  }

  // A full row/column/region rules out everything else in it.
  const inRow = new Map<number, number>()
  const inCol = new Map<number, number>()
  const inRegion = new Map<number, number>()
  for (const [r, c] of stars) {
    inRow.set(r, (inRow.get(r) ?? 0) + 1)
    inCol.set(c, (inCol.get(c) ?? 0) + 1)
    const reg = puzzle.regions[r][c]
    inRegion.set(reg, (inRegion.get(reg) ?? 0) + 1)
  }
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if ((inRow.get(r) ?? 0) >= perUnit
        || (inCol.get(c) ?? 0) >= perUnit
        || (inRegion.get(puzzle.regions[r][c]) ?? 0) >= perUnit) {
        implied.add(`${r},${c}`)
      }
    }
  }

  // Apply, yielding to anything the player put there.
  for (const key of implied) {
    const [r, c] = key.split(',').map(Number)
    if (next[r][c] === 'empty') next[r][c] = 'auto-x'
  }
  return next
}
