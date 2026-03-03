import { Hono } from 'hono';
import { db } from '../db/index.js';
import { users, drops, milestones } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import { apiRateLimit } from '../middleware/rateLimit.js';
import { updateProfileSchema } from '../validators/schemas.js';
import { zValidator } from '@hono/zod-validator';
import { calcReputation } from '../lib/reputation.js';
const usersRoute = new Hono();
// GET /users/:username — public
usersRoute.get('/:username', async (c) => {
    const username = c.req.param('username');
    const [user] = await db.select({
        id: users.id,
        username: users.username,
        display_name: users.display_name,
        bio: users.bio,
        tech_stack: users.tech_stack,
        open_to: users.open_to,
        github_url: users.github_url,
        twitter_url: users.twitter_url,
        streak: users.streak,
        reputation_score: users.reputation_score,
        rank: users.rank,
        created_at: users.created_at,
    }).from(users).where(eq(users.username, username));
    if (!user)
        return c.json({ error: 'User not found' }, 404);
    const userDrops = await db
        .select({ id: drops.id })
        .from(drops)
        .where(eq(drops.user_id, user.id));
    const ms = await db
        .select({ status: milestones.status })
        .from(milestones)
        .where(eq(milestones.user_id, user.id));
    return c.json({
        ...user,
        _drops: userDrops.length,
        _shipped: ms.filter(m => m.status === 'done').length,
        _milestones: ms.length,
    });
});
// PATCH /users/me — auth required
usersRoute.patch('/me', authMiddleware, apiRateLimit, zValidator('json', updateProfileSchema), async (c) => {
    const user = c.get('user');
    if (!user)
        return c.json({ error: 'Unauthorized' }, 401);
    const { sub } = user;
    const body = c.req.valid('json');
    const [updated] = await db
        .update(users)
        .set({ ...body, updated_at: new Date() })
        .where(eq(users.id, sub))
        .returning();
    const { password_hash: _, ...safe } = updated;
    return c.json(safe);
});
// GET /users/me/stats — auth required
usersRoute.get('/me/stats', authMiddleware, async (c) => {
    const { sub } = c.get('user');
    const breakdown = await calcReputation(sub);
    return c.json(breakdown);
});
export default usersRoute;
//# sourceMappingURL=users.js.map