import { describe, it, expect, vi } from 'vitest'
import { cleanupStaleUsers } from '../index'

function makeDb(changes: number) {
  const run = vi.fn().mockResolvedValue({ meta: { changes } })
  const prepare = vi.fn().mockReturnValue({ run })
  return { db: { prepare } as any, prepare, run }
}

describe('cleanupStaleUsers', () => {
  it('returns the number of rows soft-deleted', async () => {
    const { db } = makeDb(7)
    expect(await cleanupStaleUsers(db)).toBe(7)
  })

  it('returns 0 when meta.changes is missing', async () => {
    const run = vi.fn().mockResolvedValue({ meta: {} })
    const db = { prepare: vi.fn().mockReturnValue({ run }) } as any
    expect(await cleanupStaleUsers(db)).toBe(0)
  })

  it('soft-deletes (UPDATE deleted_at) rather than hard-deleting', async () => {
    const { db, prepare } = makeDb(1)
    await cleanupStaleUsers(db)
    const sql = prepare.mock.calls[0][0] as string
    expect(sql).toMatch(/UPDATE users/i)
    expect(sql).toMatch(/SET deleted_at = datetime\('now'\)/i)
    expect(sql).not.toMatch(/DELETE FROM/i)
  })

  it('preserves iOS users and skips already-reaped rows', async () => {
    const { db, prepare } = makeDb(1)
    await cleanupStaleUsers(db)
    const sql = prepare.mock.calls[0][0] as string
    // only reap non-iOS
    expect(sql).toMatch(/source IS NULL OR source != 'ios'/i)
    // never re-stamp an already soft-deleted row
    expect(sql).toMatch(/deleted_at IS NULL/i)
    // treat never-active (NULL) and 30d-stale as eligible
    expect(sql).toMatch(/last_active_at IS NULL/i)
    expect(sql).toMatch(/-30 days/i)
  })
})
