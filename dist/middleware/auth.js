import { createMiddleware } from 'hono/factory';
import { verifyAccessToken } from '../lib/jwt.js';
export const authMiddleware = createMiddleware(async (c, next) => {
    const header = c.req.header('Authorization');
    if (!header?.startsWith('Bearer ')) {
        return c.json({ error: 'Unauthorized' }, 401);
    }
    try {
        const token = header.slice(7);
        const payload = await verifyAccessToken(token);
        if (!payload || !payload.sub) {
            return c.json({ error: 'Invalid token payload' }, 401);
        }
        c.set('user', { sub: payload.sub, username: payload.username });
        await next();
    }
    catch {
        return c.json({ error: 'Invalid or expired token' }, 401);
    }
});
//# sourceMappingURL=auth.js.map