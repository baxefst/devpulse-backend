import { createMiddleware } from 'hono/factory'
import { verifyAccessToken } from '../lib/jwt.js'

export const authMiddleware = createMiddleware(async (c, next) => {
  const header = c.req.header('Authorization')
  if (!header?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  try {
    const token   = header.slice(7)
    const payload = await verifyAccessToken(token)
    c.set('user', payload)
    await next()
  } catch {
    return c.json({ error: 'Invalid or expired token' }, 401)
  }
})