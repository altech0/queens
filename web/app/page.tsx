'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Sidebar from '@/components/Sidebar'
import PuzzleGrid from '@/components/PuzzleGrid'
import type { Puzzle, CellState } from '@/lib/types'
import { fetchPuzzle } from '@/lib/api'
import { validate } from '@/lib/validator'

const CONFIGS: Record<number, number> = { 6: 1, 8: 1, 10: 2 }

function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem('queens_settings') || '{}')
    return {
      hideTimer:          s.hideTimer          ?? false,
      highlightConflicts: s.highlightConflicts ?? true,
      singleTapMode:      s.singleTapMode      ?? false,
      enhancedContrast:   s.enhancedContrast   ?? false,
    }
  } catch {
    return { hideTimer: false, highlightConflicts: true, singleTapMode: false, enhancedContrast: false }
  }
}

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
  const [singleTapMode, setSingleTap]      = useState(false)
  const [enhancedContrast, setEnhanced]    = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startRef = useRef<number>(0)

  useEffect(() => {
    const s = loadSettings()
    setHideTimer(s.hideTimer)
    setHighlight(s.highlightConflicts)
    setSingleTap(s.singleTapMode)
    setEnhanced(s.enhancedContrast)
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('queens_settings', JSON.stringify(
        { hideTimer, highlightConflicts, singleTapMode, enhancedContrast }
      ))
    } catch {}
  }, [hideTimer, highlightConflicts, singleTapMode, enhancedContrast])

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
  }, [])

  useEffect(() => () => stopTimer(), [stopTimer])

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
      timerRef.current = setInterval(() => setElapsed(Date.now() - startRef.current), 100)
    } catch {
      setError('Failed to load puzzle. Check your connection.')
    } finally {
      setLoading(false)
    }
  }, [stopTimer])

  const handleCellClick = useCallback((row: number, col: number) => {
    if (!puzzle || completed) return
    setCells(prev => {
      const next = prev.map(r => [...r])
      const cur = next[row][col]
      next[row][col] = singleTapMode
        ? (cur === 'star' ? 'empty' : 'star')
        : (cur === 'empty' ? 'x' : cur === 'x' ? 'star' : 'empty')
      const { result, conflicts: c } = validate(next, puzzle)
      setConflicts(c)
      if (result === 'valid') {
        stopTimer()
        setCompleted(true)
      }
      return next
    })
  }, [puzzle, completed, singleTapMode, stopTimer])

  return (
    <div className="flex flex-col h-screen">

      {/* Header */}
      <header
        className="shrink-0 flex flex-col items-center justify-center gap-0.5"
        style={{
          height: 68,
          background: 'rgba(255,255,255,0.6)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--sidebar-border)',
        }}
      >
        <span className="leading-none" style={{ fontSize: 22, color: 'var(--primary)' }}>★</span>
        <h1 className="text-lg font-semibold tracking-tight leading-none" style={{ color: 'var(--text-dark)' }}>Queens</h1>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar */}
        <aside
          className="w-72 shrink-0 h-full overflow-y-auto"
          style={{ background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(12px)', borderRight: '1px solid var(--sidebar-border)' }}
        >
          <Sidebar
            size={size}
            onSizeChange={setSize}
            onNewGame={() => loadPuzzle(size)}
            elapsed={elapsed}
            hideTimer={hideTimer}
            onToggleHideTimer={() => setHideTimer(v => !v)}
            highlightConflicts={highlightConflicts}
            onToggleHighlightConflicts={() => setHighlight(v => !v)}
            singleTapMode={singleTapMode}
            onToggleSingleTap={() => setSingleTap(v => !v)}
            enhancedContrast={enhancedContrast}
            onToggleEnhancedContrast={() => setEnhanced(v => !v)}
            loading={loading}
            completed={completed}
            puzzleActive={puzzle !== null || loading}
          />
        </aside>

        {/* Main */}
        <main className="flex-1 flex flex-col items-center justify-center gap-5 p-8 overflow-auto">

          {error && <p className="text-sm" style={{ color: '#c0392b' }}>{error}</p>}

          {!puzzle && !loading && !error && (
            <span style={{ fontSize: 72, color: 'var(--primary)', opacity: 0.15 }}>★</span>
          )}

          {loading && (
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 animate-spin"
                style={{ borderColor: '#728bc0', borderTopColor: 'transparent' }} />
              <p className="text-sm" style={{ color: 'var(--text-mid)' }}>Loading puzzle…</p>
            </div>
          )}

          {puzzle && !loading && (
            <>
              <p className="text-sm font-medium" style={{ color: 'var(--text-mid)' }}>
                Puzzle #{puzzle.code} · {puzzle.gridSize}×{puzzle.gridSize} · {CONFIGS[puzzle.gridSize] === 1 ? '1 star' : '2 stars'} per region
              </p>

              <PuzzleGrid
                puzzle={puzzle}
                cells={cells}
                conflicts={conflicts}
                highlightConflicts={highlightConflicts}
                enhancedContrast={enhancedContrast}
                onCellClick={handleCellClick}
                completed={completed}
              />

              {completed && (
                <div className="text-center">
                  <p className="text-3xl font-semibold mb-1" style={{ color: '#5a73a8' }}>Solved! ★</p>
                  <p className="text-sm" style={{ color: 'var(--text-mid)' }}>Click Next Puzzle to keep going</p>
                </div>
              )}
            </>
          )}

        </main>
      </div>
    </div>
  )
}
