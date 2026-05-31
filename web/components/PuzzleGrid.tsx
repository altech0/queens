'use client'

import { useEffect, useRef } from 'react'
import type { Puzzle, CellState } from '@/lib/types'
import { regionColor } from '@/lib/colors'

interface PuzzleGridProps {
  puzzle: Puzzle
  cells: CellState[][]
  conflicts: Set<string>
  flashCells?: Set<string>
  highlightConflicts: boolean
  enhancedContrast: boolean
  darkMode?: boolean
  onCellClick: (row: number, col: number) => void
  completed: boolean
}

export default function PuzzleGrid({
  puzzle, cells, conflicts, flashCells = new Set(), highlightConflicts, enhancedContrast, darkMode = false, onCellClick, completed
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

    const darkEnhanced = darkMode && enhancedContrast
    const majorColor = darkMode ? (darkEnhanced ? 'rgba(255,255,255,0.65)' : 'rgba(180,160,120,0.9)') : 'rgba(100,110,140,0.5)'
    const majorWidth = darkEnhanced ? 2 : 1
    const minorColor = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(180,185,200,0.4)'
    const minorWidth = darkMode ? 1 : 1

    return {
      borderTopWidth:    top    ? majorWidth : minorWidth,
      borderLeftWidth:   left   ? majorWidth : minorWidth,
      borderBottomWidth: bottom ? majorWidth : minorWidth,
      borderRightWidth:  right  ? majorWidth : minorWidth,
      borderTopColor:    top    ? majorColor : minorColor,
      borderLeftColor:   left   ? majorColor : minorColor,
      borderBottomColor: bottom ? majorColor : minorColor,
      borderRightColor:  right  ? majorColor : minorColor,
    }
  }

  return (
    <div
      ref={containerRef}
      className="inline-block rounded-2xl overflow-hidden shadow-lg"
      style={{ border: darkMode && enhancedContrast ? '2px solid rgba(255,255,255,0.6)' : darkMode ? '1px solid rgba(180,160,120,0.8)' : '2px solid rgba(100,110,140,0.3)' }}
    >
      {Array.from({ length: size }, (_, row) => (
        <div key={row} className="flex">
          {Array.from({ length: size }, (_, col) => {
            const state = cells[row][col]
            const key = `${row},${col}`
            const isConflict = conflicts.has(key)
            const isFlash = flashCells.has(key)
            const base = regionColor(puzzle.regions[row][col], enhancedContrast, darkMode)

            let bg = base
            if (isFlash) {
              bg = 'rgba(235, 51, 39, 0.35)'
            } else if (highlightConflicts && isConflict && state === 'star') {
              bg = 'rgba(235, 51, 39, 0.35)'
            } else if (completed && state === 'star') {
              bg = 'rgba(114, 139, 192, 0.35)'
            }

            return (
              <div
                key={col}
                onClick={() => onCellClick(row, col)}
                className="puzzle-cell flex items-center justify-center cursor-pointer select-none transition-all duration-100 hover:brightness-95 active:scale-95"
                style={{
                  width: `calc(var(--grid-available) / ${size})`,
                  height: `calc(var(--grid-available) / ${size})`,
                  background: bg,
                  borderStyle: 'solid',
                  transition: 'background 0.15s',
                  ...borderStyle(row, col),
                }}
              >
                {state === 'x' && (
                  <span
                    className="text-lg font-bold leading-none select-none"
                    style={{ color: isFlash ? 'rgba(210,25,20,0.9)' : darkMode && enhancedContrast ? 'rgba(255,255,255,0.6)' : darkMode ? 'rgba(200,180,130,0.7)' : 'rgba(80,90,120,0.55)', fontSize: `calc(var(--grid-available) / ${size} * 0.32)` }}
                  >
                    ✕
                  </span>
                )}
                {state === 'star' && (
                  <span
                    className="leading-none select-none"
                    style={{
                      fontSize: `calc(var(--grid-available) / ${size} * 0.5)`,
                      color: isFlash || (highlightConflicts && isConflict)
                        ? 'rgba(210, 25, 20, 0.9)'
                        : completed
                        ? '#5a73a8'
                        : darkMode && enhancedContrast ? 'rgba(255,255,255,0.85)' : darkMode ? 'rgba(200,180,130,0.9)' : 'rgba(60,75,110,0.85)',
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
