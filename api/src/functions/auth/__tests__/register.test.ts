import { describe, it, expect, vi } from 'vitest'
import { registerHandler } from '../index'

function makeCtx(insertSucceeds = true) {
  let callCount = 0
  return {
    req: {
      json: vi.fn().mockResolvedValue({}),
    },
    env: {
      DB: {
        prepare: vi.fn().mockImplementation(() => ({
          bind: vi.fn().mockReturnValue({
            run: vi.fn().mockImplementation(() => {
              callCount++
              if (!insertSucceeds) throw new Error('UNIQUE constraint failed: users.nickname')
              return Promise.resolve({})
            }),
          }),
        })),
      },
    },
    json: vi.fn(),
    _callCount: () => callCount,
  }
}

describe('POST /auth/register', () => {
  it('creates a user with a generated nickname and returns api_token', async () => {
    const ctx = makeCtx()
    await registerHandler(ctx as any)
    expect(ctx.json).toHaveBeenCalledWith(
      expect.objectContaining({
        api_token: expect.any(String),
        user_id:   expect.any(String),
        nickname:  expect.any(String),
      }),
      201
    )
  })

  it('retries on nickname collision and eventually succeeds', async () => {
    let attempts = 0
    const ctx = {
      req: { json: vi.fn().mockResolvedValue({}) },
      env: {
        DB: {
          prepare: vi.fn().mockImplementation(() => ({
            bind: vi.fn().mockReturnValue({
              run: vi.fn().mockImplementation(() => {
                attempts++
                if (attempts < 3) throw new Error('UNIQUE constraint failed: users.nickname')
                return Promise.resolve({})
              }),
            }),
          })),
        },
      },
      json: vi.fn(),
    }
    await registerHandler(ctx as any)
    expect(attempts).toBe(3)
    expect(ctx.json).toHaveBeenCalledWith(
      expect.objectContaining({ api_token: expect.any(String) }),
      201
    )
  })

  it('returns 500 if all attempts fail', async () => {
    const ctx = {
      req: { json: vi.fn().mockResolvedValue({}) },
      env: {
        DB: {
          prepare: vi.fn().mockImplementation(() => ({
            bind: vi.fn().mockReturnValue({
              run: vi.fn().mockRejectedValue(new Error('UNIQUE constraint failed: users.nickname')),
            }),
          })),
        },
      },
      json: vi.fn(),
    }
    await registerHandler(ctx as any)
    expect(ctx.json).toHaveBeenCalledWith(
      { error: 'Failed to register — please try again' },
      500
    )
  })
})
