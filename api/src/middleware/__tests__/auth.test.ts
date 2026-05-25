import { describe, it, expect, vi } from 'vitest'
import { tokenAuth } from '../auth'

function makeCtx(token: string | null, dbRow: object | null) {
  return {
    req: { header: (name: string) => name === 'X-API-Token' ? token : null },
    env: {
      DB: {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({
            first: vi.fn().mockResolvedValue(dbRow),
          }),
        }),
      },
    },
    set: vi.fn(),
    json: vi.fn(),
  }
}

describe('tokenAuth', () => {
  it('rejects missing token with 401', async () => {
    const ctx = makeCtx(null, null)
    await tokenAuth(ctx as any, vi.fn())
    expect(ctx.json).toHaveBeenCalledWith({ error: 'Unauthorized' }, 401)
  })

  it('rejects unknown token with 401', async () => {
    const ctx = makeCtx('bad-token', null)
    await tokenAuth(ctx as any, vi.fn())
    expect(ctx.json).toHaveBeenCalledWith({ error: 'Unauthorized' }, 401)
  })

  it('sets user context and calls next on valid token', async () => {
    const user = { id: 'uuid-1', nickname: 'PuzzleFox' }
    const ctx  = makeCtx('valid-token', user)
    const next = vi.fn()
    await tokenAuth(ctx as any, next)
    expect(ctx.set).toHaveBeenCalledWith('user', user)
    expect(next).toHaveBeenCalled()
  })
})
