'use client'

export default function Toggle({ on, onToggle, label, description }: {
  on: boolean
  onToggle: () => void
  label: string
  description?: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 px-4 cursor-pointer" onClick={onToggle}>
      <div>
        <p className="text-sm font-medium" style={{ color: 'var(--text-dark)' }}>{label}</p>
        {description && (
          <p className="text-xs mt-0.5 leading-snug" style={{ color: 'var(--text-mid)' }}>{description}</p>
        )}
      </div>
      <div
        className="w-9 h-5 rounded-full transition-colors relative shrink-0"
        style={{ background: on ? '#728bc0' : '#d0d4e0' }}
      >
        <div
          className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
          style={{ transform: on ? 'translateX(18px)' : 'translateX(2px)' }}
        />
      </div>
    </div>
  )
}
