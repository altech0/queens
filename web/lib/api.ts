import type { Puzzle } from './types'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.queens.knittedmice.com'

const ADJECTIVES = ['Happy','Silly','Clever','Brave','Gentle','Cheerful','Bright','Swift','Proud','Quiet',
  'Mighty','Tiny','Bouncy','Fuzzy','Sparkly','Jolly','Lucky','Merry','Peppy','Snappy',
  'Sunny','Zippy','Chipper','Daring','Eager','Fancy','Giddy','Heroic','Jazzy','Keen']

const NOUNS = ['Panda','Koala','Penguin','Otter','Rabbit','Dolphin','Elephant','Giraffe','Lemur','Lynx',
  'Meerkat','Narwhal','Okapi','Quokka','Raccoon','Seahorse','Sloth','Toucan','Walrus','Zebra',
  'Axolotl','Capybara','Dingo','Ferret','Gecko','Hamster','Iguana','Jaguar','Kiwi','Llama']

function randomNickname(): string {
  const adj  = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)]
  const num  = Math.floor(Math.random() * 900) + 100
  return `${adj}${noun}${num}`
}

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
  for (let i = 0; i < 10; i++) {
    const nickname = randomNickname()
    const res = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname }),
    })
    if (res.status === 409) continue
    if (!res.ok) throw new Error(`Registration failed: ${res.status}`)
    const data = await res.json() as { api_token: string }
    localStorage.setItem('queens_token', data.api_token)
    return data.api_token
  }
  throw new Error('Could not find available nickname')
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
