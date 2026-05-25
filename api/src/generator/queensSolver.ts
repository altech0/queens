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
 * Finds a random valid queen placement for an N×N grid using backtracking.
 * Each queen must be in a unique row, unique column, and not touching any
 * other queen — including diagonally (kings-move adjacency).
 *
 * @returns An array of length N where `solution[row]` is the column of the
 *   queen in that row, or `null` if no placement exists.
 */
export function placeQueens(config: PuzzleConfig): number[] | null {
  const { size } = config
  const solution: number[] = []

  /** Returns true if two cells are adjacent (including diagonally). */
  function touches(r1: number, c1: number, r2: number, c2: number): boolean {
    return Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1
  }

  /** Recursively tries placing a queen in each column of `row`. */
  function backtrack(row: number): boolean {
    if (row === size) return true
    const cols = shuffle([...Array(size).keys()])
    for (const col of cols) {
      if (solution.some((c, r) => c === col || touches(r, c, row, col))) continue
      solution.push(col)
      if (backtrack(row + 1)) return true
      solution.pop()
    }
    return false
  }

  return backtrack(0) ? solution : null
}
