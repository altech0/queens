import { describe, it, expect, vi } from 'vitest'
import { catalogueHandler } from '../index'

type Row = { engine: string; grid_size: number; stars: number; difficulty: string | null; n: number }

function makeCtx(rows: Row[]) {
  const statements: string[] = []
  const ctx = {
    env: {
      DB: {
        prepare: vi.fn((sql: string) => {
          statements.push(sql)
          return { all: vi.fn().mockResolvedValue({ results: rows }) }
        }),
      },
    },
    header: vi.fn(),
    json: vi.fn((body: unknown, status?: number) => ({ body, status: status ?? 200 })),
  }
  return { ctx, statements }
}

type Style = {
  engine: string
  name: string
  description: string
  sizes: { size: number; stars: number; count: number; difficulties: Record<string, number> }[]
}

const call = async (rows: Row[]) => {
  const { ctx, statements } = makeCtx(rows)
  const res = await catalogueHandler(ctx as never) as unknown as { body: { styles: Style[] } }
  return { styles: res.body.styles, statements, ctx }
}

describe('/catalogue', () => {
  it('groups counts by engine and size, with per-difficulty breakdowns', async () => {
    const { styles } = await call([
      { engine: 'voronoi-v2', grid_size: 8, stars: 1, difficulty: 'easy', n: 700 },
      { engine: 'voronoi-v2', grid_size: 8, stars: 1, difficulty: 'hard', n: 300 },
      { engine: 'snake-v1', grid_size: 9, stars: 1, difficulty: 'hard', n: 40 },
    ])

    const original = styles.find(s => s.engine === 'voronoi-v2')!
    expect(original.name).toBe('Original')
    expect(original.sizes).toHaveLength(1)
    expect(original.sizes[0]).toMatchObject({
      size: 8, stars: 1, count: 1000, difficulties: { easy: 700, hard: 300 },
    })

    const winding = styles.find(s => s.engine === 'snake-v1')!
    expect(winding.name).toBe('Winding')
    expect(winding.sizes[0]).toMatchObject({ size: 9, stars: 1, count: 40 })
  })

  it('omits engines with no puzzles rather than offering an empty style', async () => {
    const { styles } = await call([
      { engine: 'voronoi-v2', grid_size: 8, stars: 1, difficulty: 'easy', n: 10 },
    ])
    expect(styles.map(s => s.engine)).toEqual(['voronoi-v2'])
  })

  it('omits a combo the engine does not declare', async () => {
    // A stray 6x6 snake row must not appear: the registry does not list it.
    const { styles } = await call([
      { engine: 'snake-v1', grid_size: 6, stars: 1, difficulty: 'easy', n: 5 },
      { engine: 'snake-v1', grid_size: 9, stars: 1, difficulty: 'hard', n: 5 },
    ])
    expect(styles.find(s => s.engine === 'snake-v1')!.sizes.map(s => s.size)).toEqual([9])
  })

  it('counts NULL-difficulty rows in the total but not as a choice', async () => {
    const { styles } = await call([
      { engine: 'voronoi-v2', grid_size: 8, stars: 1, difficulty: null, n: 6 },
      { engine: 'voronoi-v2', grid_size: 8, stars: 1, difficulty: 'easy', n: 4 },
    ])
    const combo = styles[0].sizes[0]
    expect(combo.count).toBe(10)
    expect(combo.difficulties).toEqual({ easy: 4 })
  })

  it('returns styles in registry order', async () => {
    const { styles } = await call([
      { engine: 'snake-harden-v1', grid_size: 9, stars: 1, difficulty: 'hard', n: 1 },
      { engine: 'voronoi-v2', grid_size: 8, stars: 1, difficulty: 'easy', n: 1 },
      { engine: 'snake-v1', grid_size: 9, stars: 1, difficulty: 'hard', n: 1 },
    ])
    expect(styles.map(s => s.engine)).toEqual(['voronoi-v2', 'snake-v1', 'snake-harden-v1'])
  })

  it('returns an empty list when the table is empty', async () => {
    const { styles } = await call([])
    expect(styles).toEqual([])
  })

  it('edge-caches the response', async () => {
    const { ctx } = await call([])
    expect(ctx.header).toHaveBeenCalledWith('Cache-Control', expect.stringContaining('max-age'))
  })
})
