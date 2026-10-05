import { describe, it, expect, vi } from 'vitest'
import { puzzleV2Handler } from '../index'

/**
 * The single guarantee the rollout depends on: a request that does not name an
 * engine must only ever be served Original puzzles.
 *
 * A client built before styles existed sends no engine param. If these ever fail,
 * that client starts receiving boards it may not be able to render — so treat a
 * failure here as release-blocking, not as a test to update.
 */

const SNAKE_ROW = {
  id: 'p9', code: 90001, grid_size: 9, stars: 1,
  regions: '[[0]]', solution: '[[0]]', difficulty: 'hard', created_at: '2026-01-01',
  rand: 0.5, engine: 'snake-v1',
}

function run(query: Record<string, string>) {
  const calls: { sql: string; binds: unknown[] }[] = []
  const ctx = {
    req: { param: vi.fn().mockReturnValue(undefined), query: vi.fn((k: string) => query[k]) },
    env: {
      DB: {
        prepare: vi.fn((sql: string) => ({
          bind: vi.fn((...binds: unknown[]) => {
            calls.push({ sql, binds })
            return { first: vi.fn(() => Promise.resolve(SNAKE_ROW)), run: vi.fn().mockResolvedValue({}) }
          }),
        })),
      },
    },
    get: vi.fn().mockReturnValue({ id: 'u1' }),
    executionCtx: { waitUntil: vi.fn() },
    json: vi.fn((body: unknown, status?: number) => ({ body, status: status ?? 200 })),
  }
  return puzzleV2Handler(ctx as never).then(res => ({
    res: res as unknown as { body: Record<string, unknown>; status: number },
    selects: calls.filter(c => c.sql.startsWith('SELECT')),
  }))
}

describe('no engine param means Original only', () => {
  it.each([
    ['no params at all', {}],
    ['size and stars only', { size: '8', stars: '1' }],
    ['size only', { size: '8' }],
    ['stars only', { stars: '1' }],
    ['with a difficulty filter', { size: '8', stars: '1', difficulty: 'hard' }],
  ])('%s → filters to voronoi-v2', async (_label, query) => {
    const { selects } = await run(query)
    expect(selects.length).toBeGreaterThan(0)
    for (const select of selects) {
      // Every query must constrain engine, and only to the default.
      expect(select.sql).toMatch(/engine IN \(\?\)/)
      expect(select.binds[0]).toBe('voronoi-v2')
    }
  })

  it('an empty engine param is still Original only, never an unconstrained query', async () => {
    // `?engine=` and `?engine=,,` must not collapse to "no filter".
    for (const value of ['', ' ', ',', ' , ']) {
      const { selects } = await run({ engine: value, size: '8', stars: '1' })
      for (const select of selects) {
        expect(select.sql).toMatch(/engine IN \(\?\)/)
        expect(select.binds[0]).toBe('voronoi-v2')
      }
    }
  })

  it('never emits an empty IN list', async () => {
    for (const value of ['', ',', ' , ']) {
      const { selects } = await run({ engine: value })
      for (const select of selects) expect(select.sql).not.toMatch(/engine IN \(\s*\)/)
    }
  })
})
