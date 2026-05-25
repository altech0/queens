'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Sidebar from '@/components/Sidebar'
import PuzzleGrid from '@/components/PuzzleGrid'
import type { Puzzle, CellState } from '@/lib/types'
import { fetchPuzzle } from '@/lib/api'
import { validate } from '@/lib/validator'

const CONFIGS: Record<number, number> = { 6: 1, 8: 1, 10: 2 }

export default function Home() {
  const [size, setSize]                    = useState(8)
  const [puzzle, setPuzzle]                = useState<Puzzle | null>(null)
  const [cells, setCells]                  = useState<CellState[][]>([])
  const [conflicts, setConflicts]          = useState<Set<string>>(new Set())
  const [completed, setCompleted]          = useState(false)
  const [loading, setLoading]              = useState(false)
  const [error, setError]                  = useState<string | null>(null)
  const [elapsed, setElapsed]              = useState(0)
  const [hideTimer, setHideTimer]          = useState(false)
  const [highlightConflicts, setHighlight] = useState(true)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startRef = useRef<number>(0)

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
  }, [])

  const loadPuzzle = useCallback(async (gridSize: number) => {
    setLoading(true)
    setError(null)
    stopTimer()
    setCells([])
    setPuzzle(null)
    setCompleted(false)
    setElapsed(0)
    setConflicts(new Set())
    try {
      const p = await fetchPuzzle(gridSize, CONFIGS[gridSize])
      setPuzzle(p)
      setCells(Array.from({ length: p.gridSize }, () => Array(p.gridSize).fill('empty')))
      startRef.current = Date.now()
      timerRef.current = setInterval(() => {
        setElapsed(Date.now() - startRef.current)
      }, 100)
    } catch {
      setError('Failed to load puzzle. Check your connection.')
    } finally {
      setLoading(false)
    }
  }, [stopTimer])

  useEffect(() => {
    loadPuzzle(8)
    return () => stopTimer()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCellClick = useCallback((row: number, col: number) => {
    if (!puzzle || completed) return
    setCells(prev => {
      const next = prev.map(r => [...r])
      const cur = next[row][col]
      next[row][col] = cur === 'empty' ? 'x' : cur === 'x' ? 'star' : 'empty'
      const { result, conflicts: c } = validate(next, puzzle)
      setConflicts(c)
      if (result === 'valid') {
        stopTimer()
        setCompleted(true)
      }
      return next
    })
  }, [puzzle, completed, stopTimer])

  const handleSizeChange = (s: number) => {
    setSize(s)
    loadPuzzle(s)
  }

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside
        className="w-72 shrink-0 h-full"
        style={{ background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(12px)' }}
      >
        <Sidebar
          size={size}
          stars={CONFIGS[size]}
          onSizeChange={handleSizeChange}
          onNewGame={() => loadPuzzle(size)}
          elapsed={elapsed}
          hideTimer={hideTimer}
          onToggleHideTimer={() => setHideTimer(v => !v)}
          highlightConflicts={highlightConflicts}
          onToggleHighlightConflicts={() => setHighlight(v => !v)}
          loading={loading}
          completed={completed}
        />
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
        {error && (
          <p className="text-sm" style={{ color: '#c0392b' }}>{error}</p>
        )}

        {loading && (
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-8 h-8 rounded-full border-2 animate-spin"
              style={{ borderColor: '#728bc0', borderTopColor: 'transparent' }}
            />
            <p className="text-sm" style={{ color: 'var(--text-mid)' }}>Loading puzzle…</p>
          </div>
        )}

        {puzzle && !loading && (
          <>
            {completed && (
              <div className="text-center">
                <p className="text-3xl font-semibold mb-1" style={{ color: '#5a73a8' }}>
                  Solved! ★
                </p>
                <p className="text-sm" style={{ color: 'var(--text-mid)' }}>
                  Click Next Puzzle to keep going
                </p>
              </div>
            )}

            <PuzzleGrid
              puzzle={puzzle}
              cells={cells}
              conflicts={conflicts}
              highlightConflicts={highlightConflicts}
              onCellClick={handleCellClick}
              completed={completed}
            />

            <p className="text-xs" style={{ color: 'var(--text-light)' }}>
              Puzzle #{puzzle.code} · {puzzle.gridSize}×{puzzle.gridSize}
            </p>
          </>
        )}
      </main>
    </div>
  )
}
