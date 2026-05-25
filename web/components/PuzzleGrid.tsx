'use client'

import { useEffect, useRef } from 'react'
import type { Puzzle, CellState } from '@/lib/types'
import { regionColor } from '@/lib/colors'

interface PuzzleGridProps {
  puzzle: Puzzle
  cells: CellState[][]
  conflicts: Set<string>
  highlightConflicts: boolean
  enhancedContrast: boolean
  onCellClick: (row: number, col: number) => void
  completed: boolean
}

export default function PuzzleGrid({
  puzzle, cells, conflicts, highlightConflicts, enhancedContrast, onCellClick, completed
}: PuzzleGridProps) {
  const size = puzzle.gridSize
  const containerRef = useRef<HTMLDivElement>(null)

  // Compute border between cells to show region boundaries
  function borderStyle(row: number, col: number) {
    const reg = puzzle.regions[row][col]
    const top    = row > 0        && puzzle.regions[row - 1][col] !== reg
    const left   = col > 0        && puzzle.regions[row][col - 1] !== reg
    const bottom = row < size - 1 && puzzle.regions[row + 1][col] !== reg
    const right  = col < size - 1 && puzzle.regions[row][col + 1] !== reg

    return {
      borderTopWidth:    top    ? 2 : 1,
      borderLeftWidth:   left   ? 2 : 1,
      borderBottomWidth: bottom ? 2 : 1,
      borderRightWidth:  right  ? 2 : 1,
      borderTopColor:    top    ? 'rgba(100,110,140,0.5)' : 'rgba(180,185,200,0.4)',
      borderLeftColor:   left   ? 'rgba(100,110,140,0.5)' : 'rgba(180,185,200,0.4)',
      borderBottomColor: bottom ? 'rgba(100,110,140,0.5)' : 'rgba(180,185,200,0.4)',
      borderRightColor:  right  ? 'rgba(100,110,140,0.5)' : 'rgba(180,185,200,0.4)',
    }
  }

  return (
    <div
      ref={containerRef}
      className="inline-block rounded-2xl overflow-hidden shadow-lg"
      style={{ border: '2px solid rgba(100,110,140,0.3)' }}
    >
      {Array.from({ length: size }, (_, row) => (
        <div key={row} className="flex">
          {Array.from({ length: size }, (_, col) => {
            const state = cells[row][col]
            const isConflict = conflicts.has(`${row},${col}`)
            const base = regionColor(puzzle.regions[row][col], enhancedContrast)

            let bg = base
            if (highlightConflicts && isConflict && state === 'star') {
              bg = 'rgba(235, 51, 39, 0.35)'
            }
            if (completed && state === 'star') {
              bg = 'rgba(114, 139, 192, 0.35)'
            }

            return (
              <div
                key={col}
                onClick={() => onCellClick(row, col)}
                className="flex items-center justify-center cursor-pointer select-none transition-all duration-100 hover:brightness-95 active:scale-95"
                style={{
                  width: `calc(min(100vw - 22rem, 100vh - 18rem) / ${size})`,
                  height: `calc(min(100vw - 22rem, 100vh - 18rem) / ${size})`,
                  background: bg,
                  borderStyle: 'solid',
                  ...borderStyle(row, col),
                }}
              >
                {state === 'x' && (
                  <span
                    className="text-lg font-bold leading-none select-none"
                    style={{ color: 'rgba(80,90,120,0.55)', fontSize: `calc(min(100vw - 22rem, 100vh - 18rem) / ${size} * 0.45)` }}
                  >
                    ✕
                  </span>
                )}
                {state === 'star' && (
                  <span
                    className="leading-none select-none"
                    style={{
                      fontSize: `calc(min(100vw - 22rem, 100vh - 18rem) / ${size} * 0.5)`,
                      color: highlightConflicts && isConflict
                        ? 'rgba(210, 25, 20, 0.9)'
                        : completed
                        ? '#5a73a8'
                        : 'rgba(60,75,110,0.85)',
                    }}
                  >
                    ★
                  </span>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
