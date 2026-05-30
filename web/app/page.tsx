'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Sidebar from '@/components/Sidebar'
import PuzzleGrid from '@/components/PuzzleGrid'
import MobileSettings from '@/components/MobileSettings'
import type { Puzzle, CellState } from '@/lib/types'
import { fetchPuzzle, fetchPuzzleByCode } from '@/lib/api'
import {
  getCachedPuzzles, addToCache, removeFromCache, clearCache, isCacheFull,
  type CachedPuzzle,
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
    }
  } catch {
    return { hideTimer: false, highlightConflicts: true, singleTapMode: false, enhancedContrast: false }
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
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startRef = useRef<number>(0)

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
    setUndoStack([])
    setRedoStack([])
    historyRef.current = null
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
    if (result === 'valid') { stopTimer(); setCompleted(true) }
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
    if (result === 'valid') { stopTimer(); setCompleted(true) }
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
    setConflicts(new Set()); setCompleted(false)
  }, [puzzle, cells, undoStack])

  const startGame = useCallback(async (gridSize: number) => {
    setSize(gridSize)
    setMobileView('game')
    await loadPuzzle(gridSize)
  }, [loadPuzzle])

  const refreshCache = useCallback(() => setCachedPuzzles(getCachedPuzzles()), [])

  const playOfflinePuzzle = useCallback((cached: CachedPuzzle) => {
    const p = cached.puzzle
    setPuzzle(p)
    setCells(Array.from({ length: p.gridSize }, () => Array(p.gridSize).fill('empty')))
    setSize(p.gridSize)
    setCompleted(false)
    setConflicts(new Set())
    setUndoStack([])
    setRedoStack([])
    historyRef.current = null
    stopTimer()
    setElapsed(0)
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
      setConflicts(new Set())
      setUndoStack([])
      setRedoStack([])
      historyRef.current = null
      stopTimer()
      setElapsed(0)
      startRef.current = Date.now()
      timerRef.current = setInterval(() => setElapsed(Date.now() - startRef.current), 100)
      setMobileView('game')
    } catch (e: unknown) {
      setSpecificError(e instanceof Error ? e.message : 'Failed to load puzzle')
    }
    setSpecificLoading(false)
  }, [puzzleCode, stopTimer])

  // ── Desktop layout ──────────────────────────────────────────────
  const desktopLayout = (
    <div className="flex flex-col h-screen">
      <header
        className="shrink-0 flex flex-col items-center justify-center gap-0.5"
        style={{ height: 68, background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--sidebar-border)' }}
      >
        <span className="leading-none" style={{ fontSize: 22, color: 'var(--primary)' }}>★</span>
        <h1 className="text-lg font-semibold tracking-tight leading-none" style={{ color: 'var(--text-dark)' }}>Queens</h1>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-72 shrink-0 h-full overflow-y-auto" style={{ background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(12px)', borderRight: '1px solid var(--sidebar-border)' }}>
          <Sidebar
            size={size} onSizeChange={setSize} onNewGame={() => loadPuzzle(size)}
            elapsed={elapsed} hideTimer={hideTimer} onToggleHideTimer={() => setHideTimer(v => !v)}
            highlightConflicts={highlightConflicts} onToggleHighlightConflicts={() => setHighlight(v => !v)}
            singleTapMode={singleTapMode} onToggleSingleTap={() => setSingleTap(v => !v)}
            enhancedContrast={enhancedContrast} onToggleEnhancedContrast={() => setEnhanced(v => !v)}
            loading={loading} completed={completed} puzzleActive={puzzle !== null || loading}
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
              <PuzzleGrid puzzle={puzzle} cells={cells} conflicts={conflicts} highlightConflicts={highlightConflicts} enhancedContrast={enhancedContrast} onCellClick={handleCellClick} completed={completed} />
              {!completed && (
                <div className="flex gap-2">
                  {[
                    { label: 'Undo', onClick: handleUndo, disabled: undoStack.length === 0 },
                    { label: 'Redo', onClick: handleRedo, disabled: redoStack.length === 0 },
                    { label: 'Reset', onClick: handleReset, disabled: false },
                  ].map(({ label, onClick, disabled }) => (
                    <button key={label} onClick={onClick} disabled={disabled} className="px-5 py-2 rounded-xl text-sm font-semibold transition-all"
                      style={{ background: 'rgba(235,233,245,0.8)', color: disabled ? 'var(--text-light)' : 'var(--primary)', border: '1.5px solid', borderColor: disabled ? 'var(--text-light)' : 'var(--primary)', opacity: disabled ? 0.45 : 1, cursor: disabled ? 'default' : 'pointer' }}>
                      {label}
                    </button>
                  ))}
                </div>
              )}
              {completed && (
                <div className="text-center">
                  <p className="text-3xl font-semibold mb-1" style={{ color: '#5a73a8' }}>Solved! ★</p>
                  <p className="text-sm" style={{ color: 'var(--text-mid)' }}>Click New Game to keep going</p>
                </div>
              )}
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
        <button className="mobile-nav-icon" onClick={() => setMobileView('landing')} aria-label="Back">‹</button>
        <div />
        <div style={{ display: 'flex' }}>
          <button
            className="mobile-nav-icon"
            style={{ fontSize: 17 }}
            onClick={() => { if (puzzle) addToCache(puzzle) }}
            title="Save to offline cache"
            disabled={!puzzle || loading}
          >＋</button>
        </div>
      </div>

      {puzzle && !loading && (
        <div className="mobile-game-info">
          <div className="mobile-game-info-title">
            {puzzle.gridSize}×{puzzle.gridSize} Grid · {CONFIGS[puzzle.gridSize] === 1 ? '1 star' : '2 stars'} per row, column &amp; region
          </div>
          {!hideTimer && !completed && (
            <div className="mobile-game-info-timer">{formatTime(elapsed)}</div>
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
            <PuzzleGrid puzzle={puzzle} cells={cells} conflicts={conflicts} highlightConflicts={highlightConflicts} enhancedContrast={enhancedContrast} onCellClick={handleCellClick} completed={completed} />
            {completed && (
              <div className="mobile-completion">
                <div className="mobile-completion-congrats">Congratulations!</div>
                <div className="mobile-completion-time">{formatTime(elapsed)}</div>
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
          <button className="mobile-btn-tertiary" onClick={handleReset} disabled={!puzzle || completed}>↺ Reset</button>
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
    </div>
  )
}
