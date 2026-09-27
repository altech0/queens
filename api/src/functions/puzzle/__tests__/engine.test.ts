import { describe, it, expect, vi } from 'vitest'
import { puzzleV2Handler } from '../index'

const ROW = {
  id: 'p1', code: 10001, grid_size: 9, stars: 1,
  regions: '[[0]]', solution: '[[0]]', difficulty: 'hard', created_at: '2026-01-01',
  rand: 0.42, engine: 'snake-v1',
}

function makeCtx(query: Record<string, string>, firstResults: unknown[]) {
  const results = [...firstResults]
  const calls: { sql: string; binds: unknown[] }[] = []
  const ctx = {
    req: {
      param: vi.fn().mockReturnValue(undefined),
      query: vi.fn((key: string) => query[key]),
    },
    env: {
      DB: {
        prepare: vi.fn((sql: string) => ({
          bind: vi.fn((...binds: unknown[]) => {
            calls.push({ sql, binds })
            return {
              first: vi.fn(() => Promise.resolve(results.shift() ?? null)),
              run: vi.fn().mockResolvedValue({}),
            }
          }),
        })),
      },
    },
    get: vi.fn().mockReturnValue({ id: 'user-1' }),
    executionCtx: { waitUntil: vi.fn() },
    json: vi.fn((body: unknown, status?: number) => ({ body, status: status ?? 200 })),
  }
  const selects = () => calls.filter(c => c.sql.startsWith('SELECT'))
  return { ctx, selects, json: ctx.json }
}

const call = async (query: Record<string, string>, rows: unknown[] = [ROW]) => {
  const { ctx, selects, json } = makeCtx(query, rows)
  const res = await puzzleV2Handler(ctx as never) as unknown as { body: Record<string, unknown>; status: number }
  return { res, selects, json }
}

describe('engine filter', () => {
  it('defaults to Original only when no engine is given', async () => {
    const { selects } = await call({ size: '8', stars: '1' })
    const { sql, binds } = selects()[0]
    expect(sql).toMatch(/WHERE engine IN \(\?\)/)
    expect(binds[0]).toBe('voronoi-v2')
  })

  it('filters on a single requested engine', async () => {
    const { selects } = await call({ engine: 'snake-v1', size: '9', stars: '1' })
    const { sql, binds } = selects()[0]
    expect(sql).toMatch(/WHERE engine IN \(\?\) AND grid_size = \? AND stars = \?/)
    expect(binds.slice(0, 3)).toEqual(['snake-v1', 9, 1])
  })

  it('accepts a comma list of engines', async () => {
    const { selects } = await call({ engine: 'snake-v1,snake-harden-v1', size: '9' })
    const { sql, binds } = selects()[0]
    expect(sql).toMatch(/WHERE engine IN \(\?,\?\)/)
    expect(binds.slice(0, 2)).toEqual(['snake-v1', 'snake-harden-v1'])
  })

  it('tolerates whitespace in the list', async () => {
    const { selects } = await call({ engine: ' snake-v1 , snake-harden-v1 ', size: '9' })
    expect(selects()[0].binds.slice(0, 2)).toEqual(['snake-v1', 'snake-harden-v1'])
  })

  it('rejects an unknown engine', async () => {
    const { res } = await call({ engine: 'not-an-engine' })
    expect(res.status).toBe(400)
  })

  it('rejects an unknown engine even alongside a known one', async () => {
    const { res } = await call({ engine: 'snake-v1,nope' })
    expect(res.status).toBe(400)
  })

  it('returns the engine in the response', async () => {
    const { res } = await call({ engine: 'snake-v1', size: '9', stars: '1' })
    expect(res.body.engine).toBe('snake-v1')
  })

  it('keeps the engine clause ahead of the rand seek on the wrap query too', async () => {
    const { selects } = await call({ engine: 'snake-v1', size: '9' }, [null, ROW])
    expect(selects()).toHaveLength(2)
    expect(selects()[1].sql).toMatch(/WHERE engine IN \(\?\) AND grid_size = \? ORDER BY rand LIMIT 1$/)
  })
})

describe('per-engine size validation', () => {
  it('allows 9x9 for a snake engine', async () => {
    const { res } = await call({ engine: 'snake-v1', size: '9', stars: '1' })
    expect(res.status).toBe(200)
  })

  it('rejects 9x9 for Original', async () => {
    const { res } = await call({ engine: 'voronoi-v2', size: '9', stars: '1' })
    expect(res.status).toBe(400)
  })

  it('rejects 5x5 for a snake engine', async () => {
    const { res } = await call({ engine: 'snake-v1', size: '5', stars: '1' })
    expect(res.status).toBe(400)
  })

  it('rejects 2-star for a snake engine', async () => {
    const { res } = await call({ engine: 'snake-v1', size: '10', stars: '2' })
    expect(res.status).toBe(400)
  })

  it('unions the allowed sizes across several engines', async () => {
    // 5 comes from Original, 9 from the snakes.
    for (const size of ['5', '9']) {
      const { res } = await call({ engine: 'voronoi-v2,snake-v1', size, stars: '1' })
      expect(res.status).toBe(200)
    }
  })
})

describe('engine with a code lookup', () => {
  it('rejects engine combined with a code', async () => {
    const { ctx } = makeCtx({ engine: 'snake-v1' }, [ROW])
    ctx.req.param = vi.fn().mockReturnValue('10001')
    const res = await puzzleV2Handler(ctx as never) as unknown as { status: number }
    expect(res.status).toBe(400)
  })
})
