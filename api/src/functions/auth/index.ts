import type { Context } from 'hono'
import type { Bindings } from '../../bindings'
import { randomNickname } from '../../utils/nickname'


export const registerHandler = async (c: Context<{ Bindings: Bindings }>) => {
  console.log('[register] POST /auth/register')

  const id        = crypto.randomUUID()
  const apiToken  = crypto.randomUUID()
  const createdAt = new Date().toISOString()

  const rawSource = c.req.header('X-Client-Source')?.toLowerCase()
  const source = rawSource === 'ios' || rawSource === 'web' ? rawSource : null

  const maxAttempts = 10
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const nickname = randomNickname()
    try {
      await c.env.DB.prepare(
        'INSERT INTO users (id, api_token, nickname, created_at, source) VALUES (?, ?, ?, ?, ?)'
      ).bind(id, apiToken, nickname, createdAt, source).run()
      console.log(`[register] → 201 user created id: ${id}, nickname: ${nickname} (attempt ${attempt})`)
      return c.json({ api_token: apiToken, user_id: id, nickname }, 201)
    } catch {
      console.log(`[register] nickname '${nickname}' taken, retrying... (attempt ${attempt})`)
    }
  }

  console.log('[register] → 500 failed to find unique nickname')
  return c.json({ error: 'Failed to register — please try again' }, 500)
}

export const deleteUserHandler = async (c: Context<{ Bindings: Bindings }>) => {
  const user = c.get('user')
  console.log(`[deleteUser] DELETE /user — user id: ${user.id}`)
  await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(user.id).run()
  console.log(`[deleteUser] → 204 user deleted id: ${user.id}`)
  return new Response(null, { status: 204 })
}

