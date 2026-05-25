import type { Context } from 'hono'
import type { Bindings } from '../../bindings'

/**
 * GET /health
 * Liveness check. Returns `{ status: "ok" }` with a 200 response.
 */
export const healthHandler = (c: Context<{ Bindings: Bindings }>) => {
  console.log('[health] GET /health')
  console.log('[health] → 200')
  return c.json({ status: 'ok' })
}
