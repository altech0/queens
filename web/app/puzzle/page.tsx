'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

const APP_STORE_URL = 'https://apps.apple.com/app/id6767413655'

function PuzzleRedirectInner() {
  const params = useSearchParams()
  const code = params.get('code') ?? ''

  useEffect(() => {
    if (!code) return

    window.location.href = `queens://puzzle/${code}`

    const fallback = setTimeout(() => {
      window.location.href = APP_STORE_URL
    }, 1500)

    const onBlur = () => clearTimeout(fallback)
    window.addEventListener('blur', onBlur)
    return () => {
      clearTimeout(fallback)
      window.removeEventListener('blur', onBlur)
    }
  }, [code])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      background: '#f8f9fc',
      color: '#667ab3',
    }}>
      <span style={{ fontSize: 52 }}>★</span>
      <p style={{ fontSize: 17, fontWeight: 600, color: '#3a4060', margin: 0 }}>Queens</p>
      <p style={{ fontSize: 14, color: '#9098b0', margin: 0 }}>
        {code ? `Opening puzzle #${code}…` : 'Puzzle not found.'}
      </p>
    </div>
  )
}

export default function PuzzleRedirect() {
  return (
    <Suspense>
      <PuzzleRedirectInner />
    </Suspense>
  )
}
