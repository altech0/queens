'use client'

import { useState } from 'react'

export default function Win95Ad() {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: 32,
      right: 32,
      zIndex: 9999,
      width: 280,
      fontFamily: '"MS Sans Serif", "Microsoft Sans Serif", Arial, sans-serif',
      fontSize: 11,
      userSelect: 'none',
      filter: 'drop-shadow(4px 4px 0px rgba(0,0,0,0.4))',
    }}>
      {/* Title bar */}
      <div style={{
        background: 'linear-gradient(to right, #000080, #1084d0)',
        padding: '3px 4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 11 }}>♛</span>
          <span style={{ color: 'white', fontWeight: 'bold', fontSize: 11 }}>Queens Dashboard</span>
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          <button
            onClick={() => setDismissed(true)}
            style={{
              width: 16, height: 14,
              background: '#c0c0c0',
              border: '1px solid',
              borderColor: '#ffffff #808080 #808080 #ffffff',
              fontSize: 10,
              lineHeight: 1,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'inherit',
              padding: 0,
            }}
          >✕</button>
        </div>
      </div>

      {/* Body */}
      <div style={{
        background: '#c0c0c0',
        border: '1px solid',
        borderColor: '#ffffff #808080 #808080 #ffffff',
        padding: '12px 14px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}>
        {/* Inset content area */}
        <div style={{
          background: 'white',
          border: '1px solid',
          borderColor: '#808080 #ffffff #ffffff #808080',
          padding: '8px 10px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 22, marginBottom: 4 }}>📊</div>
          <div style={{ fontWeight: 'bold', fontSize: 12, color: '#000080', marginBottom: 3 }}>
            YOU HAVE WON A PRIZE!
          </div>
          <div style={{ color: '#000', fontSize: 11, lineHeight: 1.4 }}>
            Congratulations! Click below to claim your<br />
            <strong>FREE puzzle database dashboard!</strong>
          </div>
          <div style={{ marginTop: 6, fontSize: 10, color: '#808080' }}>
            ★★★ LIMITED TIME OFFER ★★★
          </div>
        </div>

        {/* CTA button */}
        <a
          href="https://dashboard.queens.knittedmice.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: 'none' }}
        >
          <button style={{
            width: '100%',
            padding: '5px 0',
            background: '#c0c0c0',
            border: '2px solid',
            borderColor: '#ffffff #808080 #808080 #ffffff',
            fontSize: 11,
            fontFamily: 'inherit',
            fontWeight: 'bold',
            cursor: 'pointer',
            color: '#000',
          }}>
            CLICK HERE TO CLAIM →
          </button>
        </a>

        <div style={{ textAlign: 'center', fontSize: 9, color: '#808080', marginTop: -4 }}>
          This is not a virus. Probably.
        </div>
      </div>
    </div>
  )
}
