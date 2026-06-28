import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Bindings } from './bindings'
import { healthHandler }     from './functions/health'
import { puzzleV2Handler }   from './functions/puzzle'
import { registerHandler, deleteUserHandler } from './functions/auth'
import { dashboardPuzzlesHandler, dashboardSeedRunsHandler, dashboardUsersHandler, dashboardUserSourceHandler, dashboardPuzzleServesHandler } from './functions/dashboard'
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
app.get('/dashboard/puzzles',        dashboardPuzzlesHandler)
app.get('/dashboard/seed-runs',     dashboardSeedRunsHandler)
app.get('/dashboard/users',         dashboardUsersHandler)
app.get('/dashboard/user-source',   dashboardUserSourceHandler)
app.get('/dashboard/puzzle-serves', dashboardPuzzleServesHandler)

export default app
