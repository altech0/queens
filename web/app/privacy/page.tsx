export const metadata = { title: 'Privacy Policy — Queens' }

export default function Privacy() {
  return (
    <div style={{ background: '#0f1117', minHeight: '100vh', padding: '48px 24px' }}>
      <div style={{ maxWidth: 680, margin: '0 auto', fontFamily: "'DM Sans', 'Trebuchet MS', sans-serif", lineHeight: 1.7 }}>

        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#f0f4ff', marginBottom: 8 }}>Privacy Policy</h1>
        <p style={{ fontSize: 13, color: '#7a8499', marginBottom: 48 }}>Queens · Last updated: May 2026</p>

        <div style={{ background: '#1e2130', border: '1px solid #2d3347', borderRadius: 10, padding: '20px 24px', marginBottom: 24 }}>
          <p style={{ color: '#c8d0e8', fontSize: 15, margin: 0 }}>Just puzzles. That&apos;s it.</p>
        </div>

        <p style={{ color: '#c8d0e8', fontSize: 15, marginBottom: 16 }}>
          Queens is the internet as it should be — no ads, no tracking, no accounts, no nonsense. Just a good puzzle, free forever.
        </p>

        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#f0f4ff', marginTop: 40, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.8px' }}>What We Collect</h2>
        <p style={{ color: '#c8d0e8', fontSize: 15, marginBottom: 16 }}>Nothing. Absolutely nothing. We don&apos;t know who you are and we don&apos;t want to.</p>

        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#f0f4ff', marginTop: 40, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.8px' }}>What We Do Not Do</h2>
        <ul style={{ margin: '0 0 16px 20px' }}>
          {[
            'No advertising — none, ever',
            'No analytics or behavioural tracking',
            'No selling or sharing of data with anyone',
            'No in-app purchases or subscriptions',
            'No accounts, no sign-ups, no nicknames',
          ].map(item => (
            <li key={item} style={{ color: '#c8d0e8', fontSize: 15, marginBottom: 8 }}>{item}</li>
          ))}
        </ul>

        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#f0f4ff', marginTop: 40, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.8px' }}>The Small Print</h2>
        <p style={{ color: '#c8d0e8', fontSize: 15, marginBottom: 16 }}>There is no small print.</p>

        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#f0f4ff', marginTop: 40, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Contact</h2>
        <p style={{ color: '#c8d0e8', fontSize: 15 }}>
          Questions or just want to say hi:{' '}
          <a href="mailto:hello@knittedmice.com" style={{ color: '#4f6ef7', textDecoration: 'none' }}>hello@knittedmice.com</a>
        </p>

      </div>
    </div>
  )
}
