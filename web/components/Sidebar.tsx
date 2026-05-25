'use client'

interface SidebarProps {
  size: number
  stars: number
  onSizeChange: (s: number) => void
  onNewGame: () => void
  elapsed: number
  hideTimer: boolean
  onToggleHideTimer: () => void
  highlightConflicts: boolean
  onToggleHighlightConflicts: () => void
  loading: boolean
  completed: boolean
}

const CONFIGS = [
  { size: 6,  stars: 1, label: '6×6' },
  { size: 8,  stars: 1, label: '8×8' },
  { size: 10, stars: 2, label: '10×10' },
]

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

function Toggle({ on, onToggle, label, description }: {
  on: boolean
  onToggle: () => void
  label: string
  description: string
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <div
        onClick={onToggle}
        className="mt-0.5 w-9 h-5 rounded-full transition-colors relative shrink-0 cursor-pointer"
        style={{ background: on ? '#728bc0' : '#d0d4e0' }}
      >
        <div
          className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
          style={{ transform: on ? 'translateX(18px)' : 'translateX(2px)' }}
        />
      </div>
      <div>
        <p className="text-sm font-medium" style={{ color: 'var(--text-dark)' }}>{label}</p>
        <p className="text-xs leading-snug mt-0.5" style={{ color: 'var(--text-mid)' }}>{description}</p>
      </div>
    </label>
  )
}

export default function Sidebar({
  size, onSizeChange, onNewGame, elapsed, hideTimer,
  onToggleHideTimer, highlightConflicts, onToggleHighlightConflicts,
  loading, completed,
}: SidebarProps) {
  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ borderRight: '1px solid var(--sidebar-border)' }}>

      {/* Logo */}
      <div className="p-6 pb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">★</span>
          <span className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--text-dark)' }}>Queens</span>
        </div>
        <p className="text-xs mt-1" style={{ color: 'var(--text-mid)' }}>No ads. No nonsense.</p>
      </div>

      <div className="flex-1 flex flex-col gap-6 px-5 pb-6">

        {/* Timer */}
        {!hideTimer && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-mid)' }}>Time</p>
            <p
              className="text-3xl font-mono font-semibold tabular-nums"
              style={{ color: completed ? '#5a73a8' : 'var(--text-dark)' }}
            >
              {formatTime(elapsed)}
            </p>
          </div>
        )}

        {/* Size selector */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-mid)' }}>Puzzle Size</p>
          <div className="flex flex-col gap-1.5">
            {CONFIGS.map(cfg => (
              <button
                key={cfg.size}
                onClick={() => onSizeChange(cfg.size)}
                className="w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: size === cfg.size ? '#728bc0' : 'rgba(255,255,255,0.6)',
                  color: size === cfg.size ? 'white' : 'var(--text-dark)',
                  border: `1px solid ${size === cfg.size ? '#728bc0' : 'var(--sidebar-border)'}`,
                }}
              >
                {cfg.label} · {cfg.stars === 1 ? '1 star per region' : '2 stars per region'}
              </button>
            ))}
          </div>
        </div>

        {/* New Game */}
        <button
          onClick={onNewGame}
          disabled={loading}
          className="w-full py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
          style={{ background: '#728bc0', color: 'white' }}
        >
          {loading ? 'Loading…' : completed ? 'Next Puzzle' : 'New Game'}
        </button>

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--sidebar-border)' }} />

        {/* Settings */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--text-mid)' }}>Settings</p>
          <div className="flex flex-col gap-4">
            <Toggle
              on={!hideTimer}
              onToggle={onToggleHideTimer}
              label="Show Timer"
              description="Display elapsed time while playing"
            />
            <Toggle
              on={highlightConflicts}
              onToggle={onToggleHighlightConflicts}
              label="Highlight Conflicts"
              description="Mark stars that share a row, column, or are touching"
            />
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--sidebar-border)' }} />

        {/* How to play */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-mid)' }}>How to Play</p>
          <ul className="flex flex-col gap-2">
            {[
              'Place one star in every row, column, and coloured region',
              'No two stars can touch — not even diagonally',
              'Click to place a mark ✕, click again to place a star ★, click again to clear',
            ].map((tip, i) => (
              <li key={i} className="flex gap-2 text-xs leading-snug" style={{ color: 'var(--text-mid)' }}>
                <span className="shrink-0 font-semibold" style={{ color: 'var(--primary)' }}>{i + 1}.</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
