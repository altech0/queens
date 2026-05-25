import type { Context } from 'hono'
import type { Bindings } from '../../bindings'
import { validateNickname, sanitiseNickname } from '../../utils/nickname'

export const registerHandler = async (c: Context<{ Bindings: Bindings }>) => {
  console.log('[register] POST /auth/register')
  const body = await c.req.json().catch(() => null)
  if (!body) {
    console.log('[register] → 400 invalid JSON')
    return c.json({ error: 'Invalid JSON' }, 400)
  }

  const { nickname } = body

  const nickResult = validateNickname(nickname)
  if (!nickResult.valid) {
    console.log(`[register] → 400 invalid nickname: ${nickResult.error}`)
    return c.json({ error: nickResult.error }, 400)
  }
  const cleanNickname = sanitiseNickname(nickname)

  const existingNick = await c.env.DB.prepare(
    'SELECT id FROM users WHERE nickname = ?'
  ).bind(cleanNickname).first()
  if (existingNick) {
    console.log(`[register] → 409 nickname taken: ${cleanNickname}`)
    return c.json({ error: 'Nickname already taken' }, 409)
  }

  const id        = crypto.randomUUID()
  const apiToken  = crypto.randomUUID()
  const createdAt = new Date().toISOString()

  await c.env.DB.prepare(
    'INSERT INTO users (id, api_token, nickname, created_at) VALUES (?, ?, ?, ?)'
  ).bind(id, apiToken, cleanNickname, createdAt).run()

  console.log(`[register] → 201 user created id: ${id}, nickname: ${cleanNickname}`)
  return c.json({ api_token: apiToken, user_id: id, nickname: cleanNickname }, 201)
}

export const deleteUserHandler = async (c: Context<{ Bindings: Bindings }>) => {
  const user = c.get('user')
  console.log(`[deleteUser] DELETE /user — user id: ${user.id}`)
  await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(user.id).run()
  console.log(`[deleteUser] → 204 user deleted id: ${user.id}`)
  return new Response(null, { status: 204 })
}

export const updateNicknameHandler = async (c: Context<{ Bindings: Bindings }>) => {
  const user = c.get('user')
  console.log(`[updateNickname] PATCH /user/nickname — user id: ${user.id}`)
  const body = await c.req.json().catch(() => null)
  if (!body) {
    console.log('[updateNickname] → 400 invalid JSON')
    return c.json({ error: 'Invalid JSON' }, 400)
  }

  const nickResult = validateNickname(body.nickname)
  if (!nickResult.valid) {
    console.log(`[updateNickname] → 400 invalid nickname: ${nickResult.error}`)
    return c.json({ error: nickResult.error }, 400)
  }
  const cleanNickname = sanitiseNickname(body.nickname)

  const taken = await c.env.DB.prepare(
    'SELECT id FROM users WHERE nickname = ? AND id != ?'
  ).bind(cleanNickname, user.id).first()
  if (taken) {
    console.log(`[updateNickname] → 409 nickname taken: ${cleanNickname}`)
    return c.json({ error: 'Nickname already taken' }, 409)
  }

  await c.env.DB.prepare(
    'UPDATE users SET nickname = ? WHERE id = ?'
  ).bind(cleanNickname, user.id).run()

  console.log(`[updateNickname] → 200 nickname updated to: ${cleanNickname}`)
  return c.json({ nickname: cleanNickname })
}
