import type { Puzzle } from './types'

const CACHE_KEY = 'queens_puzzle_cache'
const MAX_SIZE = 30

export interface CachedPuzzle {
  id: string
  puzzle: Puzzle
  addedDate: string
  completionTime?: number
}

function load(): CachedPuzzle[] {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? '[]')
  } catch {
    return []
  }
}

function save(puzzles: CachedPuzzle[]) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(puzzles))
}

export function getCachedPuzzles(): CachedPuzzle[] {
  return load()
}

export function isCacheFull(): boolean {
  return load().length >= MAX_SIZE
}

export function addToCache(puzzle: Puzzle): boolean {
  const puzzles = load()
  if (puzzles.length >= MAX_SIZE) return false
  const alreadyExists = puzzles.some(c =>
    c.puzzle.code === puzzle.code ||
    (c.puzzle.gridSize === puzzle.gridSize && JSON.stringify(c.puzzle.regions) === JSON.stringify(puzzle.regions))
  )
  if (alreadyExists) return false
  puzzles.push({ id: String(puzzle.code ?? crypto.randomUUID()), puzzle, addedDate: new Date().toISOString() })
  save(puzzles)
  return true
}

export function removeFromCache(id: string) {
  save(load().filter(c => c.id !== id))
}

export function clearCache() {
  save([])
}

export function updateCacheCompletion(id: string, time: number) {
  const puzzles = load()
  const idx = puzzles.findIndex(c => c.id === id)
  if (idx === -1) return
  if (puzzles[idx].completionTime == null || time < puzzles[idx].completionTime!) {
    puzzles[idx].completionTime = time
    save(puzzles)
  }
}
