import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Bindings } from './bindings'
import { healthHandler }     from './functions/health'
import { puzzleV2Handler }   from './functions/puzzle'
import { registerHandler, deleteUserHandler } from './functions/auth'
import { dashboardHandler } from './functions/dashboard'
import { cleanupStaleUsers } from './functions/cleanup'
import { tokenAuth }         from './middleware/auth'

const app = new Hono<{ Bindings: Bindings }>()

app.use('*', async (c, next) => {
  console.log(`[request] ${c.req.method} ${c.req.path}`)
  await next()
})

app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'X-API-Token', 'X-Client-Source'],
}))

app.use('*', async (c, next) => {
  const ip = c.req.header('CF-Connecting-IP') ?? 'unknown'
  const { success } = await c.env.RATE_LIMITER.limit({ key: ip })
  if (!success) {
    console.log(`[ratelimit] → 429 — ip: ${ip}`)
    return c.json({ error: 'Too many requests' }, 429)
  }
  await next()
})

// Public
app.get('/health',         healthHandler)
app.post('/auth/register', registerHandler)

// Protected
app.delete('/user', tokenAuth, deleteUserHandler)
app.get('/puzzle/:puzzleId?', tokenAuth, puzzleV2Handler)

// Dashboard
app.get('/dashboard', dashboardHandler)

export default {
  fetch: app.fetch,

  // Cron: "0 6 1-7 * 1" fires the only Monday that lands in days 1–7 of the
  // month — i.e. the first Monday. Soft-deletes stale non-iOS users.
  async scheduled(_event: ScheduledController, env: Bindings, ctx: ExecutionContext) {
    ctx.waitUntil((async () => {
      const reaped = await cleanupStaleUsers(env.DB)
      console.log(`[cleanup] soft-deleted ${reaped} stale non-iOS users`)
    })())
  },
}
