import { MiddlewareHandler } from 'hono'
import type { Bindings } from '../bindings'

export type UserContext = { id: string; nickname: string }

declare module 'hono' {
  interface ContextVariableMap {
    user: UserContext
  }
}

export const tokenAuth: MiddlewareHandler<{ Bindings: Bindings }> = async (c, next) => {
  const token = c.req.header('X-API-Token')
  if (!token) return c.json({ error: 'Unauthorized' }, 401)

  const user = await c.env.DB.prepare(
    'SELECT id, nickname FROM users WHERE api_token = ?'
  ).bind(token).first<UserContext>()

  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  c.set('user', user)
  await next()

  c.executionCtx.waitUntil(
    c.env.DB.prepare(
      "UPDATE users SET last_active_at = datetime('now') WHERE api_token = ?"
    ).bind(token).run()
  )
}
