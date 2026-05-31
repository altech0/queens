'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Sidebar from '@/components/Sidebar'
import PuzzleGrid from '@/components/PuzzleGrid'
import MobileSettings from '@/components/MobileSettings'
import type { Puzzle, CellState } from '@/lib/types'
import { fetchPuzzle, fetchPuzzleByCode } from '@/lib/api'
import {
  getCachedPuzzles, addToCache, removeFromCache, clearCache, isCacheFull,
  updateCacheCompletion, type CachedPuzzle,
} from '@/lib/puzzleCache'
import { validate } from '@/lib/validator'

const CONFIGS: Record<number, number> = { 6: 1, 8: 1, 10: 2 }
const HOW_TO_PLAY = [
  { title: 'Objective', text: 'Place stars so each row, column and region contains exactly the required number of stars.' },
  { title: 'Stars Per Region', text: 'Each coloured region must contain exactly the required number of stars.' },
  { title: 'No Touching Stars', text: 'Stars cannot touch each other, not even diagonally. Keep them separated!' },
  { title: 'Controls', text: 'Tap once for an X mark · tap again to place a star ★ · tap again to clear.\nIn Single Tap mode: tap to place a star, tap again to clear.' },
  { title: 'Tips', text: '• Start with regions that have limited placement options\n• Use X marks to eliminate impossible cells\n• Look for rows or columns that are almost full' },
]

function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem('queens_settings') || '{}')
    return {
      hideTimer:          s.hideTimer          ?? false,
      highlightConflicts: s.highlightConflicts ?? true,
      singleTapMode:      s.singleTapMode      ?? false,
      enhancedContrast:   s.enhancedContrast   ?? false,
      darkMode:           s.darkMode           ?? false,
    }
  } catch {
    return { hideTimer: false, highlightConflicts: true, singleTapMode: false, enhancedContrast: false, darkMode: false }
  }
}

function formatTime(ms: number) {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const cs = Math.floor((ms % 1000) / 10)
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}.${String(cs).padStart(2, '0')}`
}

type MobileView = 'landing' | 'setup' | 'game' | 'settings' | 'howtoplay' | 'about' | 'specificpuzzle' | 'offline'

export default function Home() {
  const [size, setSize]                    = useState(8)
  const [puzzle, setPuzzle]                = useState<Puzzle | null>(null)
  const [cells, setCells]                  = useState<CellState[][]>([])
  const [conflicts, setConflicts]          = useState<Set<string>>(new Set())
  const [completed, setCompleted]          = useState(false)
  const [loading, setLoading]              = useState(false)
  const [error, setError]                  = useState<string | null>(null)
  const [elapsed, setElapsed]              = useState(0)
  const [undoStack, setUndoStack]          = useState<CellState[][][]>([])
  const [redoStack, setRedoStack]          = useState<CellState[][][]>([])
  const historyRef = useRef<{ cells: CellState[][]; undo: CellState[][][]; redo: CellState[][][] } | null>(null)
  const [hideTimer, setHideTimer]          = useState(false)
  const [highlightConflicts, setHighlight] = useState(true)
  const [singleTapMode, setSingleTap]      = useState(false)
  const [enhancedContrast, setEnhanced]    = useState(false)
  const [darkMode, setDarkMode]            = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startRef = useRef<number>(0)
  const pausedElapsedRef = useRef<number>(0)

  // 'hidden' → 'text' (congrats pops in) → 'time' (congrats fades, time card + share appear)
  const [completionPhase, setCompletionPhase] = useState<'hidden' | 'text' | 'time'>('hidden')
  const completionTimeRef = useRef<number>(0)

  // Cells to flash red on explicit check (cleared after 1.5s)
  const [flashCells, setFlashCells] = useState<Set<string>>(new Set())

  // ID of the currently-playing offline puzzle (for completion tracking)
  const [offlinePuzzleId, setOfflinePuzzleId] = useState<string | null>(null)

  // Where to go when back is pressed from the game screen
  const [gameBackView, setGameBackView] = useState<MobileView>('landing')

  // Completion hint — shown once per puzzle when star count is right but puzzle isn't solved
  const [showHint, setShowHint] = useState(false)
  const hintShownRef = useRef(false)

  // Mobile navigation state
  const [mobileView, setMobileView] = useState<MobileView>('landing')
  const [pendingSize, setPendingSize] = useState(8)
  const [isMobile, setIsMobile] = useState(false)

  // Specific puzzle state
  const [puzzleCode, setPuzzleCode] = useState('')
  const [specificLoading, setSpecificLoading] = useState(false)
  const [specificError, setSpecificError] = useState<string | null>(null)

  // Offline cache state
  const [cachedPuzzles, setCachedPuzzles] = useState<CachedPuzzle[]>([])
  const [selectedCached, setSelectedCached] = useState<CachedPuzzle | null>(null)
  const [cacheAdding, setCacheAdding] = useState(false)
  const [cacheAddError, setCacheAddError] = useState<string | null>(null)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    const s = loadSettings()
    setHideTimer(s.hideTimer)
    setHighlight(s.highlightConflicts)
    setSingleTap(s.singleTapMode)
    setEnhanced(s.enhancedContrast)
    setDarkMode(s.darkMode)
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : '')
  }, [darkMode])


  useEffect(() => {
    try {
      localStorage.setItem('queens_settings', JSON.stringify(
        { hideTimer, highlightConflicts, singleTapMode, enhancedContrast, darkMode }
      ))
    } catch {}
  }, [hideTimer, highlightConflicts, singleTapMode, enhancedContrast, darkMode])

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }, [])

  // Pause/resume timer when tab is hidden/visible
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        pausedElapsedRef.current = Date.now() - startRef.current
        stopTimer()
      } else {
        if (timerRef.current) return
        startRef.current = Date.now() - pausedElapsedRef.current
        timerRef.current = setInterval(() => setElapsed(Date.now() - startRef.current), 100)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [stopTimer])

  useEffect(() => () => stopTimer(), [stopTimer])

  const loadPuzzle = useCallback(async (gridSize: number) => {
    setLoading(true)
    setError(null)
    stopTimer()
    setCells([])
    setPuzzle(null)
    setCompleted(false)
    setCompletionPhase('hidden')
    setFlashCells(new Set())
    setElapsed(0)
    setConflicts(new Set())
    setUndoStack([])
    setRedoStack([])
    setOfflinePuzzleId(null)
    hintShownRef.current = false
    historyRef.current = null
    pausedElapsedRef.current = 0
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
    const cur = historyRef.current
    const prevCells = cur?.cells ?? cells
    const next = prevCells.map(r => [...r])
    const cell = next[row][col]
    next[row][col] = singleTapMode
      ? (cell === 'star' ? 'empty' : 'star')
      : (cell === 'empty' ? 'x' : cell === 'x' ? 'star' : 'empty')
    const newUndo = [...(cur?.undo ?? undoStack), prevCells]
    historyRef.current = { cells: next, undo: newUndo, redo: [] }
    setCells(next)
    setUndoStack(newUndo)
    setRedoStack([])
    const { result, conflicts: c } = validate(next, puzzle)
    setConflicts(c)
    if (result === 'valid') {
      stopTimer()
      setCompleted(true)
      const t = Date.now() - startRef.current
      completionTimeRef.current = t
      setCompletionPhase('text')
      setTimeout(() => setCompletionPhase('time'), 1500)
      setOfflinePuzzleId(id => { if (id) updateCacheCompletion(id, t); return id })
    } else if (!hintShownRef.current) {
      const starCount = next.flat().filter(s => s === 'star').length
      if (starCount === puzzle.gridSize * puzzle.stars) {
        hintShownRef.current = true
        setShowHint(true)
      }
    }
  }, [puzzle, completed, singleTapMode, stopTimer, cells, undoStack])

  const handleUndo = useCallback(() => {
    if (!puzzle) return
    const cur = historyRef.current
    const undo = cur?.undo ?? undoStack
    const redo = cur?.redo ?? redoStack
    const currentCells = cur?.cells ?? cells
    if (undo.length === 0) return
    const prev = undo[undo.length - 1]
    const newUndo = undo.slice(0, -1)
    const newRedo = [...redo, currentCells]
    historyRef.current = { cells: prev, undo: newUndo, redo: newRedo }
    setCells(prev); setUndoStack(newUndo); setRedoStack(newRedo)
    const { conflicts: c } = validate(prev, puzzle)
    setConflicts(c); setCompleted(false)
  }, [puzzle, cells, undoStack, redoStack])

  const handleRedo = useCallback(() => {
    if (!puzzle) return
    const cur = historyRef.current
    const undo = cur?.undo ?? undoStack
    const redo = cur?.redo ?? redoStack
    const currentCells = cur?.cells ?? cells
    if (redo.length === 0) return
    const next = redo[redo.length - 1]
    const newRedo = redo.slice(0, -1)
    const newUndo = [...undo, currentCells]
    historyRef.current = { cells: next, undo: newUndo, redo: newRedo }
    setCells(next); setUndoStack(newUndo); setRedoStack(newRedo)
    const { result, conflicts: c } = validate(next, puzzle)
    setConflicts(c)
    if (result === 'valid') {
      stopTimer()
      setCompleted(true)
      completionTimeRef.current = Date.now() - startRef.current
      setCompletionPhase('text')
      setTimeout(() => setCompletionPhase('time'), 1500)
    }
  }, [puzzle, cells, undoStack, redoStack, stopTimer])

  const handleReset = useCallback(() => {
    if (!puzzle) return
    const cur = historyRef.current
    const currentCells = cur?.cells ?? cells
    const undo = cur?.undo ?? undoStack
    const empty = Array.from({ length: puzzle.gridSize }, () => Array(puzzle.gridSize).fill('empty')) as CellState[][]
    const newUndo = [...undo, currentCells]
    historyRef.current = { cells: empty, undo: newUndo, redo: [] }
    setCells(empty); setUndoStack(newUndo); setRedoStack([])
    setConflicts(new Set()); setCompleted(false); setCompletionPhase('hidden'); setFlashCells(new Set())
  }, [puzzle, cells, undoStack])

  const handleCheck = useCallback(() => {
    if (!puzzle || completed) return
    const cur = historyRef.current
    const currentCells = cur?.cells ?? cells

    const { result, conflicts: c } = validate(currentCells, puzzle)
    setConflicts(c)

    if (result === 'valid') {
      stopTimer()
      setCompleted(true)
      completionTimeRef.current = Date.now() - startRef.current
      setCompletionPhase('text')
      setTimeout(() => setCompletionPhase('time'), 1500)
      return
    }

    // Build flash set: structural conflicts + stars not in the solution
    // solution is number[][] where solution[row] = sorted column indices
    const solutionSet = new Set<string>()
    puzzle.solution.forEach((cols, r) => cols.forEach(col => solutionSet.add(`${r},${col}`)))
    const wrong = new Set<string>()
    for (let r = 0; r < puzzle.gridSize; r++) {
      for (let col = 0; col < puzzle.gridSize; col++) {
        const state = currentCells[r][col]
        const key = `${r},${col}`
        if (state === 'star' && !solutionSet.has(key)) wrong.add(key)
        if (state === 'x' && solutionSet.has(key)) wrong.add(key)
      }
    }
    const toFlash = new Set([...c, ...wrong])
    if (toFlash.size === 0) return
    setFlashCells(toFlash)
    setTimeout(() => setFlashCells(new Set()), 1500)
  }, [puzzle, completed, cells, stopTimer])

  const startGame = useCallback(async (gridSize: number) => {
    setSize(gridSize)
    setGameBackView('landing')
    setMobileView('game')
    await loadPuzzle(gridSize)
  }, [loadPuzzle])

  const refreshCache = useCallback(() => setCachedPuzzles(getCachedPuzzles()), [])

  useEffect(() => { refreshCache() }, [refreshCache])

  const playOfflinePuzzle = useCallback((cached: CachedPuzzle) => {
    const p = cached.puzzle
    setPuzzle(p)
    setCells(Array.from({ length: p.gridSize }, () => Array(p.gridSize).fill('empty')))
    setSize(p.gridSize)
    setCompleted(false)
    setCompletionPhase('hidden')
    setFlashCells(new Set())
    setConflicts(new Set())
    setUndoStack([])
    setRedoStack([])
    setOfflinePuzzleId(cached.id)
    setGameBackView('offline')
    hintShownRef.current = false
    historyRef.current = null
    stopTimer()
    setElapsed(0)
    pausedElapsedRef.current = 0
    startRef.current = Date.now()
    timerRef.current = setInterval(() => setElapsed(Date.now() - startRef.current), 100)
    setMobileView('game')
  }, [stopTimer])

  const handleAddToCache = useCallback(async () => {
    if (isCacheFull()) { setCacheAddError('Cache is full (max 30) — remove some first'); return }
    setCacheAdding(true)
    setCacheAddError(null)
    try {
      let added = false
      for (let i = 0; i < 5; i++) {
        const p = await fetchPuzzle(pendingSize, CONFIGS[pendingSize])
        if (addToCache(p)) { added = true; break }
      }
      if (!added) setCacheAddError("Couldn't find a new puzzle — try again")
      else refreshCache()
    } catch {
      setCacheAddError('Failed to download puzzle')
    }
    setCacheAdding(false)
  }, [pendingSize, refreshCache])

  const handleLoadSpecificPuzzle = useCallback(async () => {
    if (!puzzleCode.trim()) return
    setSpecificLoading(true)
    setSpecificError(null)
    try {
      const p = await fetchPuzzleByCode(puzzleCode.trim())
      setPuzzle(p)
      setCells(Array.from({ length: p.gridSize }, () => Array(p.gridSize).fill('empty')))
      setSize(p.gridSize)
      setCompleted(false)
      setCompletionPhase('hidden')
      setFlashCells(new Set())
      setConflicts(new Set())
      setUndoStack([])
      setRedoStack([])
      setOfflinePuzzleId(null)
      setGameBackView('landing')
      hintShownRef.current = false
      historyRef.current = null
      stopTimer()
      setElapsed(0)
      pausedElapsedRef.current = 0
      startRef.current = Date.now()
      timerRef.current = setInterval(() => setElapsed(Date.now() - startRef.current), 100)
      setMobileView('game')
    } catch (e: unknown) {
      setSpecificError(e instanceof Error ? e.message : 'Failed to load puzzle')
    }
    setSpecificLoading(false)
  }, [puzzleCode, stopTimer])

  const puzzleActive = puzzle !== null || loading

  // ── Desktop layout ──────────────────────────────────────────────
  const desktopLayout = (
    <div className="flex flex-col h-screen">
      <header
        className="shrink-0"
        style={{ height: 56, background: 'var(--surface)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--sidebar-border)', display: 'grid', gridTemplateColumns: '288px 1fr 288px' }}
      >
        {/* Left — brand, flush with sidebar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 20px', borderRight: '1px solid var(--sidebar-border)' }}>
          <span style={{ fontSize: 20, color: 'var(--primary)', lineHeight: 1 }}>★</span>
          <h1 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-dark)', letterSpacing: '-0.3px', margin: 0 }}>Queens</h1>
        </div>
        {/* Centre — timer */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
          {puzzleActive && !hideTimer && (
            <>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-light)' }}>Time</span>
              <span style={{ fontSize: 26, fontWeight: 300, letterSpacing: '-1px', color: 'var(--primary)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                {formatTime(elapsed)}
              </span>
            </>
          )}
        </div>
        {/* Right — empty, puzzle info stays above the grid */}
        <div style={{ borderLeft: '1px solid var(--sidebar-border)' }} />
      </header>
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-72 shrink-0 h-full overflow-y-auto" style={{ background: 'var(--surface-mid)', backdropFilter: 'blur(12px)', borderRight: '1px solid var(--sidebar-border)' }}>
          <Sidebar
            size={size} onSizeChange={setSize} onNewGame={() => loadPuzzle(size)}
            hideTimer={hideTimer} onToggleHideTimer={() => setHideTimer(v => !v)}
            highlightConflicts={highlightConflicts} onToggleHighlightConflicts={() => setHighlight(v => !v)}
            singleTapMode={singleTapMode} onToggleSingleTap={() => setSingleTap(v => !v)}
            enhancedContrast={enhancedContrast} onToggleEnhancedContrast={() => setEnhanced(v => !v)}
            darkMode={darkMode} onToggleDarkMode={() => setDarkMode(v => !v)}
            loading={loading} completed={completed} puzzleActive={puzzle !== null || loading}
            cachedPuzzles={cachedPuzzles} cacheAdding={cacheAdding} cacheAddError={cacheAddError}
            isCacheFull={isCacheFull()} pendingSize={pendingSize} onPendingSizeChange={setPendingSize}
            onAddToCache={handleAddToCache}
            onRemoveCached={id => { removeFromCache(id); refreshCache() }}
            onPlayCached={cached => {
              const p = cached.puzzle
              setPuzzle(p)
              setCells(Array.from({ length: p.gridSize }, () => Array(p.gridSize).fill('empty')))
              setSize(p.gridSize)
              setCompleted(false); setCompletionPhase('hidden'); setFlashCells(new Set())
              setConflicts(new Set()); setUndoStack([]); setRedoStack([])
              setOfflinePuzzleId(cached.id); hintShownRef.current = false; historyRef.current = null
              stopTimer(); setElapsed(0); pausedElapsedRef.current = 0
              startRef.current = Date.now()
              timerRef.current = setInterval(() => setElapsed(Date.now() - startRef.current), 100)
            }}
          />
        </aside>
        <main className="flex-1 flex flex-col items-center justify-center gap-5 p-8 overflow-auto">
          {error && <p className="text-sm" style={{ color: '#c0392b' }}>{error}</p>}
          {!puzzle && !loading && !error && <span style={{ fontSize: 72, color: 'var(--primary)', opacity: 0.15 }}>★</span>}
          {loading && (
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: '#728bc0', borderTopColor: 'transparent' }} />
              <p className="text-sm" style={{ color: 'var(--text-mid)' }}>Loading puzzle…</p>
            </div>
          )}
          {puzzle && !loading && (
            <>
              <p className="text-sm font-medium" style={{ color: 'var(--text-mid)' }}>
                Puzzle #{puzzle.code} · {puzzle.gridSize}×{puzzle.gridSize} · {CONFIGS[puzzle.gridSize] === 1 ? '1 star' : '2 stars'} per region
              </p>
              <div style={{ position: 'relative' }}>
                <PuzzleGrid puzzle={puzzle} cells={cells} conflicts={conflicts} flashCells={flashCells} highlightConflicts={highlightConflicts} enhancedContrast={enhancedContrast} darkMode={darkMode} onCellClick={handleCellClick} completed={completed} />
                {completionPhase !== 'hidden' && (
                  <div style={{
                    position: 'absolute', inset: 0, borderRadius: 'inherit',
                    backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    pointerEvents: 'none',
                  }}>
                    {completionPhase === 'text' && (
                      <span style={{
                        fontSize: 34, fontWeight: 300, letterSpacing: '0.5px', color: 'var(--primary)',
                        background: 'var(--surface-mid)', backdropFilter: 'blur(8px)', borderRadius: 16, padding: '16px 32px',
                        animation: 'fadeScaleIn 0.5s ease forwards',
                      }}>Solved ★</span>
                    )}
                    {completionPhase === 'time' && (
                      <div style={{
                        background: 'var(--surface-mid)', backdropFilter: 'blur(8px)', borderRadius: 16, padding: '16px 32px',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                        animation: 'fadeScaleIn 0.5s ease forwards',
                      }}>
                        <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-light)' }}>Time</span>
                        <span style={{ fontSize: 40, fontWeight: 600, letterSpacing: '-1px', color: 'var(--text-dark)', fontVariantNumeric: 'tabular-nums' }}>
                          {formatTime(completionTimeRef.current)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                {completed ? (
                  <>
                    <button onClick={handleReset} className="px-5 py-2 rounded-xl text-sm font-semibold transition-all"
                      style={{ background: 'var(--surface-btn)', color: 'var(--primary)', border: '1.5px solid var(--primary)', cursor: 'pointer' }}>
                      Reset
                    </button>
                    <button onClick={() => loadPuzzle(size)} className="px-5 py-2 rounded-xl text-sm font-semibold transition-all"
                      style={{ background: '#728bc0', color: 'white', border: '1.5px solid #728bc0', cursor: 'pointer' }}>
                      New Game
                    </button>
                  </>
                ) : (
                  <>
                    {[
                      { label: 'Undo', onClick: handleUndo, disabled: undoStack.length === 0 },
                      { label: 'Redo', onClick: handleRedo, disabled: redoStack.length === 0 },
                      { label: 'Reset', onClick: handleReset, disabled: false },
                      { label: '✓ Check', onClick: handleCheck, disabled: false },
                    ].map(({ label, onClick, disabled }) => (
                      <button key={label} onClick={onClick} disabled={disabled} className="px-5 py-2 rounded-xl text-sm font-semibold transition-all"
                        style={{ background: 'var(--surface-btn)', color: disabled ? 'var(--text-light)' : 'var(--primary)', border: '1.5px solid', borderColor: disabled ? 'var(--text-light)' : 'var(--primary)', opacity: disabled ? 0.45 : 1, cursor: disabled ? 'default' : 'pointer' }}>
                        {label}
                      </button>
                    ))}
                  </>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )

  // ── Mobile screens ──────────────────────────────────────────────

  const mobileLanding = (
    <div className="mobile-screen">
      <div style={{ height: 44 }} />
      <div className="mobile-landing">
        <div className="mobile-landing-star">★</div>
        <div className="mobile-landing-title">Queens</div>
        <div className="mobile-landing-buttons">
          <button className="mobile-btn-primary" onClick={() => setMobileView('setup')}>New Game</button>
          <div className="mobile-btn-row">
            <button className="mobile-btn-outlined" onClick={() => setMobileView('specificpuzzle')}>Specific Puzzle</button>
            <button className="mobile-btn-outlined" onClick={() => { refreshCache(); setMobileView('offline') }}>Offline</button>
          </div>
        </div>
        <div className="mobile-landing-icons">
          <button className="mobile-landing-icon" onClick={() => setMobileView('howtoplay')}>
            ?<span>How to Play</span>
          </button>
          <button className="mobile-landing-icon" onClick={() => setMobileView('settings')}>
            ⚙<span>Settings</span>
          </button>
          <button className="mobile-landing-icon" onClick={() => setMobileView('about')}>
            ℹ<span>About</span>
          </button>
        </div>
      </div>
    </div>
  )

  const mobileSetup = (
    <div className="mobile-screen">
      <div className="mobile-nav">
        <button className="mobile-nav-icon" onClick={() => setMobileView('landing')} aria-label="Back">‹</button>
        <div />
        <div style={{ width: 36 }} />
      </div>
      <div className="mobile-setup-body">
        <div className="mobile-setup-title">New Game</div>
        <div>
          <div className="mobile-setup-section-label">Size</div>
          <div className="mobile-setup-btn-row">
            {[6, 8, 10].map(s => (
              <button key={s} onClick={() => setPendingSize(s)}
                className={`mobile-setup-btn ${pendingSize === s ? 'mobile-setup-btn-active' : 'mobile-setup-btn-inactive'}`}>
                {s}×{s}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="mobile-setup-section-label">Stars Per Region</div>
          <div className="mobile-setup-btn-row">
            {[1, 2].map(n => {
              const valid = CONFIGS[pendingSize] === n
              return (
                <button key={n} disabled={!valid}
                  className={`mobile-setup-btn ${valid ? 'mobile-setup-btn-active' : 'mobile-setup-btn-disabled'}`}>
                  {n} {n === 1 ? 'Star' : 'Stars'}
                </button>
              )
            })}
          </div>
        </div>
        <button className="mobile-setup-start" onClick={() => startGame(pendingSize)}>Start</button>
      </div>
    </div>
  )

  const mobileGame = (
    <div className="mobile-screen">
      <div className="mobile-nav">
        <button className="mobile-nav-icon" onClick={() => { if (gameBackView === 'offline') refreshCache(); setMobileView(gameBackView) }} aria-label="Back">‹</button>
        <div />
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button
            className="mobile-nav-icon"
            style={{ fontSize: 17 }}
            onClick={() => { if (puzzle) addToCache(puzzle) }}
            title="Save to offline cache"
            disabled={!puzzle || loading}
          >＋</button>
          <button
            className="mobile-nav-icon"
            style={{ fontSize: 17, opacity: !puzzle || loading || completed ? 0.4 : 1 }}
            onClick={handleCheck}
            title="Check solution"
            disabled={!puzzle || loading || completed}
          >✓</button>
        </div>
      </div>

      {puzzle && !loading && (
        <div style={{ textAlign: 'center', padding: '2px 16px 6px', flexShrink: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 300, letterSpacing: '-0.3px', color: 'var(--primary)', lineHeight: 1.1 }}>
            #{puzzle.code}
          </div>
          <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-light)', marginTop: 3 }}>
            {puzzle.gridSize}×{puzzle.gridSize} &nbsp;·&nbsp; {CONFIGS[puzzle.gridSize] === 1 ? '1 star' : '2 stars'} per region
          </div>
          {!hideTimer && (
            <div style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600, marginTop: 4, fontVariantNumeric: 'tabular-nums', visibility: completed ? 'hidden' : 'visible' }}>
              {formatTime(elapsed)}
            </div>
          )}
        </div>
      )}

      <div className="mobile-grid-wrap">
        {error && <p style={{ color: '#c0392b', fontSize: 14 }}>{error}</p>}
        {!puzzle && !loading && !error && <span style={{ fontSize: 64, color: 'var(--primary)', opacity: 0.15 }}>★</span>}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: '#728bc0', borderTopColor: 'transparent' }} />
            <p style={{ fontSize: 13, color: 'var(--text-mid)' }}>Loading puzzle…</p>
          </div>
        )}
        {puzzle && !loading && (
          <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}>
            <PuzzleGrid puzzle={puzzle} cells={cells} conflicts={conflicts} flashCells={flashCells} highlightConflicts={highlightConflicts} enhancedContrast={enhancedContrast} darkMode={darkMode} onCellClick={handleCellClick} completed={completed} />
            {completionPhase !== 'hidden' && (
              <div className="mobile-completion">
                {completionPhase === 'text' && (
                  <div className="mobile-completion-congrats" style={{ animation: 'fadeScaleIn 0.5s ease forwards' }}>
                    Solved ★
                  </div>
                )}
                {completionPhase === 'time' && (
                  <div className="mobile-completion-inner" style={{ animation: 'fadeScaleIn 0.5s ease forwards' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-light)' }}>Time</span>
                    <div className="mobile-completion-time">{formatTime(completionTimeRef.current)}</div>
                    {typeof navigator !== 'undefined' && 'share' in navigator && (
                      <button
                        onClick={() => navigator.share({
                          text: `I solved Queens puzzle #${puzzle.code} in ${formatTime(completionTimeRef.current)}! ★\n${puzzle.gridSize}×${puzzle.gridSize} grid · ${CONFIGS[puzzle.gridSize] === 1 ? '1 star' : '2 stars'} per region`,
                        })}
                        className="mobile-completion-share"
                      >Share ↗</button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mobile-btn-area">
        <button className="mobile-btn-game-primary" onClick={() => loadPuzzle(size)} disabled={loading}>
          {loading ? 'Loading…' : 'New Puzzle'}
        </button>
        <div className="mobile-btn-row">
          <button className="mobile-btn-secondary" onClick={handleUndo} disabled={undoStack.length === 0 || completed}>↩ Undo</button>
          <button className="mobile-btn-secondary" onClick={handleRedo} disabled={redoStack.length === 0 || completed}>Redo ↪</button>
        </div>
        <div className="mobile-btn-row">
          <button className="mobile-btn-tertiary" onClick={handleReset} disabled={!puzzle}>↺ Reset</button>
        </div>
      </div>
    </div>
  )

  const mobileSettingsScreen = (
    <MobileSettings
      onClose={() => setMobileView('landing')}
      hideTimer={hideTimer} onToggleHideTimer={() => setHideTimer(v => !v)}
      highlightConflicts={highlightConflicts} onToggleHighlightConflicts={() => setHighlight(v => !v)}
      singleTapMode={singleTapMode} onToggleSingleTap={() => setSingleTap(v => !v)}
      enhancedContrast={enhancedContrast} onToggleEnhancedContrast={() => setEnhanced(v => !v)}
      darkMode={darkMode} onToggleDarkMode={() => setDarkMode(v => !v)}
    />
  )

  const mobileHowToPlay = (
    <div className="mobile-screen">
      <div className="mobile-nav">
        <button className="mobile-nav-icon" onClick={() => setMobileView('landing')} aria-label="Back">‹</button>
        <span className="mobile-nav-title">How to Play</span>
        <div style={{ width: 36 }} />
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {HOW_TO_PLAY.map(item => (
          <div key={item.title} className="mobile-htp-card">
            <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-dark)' }}>{item.title}</p>
            <p className="text-xs leading-relaxed whitespace-pre-line" style={{ color: 'var(--text-mid)' }}>{item.text}</p>
          </div>
        ))}
      </div>
    </div>
  )

  const mobileAbout = (
    <div className="mobile-screen">
      <div className="mobile-nav">
        <button className="mobile-nav-icon" onClick={() => setMobileView('landing')} aria-label="Back">‹</button>
        <span className="mobile-nav-title">About</span>
        <div style={{ width: 36 }} />
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 14 }}>
        <span style={{ fontSize: 52, color: 'var(--primary)' }}>★</span>
        <p className="text-lg font-semibold" style={{ color: 'var(--text-dark)' }}>Queens</p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-mid)' }}>
          Thanks for playing! I built this simply because I love these puzzles and couldn&apos;t find a clean, ad-free version.
        </p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-mid)' }}>
          There is zero data collection and no annoying ads here — just pure puzzles. This project is a true labor of love, so please enjoy it for free!
        </p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-mid)' }}>
          If you&apos;d like to show your appreciation, you can buy me a decaf oat latte below.
        </p>
        <a href="https://donate.stripe.com/5kQ14p1RcfQ20W8h2a0x200" target="_blank" rel="noopener noreferrer"
          className="w-full py-3 rounded-xl text-sm font-semibold text-center block"
          style={{ background: '#728bc0', color: 'white', textDecoration: 'none' }}>
          ☕ Buy me a decaf oat latte
        </a>
        <a href="/privacy" className="text-xs" style={{ color: 'var(--text-mid)', textDecoration: 'none' }}>Privacy Policy</a>
      </div>
    </div>
  )

  const mobileSpecificPuzzle = (
    <div className="mobile-screen">
      <div className="mobile-nav">
        <button className="mobile-nav-icon" onClick={() => { setSpecificError(null); setPuzzleCode(''); setMobileView('landing') }} aria-label="Back">‹</button>
        <span className="mobile-nav-title">Specific Puzzle</span>
        <div style={{ width: 36 }} />
      </div>
      <div className="mobile-specific-body">
        <div className="mobile-specific-title">Enter Puzzle Code</div>
        <div className="mobile-specific-subtitle">Type the puzzle number to load</div>
        <input
          className="mobile-specific-input"
          type="number"
          inputMode="numeric"
          placeholder="12345"
          value={puzzleCode}
          onChange={e => setPuzzleCode(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLoadSpecificPuzzle()}
        />
        {specificError && <div className="mobile-specific-error">{specificError}</div>}
        <button
          className="mobile-setup-start"
          style={{ maxWidth: 280, opacity: specificLoading || !puzzleCode.trim() ? 0.5 : 1 }}
          onClick={handleLoadSpecificPuzzle}
          disabled={specificLoading || !puzzleCode.trim()}
        >
          {specificLoading ? 'Loading…' : 'Go'}
        </button>
      </div>
    </div>
  )

  const mobileOffline = (
    <div className="mobile-screen">
      <div className="mobile-nav">
        <button className="mobile-nav-icon" onClick={() => { setSelectedCached(null); setMobileView('landing') }} aria-label="Back">‹</button>
        <span className="mobile-nav-title">Offline Play</span>
        <div style={{ width: 36 }} />
      </div>
      <div className="mobile-offline-body">
        {/* Add controls */}
        <div className="mobile-offline-controls">
          <div className="mobile-setup-btn-row">
            {[6, 8, 10].map(s => (
              <button key={s} onClick={() => setPendingSize(s)}
                className={`mobile-setup-btn ${pendingSize === s ? 'mobile-setup-btn-active' : 'mobile-setup-btn-inactive'}`}>
                {s}×{s}
              </button>
            ))}
          </div>
          <button
            className="mobile-btn-game-primary"
            onClick={handleAddToCache}
            disabled={cacheAdding || isCacheFull()}
            style={{ opacity: cacheAdding || isCacheFull() ? 0.6 : 1 }}
          >
            {cacheAdding ? 'Downloading…' : isCacheFull() ? 'Cache Full (30/30)' : '↓ Add to Cache'}
          </button>
          {cacheAddError && <div className="mobile-specific-error">{cacheAddError}</div>}
        </div>

        {/* List */}
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-mid)', flexShrink: 0 }}>
          Cached Puzzles ({cachedPuzzles.length}/30)
        </div>
        {cachedPuzzles.length === 0 ? (
          <div className="mobile-offline-empty">
            <span style={{ fontSize: 40, opacity: 0.3 }}>📦</span>
            <span>No cached puzzles yet</span>
          </div>
        ) : (
          <div className="mobile-offline-list">
            {cachedPuzzles.map(c => (
              <div
                key={c.id}
                className={`mobile-offline-row${selectedCached?.id === c.id ? ' mobile-offline-row-selected' : ''}`}
                onClick={() => setSelectedCached(prev => prev?.id === c.id ? null : c)}
              >
                <div>
                  <div className="mobile-offline-row-name">{c.puzzle.gridSize}×{c.puzzle.gridSize} · {c.puzzle.stars === 1 ? '1 star' : '2 stars'}</div>
                  <div className="mobile-offline-row-meta">#{c.puzzle.code}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {c.completionTime != null && (
                    <span className="mobile-offline-row-time">
                      ✓ {Math.floor(c.completionTime / 60000).toString().padStart(2,'0')}:{Math.floor((c.completionTime % 60000) / 1000).toString().padStart(2,'0')}
                    </span>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); removeFromCache(c.id); refreshCache(); if (selectedCached?.id === c.id) setSelectedCached(null) }}
                    style={{ background: 'none', border: 'none', fontSize: 16, color: 'var(--text-light)', cursor: 'pointer', padding: '4px 6px' }}
                    aria-label="Remove"
                  >✕</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="mobile-offline-actions" style={{ flexShrink: 0 }}>
          <button
            className="mobile-btn-game-primary"
            style={{ flex: 1, opacity: selectedCached ? 1 : 0.5 }}
            disabled={!selectedCached}
            onClick={() => selectedCached && playOfflinePuzzle(selectedCached)}
          >
            ▶ Play
          </button>
          <button
            className="mobile-btn-tertiary"
            style={{ flex: 1, opacity: cachedPuzzles.length === 0 ? 0.5 : 1 }}
            disabled={cachedPuzzles.length === 0}
            onClick={() => { clearCache(); refreshCache(); setSelectedCached(null) }}
          >
            Remove All
          </button>
        </div>
      </div>
    </div>
  )

  const mobileScreens: Record<MobileView, React.ReactNode> = {
    landing: mobileLanding,
    setup: mobileSetup,
    game: mobileGame,
    settings: mobileSettingsScreen,
    howtoplay: mobileHowToPlay,
    about: mobileAbout,
    specificpuzzle: mobileSpecificPuzzle,
    offline: mobileOffline,
  }

  return (
    <div style={{ height: '100%' }}>
      {isMobile ? mobileScreens[mobileView] : desktopLayout}
      {showHint && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          onClick={() => setShowHint(false)}
        >
          <div
            style={{ background: 'var(--surface-mid)', backdropFilter: 'blur(16px)', borderRadius: 18, padding: '28px 28px 20px', maxWidth: 300, width: '90%', boxShadow: '0 8px 40px rgba(0,0,0,0.24)', border: '1px solid var(--sidebar-border)', display: 'flex', flexDirection: 'column', gap: 12 }}
            onClick={e => e.stopPropagation()}
          >
            <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-dark)', margin: 0 }}>Not quite right</p>
            <p style={{ fontSize: 14, color: 'var(--text-mid)', margin: 0, lineHeight: 1.5 }}>
              You&apos;ve placed all the stars, but the solution isn&apos;t valid yet. Tap <strong>✓ Check</strong> to see which cells are wrong.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
              <button
                onClick={() => setShowHint(false)}
                style={{ padding: '8px 18px', borderRadius: 10, border: '1.5px solid var(--primary)', background: 'none', color: 'var(--primary)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
