import { describe, it, expect, vi } from 'vitest'
import { puzzleV2Handler } from '../index'

const ROW = {
  id: 'p1', code: 10001, grid_size: 8, stars: 1,
  regions: '[[0]]', solution: '[[0]]', difficulty: 'easy', created_at: '2026-01-01', rand: 0.42,
}

/** Minimal Hono-ish context. `firstResults` is consumed in order by each `.first()` call. */
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

describe('GET /puzzle (random)', () => {
  it('picks a puzzle with a single rand seek on the size/stars filter', async () => {
    const { ctx, selects, json } = makeCtx({ size: '8', stars: '1' }, [ROW])
    await puzzleV2Handler(ctx as any)

    expect(selects()).toHaveLength(1)
    const { sql, binds } = selects()[0]
    expect(sql).toMatch(/WHERE grid_size = \? AND stars = \? AND rand >= \? ORDER BY rand LIMIT 1$/)
    expect(sql).not.toMatch(/RANDOM\(\)|COUNT\(|OFFSET/i)
    expect(binds.slice(0, 2)).toEqual([8, 1])
    expect(binds[2] as number).toBeGreaterThanOrEqual(0)
    expect(binds[2] as number).toBeLessThan(1)

    expect(json).toHaveBeenCalledTimes(1)
    const body = json.mock.calls[0][0] as any
    expect(body.id).toBe('p1')
    expect(body.regions).toEqual([[0]])
    expect(body).not.toHaveProperty('rand')
  })

  it('wraps around to the lowest rand when nothing follows the random point', async () => {
    const { ctx, selects, json } = makeCtx({ size: '8', stars: '1' }, [null, ROW])
    await puzzleV2Handler(ctx as any)

    expect(selects()).toHaveLength(2)
    const { sql, binds } = selects()[1]
    expect(sql).toMatch(/WHERE grid_size = \? AND stars = \? ORDER BY rand LIMIT 1$/)
    expect(sql).not.toMatch(/rand >=/)
    expect(binds).toEqual([8, 1])
    expect(json.mock.calls[0][0]).toMatchObject({ id: 'p1' })
  })

  it('returns 404 when no puzzle matches even after wrapping', async () => {
    const { ctx, selects, json } = makeCtx({ size: '5', stars: '1' }, [null, null])
    await puzzleV2Handler(ctx as any)
    expect(selects()).toHaveLength(2)
    expect(json).toHaveBeenCalledWith({ error: 'Puzzle not found' }, 404)
  })

  it('seeks on rand alone when no filters are given', async () => {
    const { ctx, selects } = makeCtx({}, [ROW])
    await puzzleV2Handler(ctx as any)
    const { sql, binds } = selects()[0]
    expect(sql).toMatch(/FROM puzzles WHERE rand >= \? ORDER BY rand LIMIT 1$/)
    expect(binds).toHaveLength(1)
  })

  it('keeps the difficulty filter ahead of the rand seek', async () => {
    const { ctx, selects } = makeCtx({ size: '10', stars: '2', difficulty: 'hard,very_hard' }, [ROW])
    await puzzleV2Handler(ctx as any)
    const { sql, binds } = selects()[0]
    expect(sql).toMatch(/difficulty IN \(\?,\?\) AND rand >= \? ORDER BY rand LIMIT 1$/)
    expect(binds.slice(0, 4)).toEqual([10, 2, 'hard', 'very_hard'])
  })
})
