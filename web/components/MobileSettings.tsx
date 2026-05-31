'use client'

import Toggle from './Toggle'

interface MobileSettingsProps {
  onClose: () => void
  hideTimer: boolean
  onToggleHideTimer: () => void
  highlightConflicts: boolean
  onToggleHighlightConflicts: () => void
  singleTapMode: boolean
  onToggleSingleTap: () => void
  enhancedContrast: boolean
  onToggleEnhancedContrast: () => void
  darkMode: boolean
  onToggleDarkMode: () => void
}

const bd = <div style={{ height: 1, background: 'var(--sidebar-border)', margin: '0' }} />

export default function MobileSettings({
  onClose,
  hideTimer, onToggleHideTimer,
  highlightConflicts, onToggleHighlightConflicts,
  singleTapMode, onToggleSingleTap,
  enhancedContrast, onToggleEnhancedContrast,
  darkMode, onToggleDarkMode,
}: MobileSettingsProps) {
  return (
    <div className="mobile-screen">
      {/* Nav */}
      <div className="mobile-nav">
        <button className="mobile-nav-icon" onClick={onClose} aria-label="Back">
          ‹
        </button>
        <span className="mobile-nav-title">Settings</span>
        <div style={{ width: 36 }} />
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        <div className="mobile-settings-group">
          <Toggle on={darkMode} onToggle={onToggleDarkMode} label="Dark Mode" description="Navy dark theme" />
          {bd}
          <Toggle on={!hideTimer} onToggle={onToggleHideTimer} label="Show Timer" description="Display elapsed time while playing" />
          {bd}
          <Toggle on={highlightConflicts} onToggle={onToggleHighlightConflicts} label="Highlight Conflicts" description="Mark stars sharing a row, column, or touching" />
          {bd}
          <Toggle on={singleTapMode} onToggle={onToggleSingleTap} label="Single Tap" description="Place a star directly — no X marks" />
          {bd}
          <Toggle on={enhancedContrast} onToggle={onToggleEnhancedContrast} label="Enhanced Contrast" description="More vivid region colours" />
        </div>
      </div>
    </div>
  )
}
