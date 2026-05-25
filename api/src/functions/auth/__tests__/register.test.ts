import { describe, it, expect, vi } from 'vitest'
import { registerHandler } from '../index'

const NICK_SQL = 'SELECT id FROM users WHERE nickname = ?'

function makeCtx(body: object | null, dbResponses: Record<string, any> = {}) {
  return {
    req: {
      json: body === null
        ? vi.fn().mockRejectedValue(new Error('bad json'))
        : vi.fn().mockResolvedValue(body),
    },
    env: {
      DB: {
        prepare: vi.fn().mockImplementation((sql: string) => ({
          bind: vi.fn().mockReturnValue({
            first: vi.fn().mockResolvedValue(dbResponses[sql] ?? null),
            run:   vi.fn().mockResolvedValue({}),
          }),
        })),
      },
    },
    json: vi.fn(),
  }
}

describe('POST /auth/register', () => {
  it('rejects invalid JSON', async () => {
    const ctx = makeCtx(null)
    await registerHandler(ctx as any)
    expect(ctx.json).toHaveBeenCalledWith({ error: 'Invalid JSON' }, 400)
  })

  it('rejects invalid nickname', async () => {
    const ctx = makeCtx({ nickname: '<bad>' })
    await registerHandler(ctx as any)
    expect(ctx.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('invalid') }), 400
    )
  })

  it('rejects duplicate nickname', async () => {
    const ctx = makeCtx(
      { nickname: 'TakenNick' },
      { [NICK_SQL]: { id: 'other-user' } }
    )
    await registerHandler(ctx as any)
    expect(ctx.json).toHaveBeenCalledWith({ error: 'Nickname already taken' }, 409)
  })

  it('returns api_token and user_id on success', async () => {
    const ctx = makeCtx({ nickname: 'NewUser' })
    await registerHandler(ctx as any)
    expect(ctx.json).toHaveBeenCalledWith(
      expect.objectContaining({
        api_token: expect.any(String),
        user_id:   expect.any(String),
        nickname:  'NewUser',
      }),
      201
    )
  })
})
