import type { Bindings } from '../../bindings'

/**
 * Soft-delete stale anonymous users: anyone not sourced from iOS who has been
 * inactive for 30+ days (including those who never became active at all).
 *
 * iOS users are preserved regardless of activity. `last_active_at` is NULL for
 * users who registered but never made an authed request — those count as
 * "never active" and are eligible for reaping. Rows already soft-deleted are
 * skipped so the returned count reflects only newly-reaped users.
 *
 * The row is retained with a `deleted_at` timestamp so we keep the churn
 * signal (e.g. how many web users registered and never came back). A
 * soft-deleted token is rejected by auth, so a returning user re-registers as
 * a fresh row rather than reviving this one.
 *
 * Returns the number of users newly soft-deleted.
 */
export async function cleanupStaleUsers(db: Bindings['DB']): Promise<number> {
  const result = await db.prepare(
    `UPDATE users
        SET deleted_at = datetime('now')
      WHERE deleted_at IS NULL
        AND (source IS NULL OR source != 'ios')
        AND (last_active_at IS NULL
             OR last_active_at < datetime('now', '-30 days'))`
  ).run()

  return result.meta.changes ?? 0
}
