import type { Puzzle } from './types'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.queens.knittedmice.com'

let tokenPromise: Promise<string> | null = null

async function getToken(): Promise<string> {
  if (typeof window === 'undefined') return ''

  const stored = localStorage.getItem('queens_token')
  if (stored) return stored

  if (!tokenPromise) {
    tokenPromise = register().finally(() => { tokenPromise = null })
  }
  return tokenPromise
}

async function register(): Promise<string> {
  const res = await fetch(`${API}/auth/register`, { method: 'POST' })
  if (!res.ok) throw new Error(`Registration failed: ${res.status}`)
  const data = await res.json() as { api_token: string }
  localStorage.setItem('queens_token', data.api_token)
  return data.api_token
}

export async function fetchPuzzle(size?: number, stars?: number): Promise<Puzzle> {
  const token = await getToken()
  const params = new URLSearchParams()
  if (size)  params.set('size',  String(size))
  if (stars) params.set('stars', String(stars))

  const res = await fetch(`${API}/puzzle?${params}`, {
    headers: { 'X-API-Token': token },
  })
  if (!res.ok) throw new Error(`Failed to fetch puzzle: ${res.status}`)
  return res.json()
}

export async function fetchPuzzleByCode(code: string): Promise<Puzzle> {
  const token = await getToken()
  const res = await fetch(`${API}/puzzle?code=${encodeURIComponent(code)}`, {
    headers: { 'X-API-Token': token },
  })
  if (res.status === 404) throw new Error('Puzzle not found')
  if (!res.ok) throw new Error(`Failed to fetch puzzle: ${res.status}`)
  return res.json()
}
