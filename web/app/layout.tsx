import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Queens',
  description: 'A clean, calming logic puzzle. No ads, no nonsense.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="h-full">{children}</body>
    </html>
  )
}
