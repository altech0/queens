import { describe, it, expect, vi, afterEach } from 'vitest'
import { dashboardHandler } from '../index'

/** Minimal Hono-ish context with a D1 batch mock and a stubbed edge cache. */
function makeCtx(cached?: Response) {
  const statements: string[] = []
  const batch = vi.fn(async (stmts: unknown[]) => stmts.map(() => ({ results: [{ row: 1 }] })))
  const cache = {
    match: vi.fn().mockResolvedValue(cached),
    put:   vi.fn().mockResolvedValue(undefined),
  }
  vi.stubGlobal('caches', { default: cache })

  const query: Record<string, string> = { days: '7', limit: '5' }
  const ctx = {
    req: {
      url: 'https://api.example.test/dashboard?days=7&limit=5&junk=1',
      query: vi.fn((key: string) => query[key]),
    },
    env: {
      DB: {
        prepare: vi.fn((sql: string) => {
          statements.push(sql)
          const stmt = { bind: vi.fn() }
          stmt.bind.mockReturnValue(stmt)
          return stmt
        }),
        batch,
      },
    },
    executionCtx: { waitUntil: vi.fn() },
    json: vi.fn((body: unknown, status?: number, headers?: Record<string, string>) =>
      new Response(JSON.stringify(body), { status: status ?? 200, headers: { 'content-type': 'application/json', ...headers } })),
  }
  return { ctx, statements, batch, cache }
}

afterEach(() => vi.unstubAllGlobals())

describe('GET /dashboard', () => {
  it('runs every query in a single D1 batch', async () => {
    const { ctx, batch, statements } = makeCtx()
    await dashboardHandler(ctx as any)
    expect(batch).toHaveBeenCalledTimes(1)
    expect(batch.mock.calls[0][0]).toHaveLength(9)
    expect(statements).toHaveLength(9)
  })

  it('reads puzzle totals from puzzle_counts instead of counting puzzles', async () => {
    const { ctx, statements } = makeCtx()
    await dashboardHandler(ctx as any)
    expect(statements[0]).toMatch(/FROM puzzle_counts/)
    expect(statements.some(s => /FROM puzzles\b/.test(s))).toBe(false)
  })

  it('bounds the puzzle_serves aggregate to the last 30 days', async () => {
    const { ctx, statements } = makeCtx()
    await dashboardHandler(ctx as any)
    const serves = statements.find(s => /FROM puzzle_serves/.test(s))!
    expect(serves).toMatch(/WHERE served_at >= datetime\('now', '-30 days'\)/)
  })

  it('returns the same shape as before, with single-row results unwrapped', async () => {
    const { ctx } = makeCtx()
    const res = (await dashboardHandler(ctx as any)) as Response
    const body = await res.json() as any
    expect(Object.keys(body).sort()).toEqual(['puzzleServes', 'puzzles', 'reaped', 'retention', 'seedRuns', 'userSource', 'users'])
    expect(Array.isArray(body.puzzles)).toBe(true)
    expect(Array.isArray(body.users.registrations)).toBe(true)
    expect(body.users.active).toEqual({ row: 1 })
    expect(body.puzzleServes).toEqual({ row: 1 })
    expect(body.retention.buckets).toEqual({ row: 1 })
    expect(Array.isArray(body.retention.weekly)).toBe(true)
  })

  it('caches the built response at the edge for 60s under a normalised key', async () => {
    const { ctx, cache } = makeCtx()
    const res = (await dashboardHandler(ctx as any)) as Response
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=60')

    expect(cache.put).toHaveBeenCalledTimes(1)
    const [key, stored] = cache.put.mock.calls[0] as [Request, Response]
    expect(key.url).toBe('https://api.example.test/dashboard?days=7&limit=5')
    expect(stored.headers.get('Cache-Control')).toBe('public, max-age=60')
    expect(ctx.executionCtx.waitUntil).toHaveBeenCalledTimes(1)
  })

  it('serves a cache hit without touching the database', async () => {
    const hit = new Response('{"cached":true}', { status: 200, headers: { 'content-type': 'application/json' } })
    const { ctx, batch, cache } = makeCtx(hit)
    const res = (await dashboardHandler(ctx as any)) as Response
    expect(await res.json()).toEqual({ cached: true })
    expect(batch).not.toHaveBeenCalled()
    expect(cache.put).not.toHaveBeenCalled()
  })
})
