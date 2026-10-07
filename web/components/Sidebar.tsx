'use client'

import { useState } from 'react'
import Toggle from './Toggle'
import type { CachedPuzzle } from '@/lib/puzzleCache'
import type { CatalogueStyle } from '@/lib/types'
import { styleFor, ALL_DIFFICULTIES, difficultyLabel, availableDifficulties } from '@/lib/catalogue'

interface SidebarProps {
  styles: CatalogueStyle[]
  engine: string
  onEngineChange: (e: string) => void
  size: number
  onSizeChange: (s: number) => void
  difficulties: string[]
  onToggleDifficulty: (d: string) => void
  onNewGame: () => void
  hideTimer: boolean
  onToggleHideTimer: () => void
  highlightConflicts: boolean
  onToggleHighlightConflicts: () => void
  singleTapMode: boolean
  onToggleSingleTap: () => void
  autoCross: boolean
  onToggleAutoCross: () => void
  enhancedContrast: boolean
  onToggleEnhancedContrast: () => void
  darkMode: boolean
  onToggleDarkMode: () => void
  loading: boolean
  completed: boolean
  puzzleActive: boolean
  // Offline cache
  cachedPuzzles: CachedPuzzle[]
  cacheAdding: boolean
  cacheAddError: string | null
  isCacheFull: boolean
  pendingSize: number
  onPendingSizeChange: (s: number) => void
  onAddToCache: () => void
  onPlayCached: (c: CachedPuzzle) => void
  onRemoveCached: (id: string) => void
}



function Section({ title, open, onToggle, children }: {
  title: string; open: boolean; onToggle: () => void; children: React.ReactNode
}) {
  return (
    <div style={{ borderBottom: '1px solid var(--sidebar-border)' }}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-3.5"
        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-mid)' }}>
          {title}
        </span>
        <svg
          viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"
          style={{
            width: 14, height: 14, color: 'var(--text-mid)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            flexShrink: 0,
          }}
        >
          <path d="M2 4l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div style={{
        display: 'grid',
        gridTemplateRows: open ? '1fr' : '0fr',
        opacity: open ? 1 : 0,
        transition: 'grid-template-rows 0.2s ease, opacity 0.2s ease',
      }}>
        <div style={{ overflow: 'hidden' }}>
          <div className="px-5 pb-5">{children}</div>
        </div>
      </div>
    </div>
  )
}

const HOW_TO_PLAY = [
  {
    title: 'Puzzle Variations',
    text: 'Puzzles come in different difficulties. A 1-star puzzle requires 1 star per row, column, and region. A 2-star puzzle requires 2 stars per row, column, and region.',
  },
  {
    title: 'Objective',
    text: 'Place stars in the grid so that each row, column, and region contains exactly the required number of stars.',
  },
  {
    title: 'Stars Per Region',
    text: 'Each coloured region must contain exactly the required number of stars. Regions are shown in different colours.',
  },
  {
    title: 'Stars Per Row & Column',
    text: 'Each row and each column must have exactly the required number of stars. This applies across the entire grid.',
  },
  {
    title: 'No Touching Stars',
    text: 'Stars cannot touch each other, not even diagonally. Keep them separated!',
  },
  {
    title: 'Tips',
    text: '• Start with regions that have limited placement options\n• Use X marks to eliminate impossible cells\n• Look for rows or columns that are almost full',
  },
]

export default function Sidebar({
  styles, engine, onEngineChange,
  size, onSizeChange, onNewGame,
  difficulties, onToggleDifficulty,
  hideTimer, onToggleHideTimer,
  highlightConflicts, onToggleHighlightConflicts,
  singleTapMode, onToggleSingleTap,
  autoCross, onToggleAutoCross,
  enhancedContrast, onToggleEnhancedContrast,
  darkMode, onToggleDarkMode,
  loading, completed, puzzleActive,
  cachedPuzzles, cacheAdding, cacheAddError, isCacheFull,
  pendingSize, onPendingSizeChange, onAddToCache, onPlayCached, onRemoveCached,
}: SidebarProps) {
  type Section = 'gameInfo' | 'offline' | 'settings' | 'howToPlay' | 'about'
  const [openSection, setOpenSection] = useState<Section>('gameInfo')
  const toggle = (s: Section) => setOpenSection(prev => prev === s ? 'gameInfo' : s)
  const [selectedCachedId, setSelectedCachedId] = useState<string | null>(null)

  const bd = <div style={{ height: 1, background: 'var(--sidebar-border)', margin: '2px 0' }} />
  // Driven by the catalogue: 9x9 exists only for the new styles, and a size's
  // star count is a property of the style rather than of the size alone.
  const current = styleFor(styles, engine)
  const availDiff = availableDifficulties(styles, engine, size)
  const sizeOptions = current?.sizes.map(s => s.size) ?? []
  const currentStars = current?.sizes.find(s => s.size === size)?.stars
  const validStars = currentStars ? [currentStars] : []

  return (
    <div className="flex flex-col h-full">

      {/* Game Info — collapsible */}
      <Section title="Game Info" open={openSection === 'gameInfo'} onToggle={() => toggle('gameInfo')}>

        {/* Puzzle style. Hidden entirely while only one style exists, so the
            pre-styles layout is unchanged until the API serves more. */}
        {styles.length > 1 && (
          <>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-mid)' }}>Style</p>
            <div className="flex flex-wrap gap-2 mb-2">
              {styles.map(s => (
                <button
                  key={s.engine}
                  onClick={() => onEngineChange(s.engine)}
                  className="flex-1 py-3 rounded-xl font-semibold transition-all"
                  style={{
                    fontSize: 15,
                    minWidth: '5.5rem',
                    background: engine === s.engine ? 'linear-gradient(135deg, #728bc0, #5a73a8)' : 'var(--surface-btn)',
                    color: engine === s.engine ? 'white' : 'var(--btn-text)',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {s.name}
                </button>
              ))}
            </div>
            <p className="text-[11px] mb-5" style={{ color: 'var(--text-mid)', minHeight: '2.4em' }}>
              {current?.description ?? ''}
            </p>
          </>
        )}

        {/* Grid size */}
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-mid)' }}>Size</p>
        <div className="flex flex-wrap gap-2 mb-5">
          {sizeOptions.map(s => (
            <button
              key={s}
              onClick={() => onSizeChange(s)}
              className="flex-1 py-3 rounded-xl font-semibold transition-all"
              style={{
                fontSize: 16,
                minWidth: '3.5rem',
                background: size === s ? 'linear-gradient(135deg, #728bc0, #5a73a8)' : 'var(--surface-btn)',
                color: size === s ? 'white' : 'var(--btn-text)',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {s}×{s}
            </button>
          ))}
        </div>

        {/* Stars per region */}
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-mid)' }}>Stars Per Region</p>
        <div className="flex gap-2 mb-5">
          {[1, 2].map(n => {
            const available = validStars.includes(n)
            const selected  = currentStars === n
            return (
              <button
                key={n}
                disabled={!available}
                className="flex-1 py-3 rounded-xl font-medium transition-all"
                style={{
                  fontSize: 15,
                  background: selected && available ? 'linear-gradient(135deg, #728bc0, #5a73a8)' : 'var(--surface-btn)',
                  color: selected && available ? 'white' : available ? 'var(--btn-text)' : 'var(--text-light)',
                  border: 'none',
                  cursor: available ? 'pointer' : 'default',
                  opacity: available ? 1 : 0.4,
                }}
              >
                {n} {n === 1 ? 'Star' : 'Stars'}
              </button>
            )
          })}
        </div>

        {/* Difficulty multi-select. Buckets with no puzzles at this style and
            size are shown disabled rather than hidden, so the row does not
            reflow as you move between styles. */}
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-mid)' }}>Difficulty</p>
        <div className="flex flex-wrap gap-2 mb-5">
          {ALL_DIFFICULTIES.map(d => {
            const available = availDiff.includes(d)
            const selected  = available && difficulties.includes(d)
            return (
              <button
                key={d}
                disabled={!available}
                onClick={() => onToggleDifficulty(d)}
                className="flex-1 py-2 rounded-xl font-medium transition-all"
                style={{
                  fontSize: 13,
                  minWidth: '4.5rem',
                  background: selected ? 'linear-gradient(135deg, #728bc0, #5a73a8)' : 'var(--surface-btn)',
                  color: selected ? 'white' : available ? 'var(--btn-text)' : 'var(--text-light)',
                  border: 'none',
                  cursor: available ? 'pointer' : 'default',
                  opacity: available ? 1 : 0.4,
                }}
              >
                {difficultyLabel(d)}
              </button>
            )
          })}
        </div>

        {/* Play / New Game */}
        <button
          onClick={onNewGame}
          disabled={loading}
          className="w-full py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
          style={{ background: '#728bc0', color: 'white' }}
        >
          {loading ? 'Loading…' : completed ? 'Next Puzzle' : puzzleActive ? 'New Game' : 'Play'}
        </button>

      </Section>

      {/* Offline Cache — collapsible */}
      <Section title={`Offline Cache${cachedPuzzles.length > 0 ? ` · ${cachedPuzzles.length}/30` : ''}`} open={openSection === 'offline'} onToggle={() => toggle('offline')}>

        {/* Size picker + download */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {sizeOptions.map(s => (
            <button key={s} onClick={() => onPendingSizeChange(s)}
              className="flex-1 py-2 rounded-xl text-xs font-semibold"
              style={{
                background: pendingSize === s ? 'linear-gradient(135deg, #728bc0, #5a73a8)' : 'var(--surface-btn)',
                color: pendingSize === s ? 'white' : 'var(--btn-text)',
                border: 'none', cursor: 'pointer',
              }}
            >{s}×{s}</button>
          ))}
        </div>
        <button
          onClick={onAddToCache}
          disabled={cacheAdding || isCacheFull}
          className="w-full py-2 rounded-xl text-xs font-semibold mb-3"
          style={{
            border: '1.5px solid var(--primary)', background: 'none',
            color: 'var(--primary)', cursor: cacheAdding || isCacheFull ? 'default' : 'pointer',
            opacity: cacheAdding || isCacheFull ? 0.5 : 1,
          }}
        >
          {cacheAdding ? 'Downloading…' : isCacheFull ? 'Cache full (30/30)' : '↓ Add to Cache'}
        </button>
        {cacheAddError && <p className="text-xs mb-2" style={{ color: '#c0392b' }}>{cacheAddError}</p>}

        {/* Puzzle list */}
        {cachedPuzzles.length === 0 ? (
          <p className="text-xs text-center py-2" style={{ color: 'var(--text-light)' }}>No cached puzzles yet</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
            {cachedPuzzles.map(c => (
              <div
                key={c.id}
                onClick={() => setSelectedCachedId(prev => prev === c.id ? null : c.id)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: selectedCachedId === c.id ? 'rgba(114,139,192,0.08)' : 'var(--surface)',
                  borderRadius: 10, padding: '8px 10px',
                  border: `1.5px solid ${selectedCachedId === c.id ? 'var(--primary)' : 'transparent'}`,
                  cursor: 'pointer',
                }}
              >
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dark)' }}>
                    {c.puzzle.gridSize}×{c.puzzle.gridSize} · {c.puzzle.stars === 1 ? '1 star' : '2 stars'}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--text-mid)', marginTop: 1 }}>#{c.puzzle.code}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {c.completionTime != null && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--primary)' }}>
                      ✓ {Math.floor(c.completionTime / 60000).toString().padStart(2,'0')}:{Math.floor((c.completionTime % 60000) / 1000).toString().padStart(2,'0')}
                    </span>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); onRemoveCached(c.id); if (selectedCachedId === c.id) setSelectedCachedId(null) }}
                    style={{ background: 'none', border: 'none', fontSize: 14, color: 'var(--text-light)', cursor: 'pointer', padding: '2px 4px', lineHeight: 1 }}
                  >✕</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Play button */}
        <button
          onClick={() => {
            const c = cachedPuzzles.find(p => p.id === selectedCachedId)
            if (c) { onPlayCached(c); setSelectedCachedId(null) }
          }}
          disabled={!selectedCachedId}
          className="w-full py-2 rounded-xl text-sm font-semibold"
          style={{
            background: '#728bc0', color: 'white', border: 'none',
            cursor: selectedCachedId ? 'pointer' : 'default',
            opacity: selectedCachedId ? 1 : 0.4,
          }}
        >▶ Play selected</button>

      </Section>

      {/* Settings — collapsible */}
      <Section title="Settings" open={openSection === 'settings'} onToggle={() => toggle('settings')}>
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--sidebar-border)' }}>
          <Toggle on={darkMode} onToggle={onToggleDarkMode}
            label="Dark Mode" description="Navy dark theme" />
          {bd}
          <Toggle on={enhancedContrast} onToggle={onToggleEnhancedContrast}
            label="Enhanced Contrast" description="More vivid region colours" />
          {bd}
          <Toggle on={!hideTimer} onToggle={onToggleHideTimer}
            label="Show Timer" description="Display elapsed time while playing" />
          {bd}
          <Toggle on={singleTapMode} onToggle={onToggleSingleTap}
            label="Single Tap" description="Place a star directly — no X marks" />
          {bd}
          <Toggle on={autoCross} onToggle={onToggleAutoCross}
            label="Auto Cross" description="Cross out the cells a star rules out, and undo them if you move the star" />
          {bd}
          <Toggle on={highlightConflicts} onToggle={onToggleHighlightConflicts}
            label="Highlight Conflicts" description="Mark stars sharing a row, column, or touching" />
        </div>
      </Section>

      {/* How to Play — collapsible */}
      <Section title="How to Play" open={openSection === 'howToPlay'} onToggle={() => toggle('howToPlay')}>
        <div className="flex flex-col gap-2.5">
          <div className="rounded-xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--sidebar-border)' }}>
            <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-dark)' }}>Controls</p>
            <p className="text-xs leading-relaxed whitespace-pre-line" style={{ color: 'var(--text-mid)' }}>
              {singleTapMode
                ? 'Click a cell to place a star ★\nClick again to clear'
                : 'Click once for a mark ✕\nClick again to place a star ★\nClick again to clear'
              }
            </p>
          </div>
          {HOW_TO_PLAY.map(item => (
            <div key={item.title} className="rounded-xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--sidebar-border)' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-dark)' }}>{item.title}</p>
              <p className="text-xs leading-relaxed whitespace-pre-line" style={{ color: 'var(--text-mid)' }}>{item.text}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* About — collapsible */}
      <Section title="About" open={openSection === 'about'} onToggle={() => toggle('about')}>
        <div className="flex flex-col items-center text-center gap-4">
          <span style={{ fontSize: 48, color: 'var(--primary)' }}>★</span>
          <p className="text-lg font-semibold" style={{ color: 'var(--text-dark)' }}>Queens</p>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-mid)' }}>
            Thanks for playing! I built this simply because I love these puzzles and couldn&apos;t find a clean, ad-free version.
          </p>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-mid)' }}>
            There is zero data collection and no annoying ads here — just pure puzzles. This project is a true labor of love, so please enjoy it for free!
          </p>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-mid)' }}>
            If you&apos;d like to show your appreciation, you can buy me a decaf oat latte below. No reciprocation expected — it&apos;s purely a tip jar and won&apos;t unlock any extra features.
          </p>
          <a
            href="https://donate.stripe.com/5kQ14p1RcfQ20W8h2a0x200"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 rounded-xl text-sm font-semibold text-center block"
            style={{ background: '#728bc0', color: 'white', textDecoration: 'none' }}
          >
            ☕ Buy me a decaf oat latte
          </a>
          <a href="/privacy" className="text-xs" style={{ color: 'var(--text-mid)', textDecoration: 'none' }}>
            Privacy Policy
          </a>
        </div>
      </Section>

    </div>
  )
}
