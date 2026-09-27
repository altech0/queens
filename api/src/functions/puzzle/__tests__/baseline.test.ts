import { describe, it, expect, vi } from 'vitest'
import { puzzleV2Handler } from '../index'

/**
 * Pins the behaviour the live App Store build depends on, so the engine work
 * cannot change it by accident. Every assertion here describes /puzzle as it
 * behaves *without* an `engine` param, which is what the shipped app sends.
 *
 * These must keep passing unchanged once `engine` is added. If one of them has
 * to change, the API is no longer backwards compatible — see
 * docs/puzzle-engine/PUZZLE_ENGINES_PLAN.md §2.
 */

const ROW = {
  id: 'p1', code: 10001, grid_size: 8, stars: 1,
  regions: '[[0]]', solution: '[[0]]', difficulty: 'easy', created_at: '2026-01-01', rand: 0.42,
}

/** Minimal Hono-ish context. `firstResults` is consumed in order by each `.first()` call. */
function makeCtx(query: Record<string, string>, param: string | undefined, firstResults: unknown[]) {
  const results = [...firstResults]
  const calls: { sql: string; binds: unknown[] }[] = []
  const ctx = {
    req: {
      param: vi.fn().mockReturnValue(param),
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
  return { ctx, calls }
}

/** Calls the handler and returns the response plus the SQL it prepared. */
async function run(query: Record<string, string>, param?: string, rows: unknown[] = [ROW]) {
  const { ctx, calls } = makeCtx(query, param, rows)
  const res = await puzzleV2Handler(ctx as never)
  return { res: res as unknown as { body: Record<string, unknown>; status: number }, calls }
}

describe('/puzzle baseline — valid size/stars combos', () => {
  it.each([
    [5, 1],
    [6, 1],
    [8, 1],
    [10, 2],
  ])('size=%i stars=%i → 200', async (size, stars) => {
    const { res } = await run({ size: String(size), stars: String(stars) })
    expect(res.status).toBe(200)
  })
})

describe('/puzzle baseline — rejected requests', () => {
  it('size=9 → 400 (9×9 is not servable without an engine)', async () => {
    const { res } = await run({ size: '9' })
    expect(res.status).toBe(400)
  })

  it.each([
    ['size=10 stars=1', { size: '10', stars: '1' }],
    ['size=8 stars=2', { size: '8', stars: '2' }],
  ])('%s → 400 (invalid combo)', async (_label, query) => {
    const { res } = await run(query)
    expect(res.status).toBe(400)
  })

  it('stars=3 → 400', async () => {
    const { res } = await run({ stars: '3' })
    expect(res.status).toBe(400)
  })

  it('code combined with size → 400', async () => {
    const { res } = await run({ size: '8' }, '10001')
    expect(res.status).toBe(400)
  })

  it('malformed code → 400', async () => {
    const { res } = await run({}, 'abc')
    expect(res.status).toBe(400)
  })

  it('unknown difficulty → 400', async () => {
    const { res } = await run({ difficulty: 'nightmare' })
    expect(res.status).toBe(400)
  })
})

describe('/puzzle baseline — response contract', () => {
  it('returns exactly the eight documented keys', async () => {
    const { res } = await run({ size: '8', stars: '1' })
    expect(Object.keys(res.body).sort()).toEqual([
      'code', 'createdAt', 'difficulty', 'gridSize', 'id', 'regions', 'solution', 'stars',
    ])
  })

  it('code lookup ignores a difficulty filter', async () => {
    const { res, calls } = await run({ difficulty: 'easy' }, '10001')
    expect(res.status).toBe(200)
    expect(calls[0].sql).toContain('WHERE code = ?')
    expect(calls[0].sql).not.toContain('difficulty')
  })
})
