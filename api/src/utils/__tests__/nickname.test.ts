import { describe, it, expect } from 'vitest'
import { validateNickname, sanitiseNickname } from '../nickname'

describe('validateNickname', () => {
  it('accepts valid nicknames', () => {
    expect(validateNickname('PuzzleFox').valid).toBe(true)
    expect(validateNickname('ab').valid).toBe(true)
    expect(validateNickname('Star-Player_1').valid).toBe(true)
    expect(validateNickname('A'.repeat(20)).valid).toBe(true)
    expect(validateNickname('Puzzle Fox').valid).toBe(true)
  })

  it('rejects too short', () => {
    expect(validateNickname('a').valid).toBe(false)
    expect(validateNickname('').valid).toBe(false)
  })

  it('rejects too long', () => {
    expect(validateNickname('A'.repeat(21)).valid).toBe(false)
  })

  it('rejects HTML and script injection characters', () => {
    expect(validateNickname('<script>alert(1)</script>').valid).toBe(false)
    expect(validateNickname('foo<bar').valid).toBe(false)
    expect(validateNickname('"hello"').valid).toBe(false)
    expect(validateNickname("it's").valid).toBe(false)
    expect(validateNickname('foo`bar').valid).toBe(false)
  })

  it('rejects consecutive spaces', () => {
    expect(validateNickname('foo  bar').valid).toBe(false)
  })

  it('rejects non-string input', () => {
    expect(validateNickname(123 as any).valid).toBe(false)
    expect(validateNickname(null as any).valid).toBe(false)
  })
})

describe('sanitiseNickname', () => {
  it('trims surrounding whitespace', () => {
    expect(sanitiseNickname('  foo  ')).toBe('foo')
  })

  it('collapses internal spaces', () => {
    expect(sanitiseNickname('foo  bar')).toBe('foo bar')
  })
})
