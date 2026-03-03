import { Hono } from 'hono'
import bcrypt from 'bcryptjs'
import { db } from '../db/index.js'
import { users, refreshTokens } from '../db/schema.js'
import { eq, and, gte } from 'drizzle-orm'
import { signAccessToken, signRefreshToken, verifyRefreshToken, hashToken } from '../lib/jwt.js'
import { registerSchema, loginSchema } from '../validators/schemas.js'
import { loginRateLimit } from '../middleware/rateLimit.js'
import { zValidator } from '@hono/zod-validator'

const auth = new Hono()

auth.post('/register', zValidator('json', registerSchema, (result, c) => {
  if (!result.success) return c.json({ error: 'Validation failed', details: result.error.format() }, 400)
}), async (c) => {
  const body = c.req.valid('json')

  const [existingEmail] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, body.email))
  if (existingEmail) return c.json({ error: 'Email already registered' }, 409)

  const [existingUsername] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, body.username))
  if (existingUsername) return c.json({ error: 'Username already taken' }, 409)

  const password_hash = await bcrypt.hash(body.password, 12)

  const [user] = await db.insert(users).values({
    username: body.username,
    display_name: body.display_name,
    email: body.email,
    password_hash,
    bio: body.bio ?? null,
    github_url: body.github_url ?? null,
  }).returning()

  const payload = { sub: user.id, username: user.username }
  const accessToken = await signAccessToken(payload)
  const refreshToken = await signRefreshToken(payload)

  await db.insert(refreshTokens).values({
    user_id: user.id,
    token_hash: hashToken(refreshToken),
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  })

  const { password_hash: _, ...safeUser } = user
  return c.json({ accessToken, refreshToken, user: safeUser }, 201)
})

auth.post('/login', loginRateLimit, zValidator('json', loginSchema, (result, c) => {
  if (!result.success) return c.json({ error: 'Validation failed', details: result.error.format() }, 400)
}), async (c) => {
  const { email, password } = c.req.valid('json')

  const [user] = await db.select().from(users).where(eq(users.email, email))
  if (!user) return c.json({ error: 'Invalid credentials' }, 401)
  if (!user.password_hash) return c.json({ error: 'Invalid credentials' }, 401)

  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) return c.json({ error: 'Invalid credentials' }, 401)

  const payload = { sub: user.id, username: user.username }
  const accessToken = await signAccessToken(payload)
  const refreshToken = await signRefreshToken(payload)

  await db.insert(refreshTokens).values({
    user_id: user.id,
    token_hash: hashToken(refreshToken),
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  })

  const { password_hash: _, ...safeUser } = user
  return c.json({ accessToken, refreshToken, user: safeUser })
})

auth.post('/refresh', async (c) => {
  const body = await c.req.json()
  if (!body?.refreshToken) return c.json({ error: 'Refresh token required' }, 400)

  try {
    const payload = await verifyRefreshToken(body.refreshToken)
    if (!payload) return c.json({ error: 'Invalid refresh token' }, 401)

    const tokenHash = hashToken(body.refreshToken)

    const [stored] = await db
      .select()
      .from(refreshTokens)
      .where(and(
        eq(refreshTokens.token_hash, tokenHash),
        gte(refreshTokens.expires_at, new Date())
      ))
    if (!stored) return c.json({ error: 'Invalid refresh token' }, 401)

    // Rotate: delete old token, issue and store new pair
    const newAccessToken = await signAccessToken({ sub: payload.sub, username: payload.username })
    const newRefreshToken = await signRefreshToken({ sub: payload.sub, username: payload.username })

    await db.transaction(async (tx) => {
      await tx
        .delete(refreshTokens)
        .where(eq(refreshTokens.token_hash, tokenHash))

      await tx.insert(refreshTokens).values({
        user_id: stored.user_id,
        token_hash: hashToken(newRefreshToken),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })
    })

    return c.json({ accessToken: newAccessToken, refreshToken: newRefreshToken })
  } catch {
    return c.json({ error: 'Invalid refresh token' }, 401)
  }
})

auth.post('/logout', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  if (body?.refreshToken) {
    await db
      .delete(refreshTokens)
      .where(eq(refreshTokens.token_hash, hashToken(body.refreshToken)))
  }
  return c.json({ ok: true })
})

export default auth
