// 2–20 chars, alphanumeric + hyphen/underscore/single-internal-spaces, no HTML chars
const NICKNAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9 _-]{0,18}[a-zA-Z0-9]$|^[a-zA-Z0-9]{1,2}$/

export function validateNickname(raw: unknown): { valid: boolean; error?: string } {
  if (typeof raw !== 'string') return { valid: false, error: 'Nickname must be a string' }
  const trimmed = raw.trim()
  if (trimmed.length < 2)  return { valid: false, error: 'Nickname must be at least 2 characters' }
  if (trimmed.length > 20) return { valid: false, error: 'Nickname must be at most 20 characters' }
  if (/<|>|&|"|'|`|\/|\\/.test(trimmed)) return { valid: false, error: 'Nickname contains invalid characters' }
  if (/\s{2,}/.test(trimmed)) return { valid: false, error: 'Nickname cannot contain consecutive spaces' }
  if (!NICKNAME_RE.test(trimmed)) return { valid: false, error: 'Nickname contains invalid characters' }
  return { valid: true }
}

export function sanitiseNickname(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ')
}
