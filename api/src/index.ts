import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Bindings } from './bindings'
import { healthHandler }     from './functions/health'
import { generateV2Handler } from './functions/generate'
import { puzzleV2Handler }   from './functions/puzzle'
import { registerHandler, updateNicknameHandler, deleteUserHandler } from './functions/auth'
import { tokenAuth }         from './middleware/auth'

const app = new Hono<{ Bindings: Bindings }>()

app.use('*', async (c, next) => {
  console.log(`[request] ${c.req.method} ${c.req.path}`)
  await next()
})

app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'X-API-Token'],
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
app.patch('/user/nickname',   tokenAuth, updateNicknameHandler)
app.delete('/user',           tokenAuth, deleteUserHandler)
app.post('/generate',         tokenAuth, generateV2Handler)
app.get('/puzzle/:puzzleId?', tokenAuth, puzzleV2Handler)

export default app
