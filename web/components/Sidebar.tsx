'use client'

import { useState } from 'react'
import Toggle from './Toggle'

interface SidebarProps {
  size: number
  onSizeChange: (s: number) => void
  onNewGame: () => void
  elapsed: number
  hideTimer: boolean
  onToggleHideTimer: () => void
  highlightConflicts: boolean
  onToggleHighlightConflicts: () => void
  singleTapMode: boolean
  onToggleSingleTap: () => void
  enhancedContrast: boolean
  onToggleEnhancedContrast: () => void
  loading: boolean
  completed: boolean
  puzzleActive: boolean
}

const VALID_STARS: Record<number, number[]> = { 6: [1], 8: [1], 10: [2] }
const DEFAULT_STARS: Record<number, number> = { 6: 1, 8: 1, 10: 2 }

function formatTime(ms: number) {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
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
            transition: 'transform 0.15s',
            flexShrink: 0,
          }}
        >
          <path d="M2 4l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
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
  size, onSizeChange, onNewGame,
  elapsed, hideTimer, onToggleHideTimer,
  highlightConflicts, onToggleHighlightConflicts,
  singleTapMode, onToggleSingleTap,
  enhancedContrast, onToggleEnhancedContrast,
  loading, completed, puzzleActive,
}: SidebarProps) {
  const [gameInfoOpen, setGameInfoOpen]   = useState(true)
  const [settingsOpen, setSettingsOpen]   = useState(false)
  const [howToOpen, setHowToOpen]         = useState(false)
  const [aboutOpen, setAboutOpen]         = useState(false)

  const bd = <div style={{ height: 1, background: 'var(--sidebar-border)', margin: '2px 0' }} />
  const validStars = VALID_STARS[size]
  const currentStars = DEFAULT_STARS[size]

  return (
    <div className="flex flex-col h-full">

      {/* Timer — only when puzzle is active */}
      {puzzleActive && !hideTimer && (
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--sidebar-border)' }}>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-mid)' }}>Time</p>
          <p className="text-3xl font-mono font-semibold tabular-nums"
            style={{ color: completed ? '#5a73a8' : 'var(--text-dark)' }}>
            {formatTime(elapsed)}
          </p>
        </div>
      )}

      {/* Game Info — collapsible */}
      <Section title="Game Info" open={gameInfoOpen} onToggle={() => setGameInfoOpen(v => !v)}>

        {/* Grid size */}
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-mid)' }}>Size</p>
        <div className="flex gap-2 mb-5">
          {[6, 8, 10].map(s => (
            <button
              key={s}
              onClick={() => onSizeChange(s)}
              className="flex-1 py-3 rounded-xl font-semibold transition-all"
              style={{
                fontSize: 16,
                background: size === s ? 'linear-gradient(135deg, #728bc0, #5a73a8)' : 'rgba(235,233,245,0.8)',
                color: size === s ? 'white' : 'var(--primary)',
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
                  background: selected && available ? 'linear-gradient(135deg, #728bc0, #5a73a8)' : 'rgba(235,233,245,0.8)',
                  color: selected && available ? 'white' : available ? 'var(--primary)' : 'var(--text-light)',
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

      {/* Settings — collapsible */}
      <Section title="Settings" open={settingsOpen} onToggle={() => setSettingsOpen(v => !v)}>
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--sidebar-border)' }}>
          <Toggle on={enhancedContrast} onToggle={onToggleEnhancedContrast}
            label="Enhanced Contrast" description="More vivid region colours" />
          {bd}
          <Toggle on={!hideTimer} onToggle={onToggleHideTimer}
            label="Show Timer" description="Display elapsed time while playing" />
          {bd}
          <Toggle on={singleTapMode} onToggle={onToggleSingleTap}
            label="Single Tap" description="Place a star directly — no X marks" />
          {bd}
          <Toggle on={highlightConflicts} onToggle={onToggleHighlightConflicts}
            label="Highlight Conflicts" description="Mark stars sharing a row, column, or touching" />
        </div>
      </Section>

      {/* How to Play — collapsible */}
      <Section title="How to Play" open={howToOpen} onToggle={() => setHowToOpen(v => !v)}>
        <div className="flex flex-col gap-2.5">
          <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid var(--sidebar-border)' }}>
            <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-dark)' }}>Controls</p>
            <p className="text-xs leading-relaxed whitespace-pre-line" style={{ color: 'var(--text-mid)' }}>
              {singleTapMode
                ? 'Click a cell to place a star ★\nClick again to clear'
                : 'Click once for a mark ✕\nClick again to place a star ★\nClick again to clear'
              }
            </p>
          </div>
          {HOW_TO_PLAY.map(item => (
            <div key={item.title} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid var(--sidebar-border)' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-dark)' }}>{item.title}</p>
              <p className="text-xs leading-relaxed whitespace-pre-line" style={{ color: 'var(--text-mid)' }}>{item.text}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* About — collapsible */}
      <Section title="About" open={aboutOpen} onToggle={() => setAboutOpen(v => !v)}>
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
