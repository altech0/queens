import type { Puzzle, CatalogueStyle } from './types'
import { DEFAULT_ENGINE, FALLBACK_STYLES, ALL_DIFFICULTIES } from './catalogue'

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
  const res = await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'X-Client-Source': 'web' },
  })
  if (!res.ok) throw new Error(`Registration failed: ${res.status}`)
  const data = await res.json() as { api_token: string }
  localStorage.setItem('queens_token', data.api_token)
  return data.api_token
}

async function authedFetch(url: string, retried = false): Promise<Response> {
  const token = await getToken()
  const res = await fetch(url, { headers: { 'X-API-Token': token } })
  if (res.status === 401 && !retried) {
    localStorage.removeItem('queens_token')
    tokenPromise = null
    return authedFetch(url, true)
  }
  return res
}

/**
 * What styles the API has. Falls back to Original-only rather than throwing: a
 * failure here must not stop someone playing, and an API predating styles has
 * no `/catalogue` at all (404).
 */
export async function fetchCatalogue(): Promise<CatalogueStyle[]> {
  try {
    const res = await authedFetch(`${API}/catalogue`)
    if (!res.ok) return FALLBACK_STYLES
    const data = await res.json() as { styles?: CatalogueStyle[] }
    // An empty list would leave the picker with nothing to select.
    return data.styles?.length ? data.styles : FALLBACK_STYLES
  } catch {
    return FALLBACK_STYLES
  }
}

/**
 * How many times to re-ask when the API hands back the puzzle just played.
 *
 * Selection is stateless server side (a random seek on `rand`), so a small pool
 * repeats often: at four puzzles a combo returns the same board roughly every
 * fourth request. Retrying client side fixes that without the server having to
 * track what each player has seen.
 *
 * Bounded, and deliberately low: a combo with a single puzzle would otherwise
 * spin forever, and each attempt is a real request. After this many tries the
 * repeat is accepted — showing the same board beats showing an error.
 */
const AVOID_REPEAT_ATTEMPTS = 4

export async function fetchPuzzle(
  size?: number,
  stars?: number,
  engine?: string,
  difficulties?: string[],
  /** Code of the puzzle just played, to avoid serving it again. */
  avoidCode?: number,
): Promise<Puzzle> {
  const params = new URLSearchParams()
  if (size)  params.set('size',  String(size))
  if (stars) params.set('stars', String(stars))
  // Omitted for Original: no param already means Original, and an API deployed
  // before styles would reject an unknown value.
  if (engine && engine !== DEFAULT_ENGINE) params.set('engine', engine)
  // Only sent when it is a real subset — all-selected means no filter, which
  // keeps the URL (and the API's query plan) identical to not asking at all.
  if (difficulties?.length && difficulties.length < ALL_DIFFICULTIES.length) {
    const ordered = ALL_DIFFICULTIES.filter(d => difficulties.includes(d))
    params.set('difficulty', ordered.join(','))
  }

  let puzzle: Puzzle | undefined
  for (let attempt = 0; attempt < AVOID_REPEAT_ATTEMPTS; attempt++) {
    const res = await authedFetch(`${API}/puzzle?${params}`)
    if (!res.ok) throw new Error(`Failed to fetch puzzle: ${res.status}`)
    puzzle = await res.json() as Puzzle
    if (avoidCode === undefined || puzzle.code !== avoidCode) return puzzle
  }
  // Every attempt came back with the same puzzle, so the pool is effectively
  // one board for these filters. Return it rather than failing.
  return puzzle as Puzzle
}

export async function fetchPuzzleByCode(code: string): Promise<Puzzle> {
  const res = await authedFetch(`${API}/puzzle?code=${encodeURIComponent(code)}`)
  if (res.status === 404) throw new Error('Puzzle not found')
  if (!res.ok) throw new Error(`Failed to fetch puzzle: ${res.status}`)
  return res.json()
}
