import { Hono } from 'hono';
import { db } from '../db/index.js';
import { milestones, proofs, drops } from '../db/schema.js';
import { eq, and, isNull } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import { proofRateLimit, apiRateLimit } from '../middleware/rateLimit.js';
import { createMilestoneSchema, submitProofSchema } from '../validators/schemas.js';
import { zValidator } from '@hono/zod-validator';
import { reputationQueue } from '../lib/queue.js';
import { updateReputationAndRank } from '../lib/reputation.js';
import { sql } from 'drizzle-orm';
const msRoute = new Hono();
// POST /drops/:dropId/milestones — owner only
msRoute.post('/drops/:dropId/milestones', authMiddleware, apiRateLimit, zValidator('json', createMilestoneSchema), async (c) => {
    const { sub } = c.get('user');
    const dropId = c.req.param('dropId');
    const body = c.req.valid('json');
    const [drop] = await db.select({ user_id: drops.user_id }).from(drops)
        .where(and(eq(drops.id, dropId), isNull(drops.deleted_at)));
    if (!drop)
        return c.json({ error: 'Drop not found' }, 404);
    if (drop.user_id !== sub)
        return c.json({ error: 'Forbidden' }, 403);
    const existing = await db.select({ id: milestones.id }).from(milestones)
        .where(eq(milestones.drop_id, dropId));
    const order = existing.length + 1;
    const [ms] = await db.insert(milestones).values({
        drop_id: dropId,
        user_id: sub,
        goal: body.goal,
        deadline: body.deadline,
        proof_type: body.proof_type,
        status: 'active',
        order,
    }).returning();
    return c.json(ms, 201);
});
// PATCH /milestones/:id — owner only
msRoute.patch('/milestones/:id', authMiddleware, apiRateLimit, async (c) => {
    const { sub } = c.get('user');
    const id = c.req.param('id');
    const body = await c.req.json();
    const [ms] = await db.select().from(milestones).where(eq(milestones.id, id));
    if (!ms)
        return c.json({ error: 'Milestone not found' }, 404);
    if (ms.user_id !== sub)
        return c.json({ error: 'Forbidden' }, 403);
    // State machine guards
    if (ms.status === 'done') {
        return c.json({ error: 'Cannot edit a completed milestone — "done" is a terminal state' }, 400);
    }
    if (ms.status === 'missed') {
        return c.json({ error: 'Cannot edit a missed milestone — "missed" is a terminal state' }, 400);
    }
    if (ms.status === 'pending' && body.status === 'done') {
        return c.json({ error: 'Cannot transition directly from "pending" to "done" — submit proof first' }, 400);
    }
    const allowed = ['goal', 'deadline', 'proof_type'];
    const patch = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));
    const [updated] = await db.update(milestones).set(patch).where(eq(milestones.id, id)).returning();
    return c.json(updated);
});
// POST /milestones/:id/proof — owner only
msRoute.post('/milestones/:id/proof', authMiddleware, proofRateLimit, zValidator('json', submitProofSchema), async (c) => {
    const { sub } = c.get('user');
    const id = c.req.param('id');
    const { url, note } = c.req.valid('json');
    const [ms] = await db.select().from(milestones).where(eq(milestones.id, id));
    if (!ms)
        return c.json({ error: 'Milestone not found' }, 404);
    if (ms.user_id !== sub)
        return c.json({ error: 'Forbidden' }, 403);
    // Block proof submission if milestone is not active
    if (ms.status !== 'active') {
        return c.json({ error: `Cannot submit proof on a ${ms.status} milestone` }, 400);
    }
    // Proof type validation
    if (ms.proof_type === 'live_link') {
        if (!url || !url.startsWith('http')) {
            return c.json({ error: 'Proof type "live_link" requires a URL starting with http' }, 400);
        }
    }
    else if (ms.proof_type === 'github') {
        if (!url || !url.includes('github.com')) {
            return c.json({ error: 'Proof type "github" requires a URL containing github.com' }, 400);
        }
    }
    else if (ms.proof_type === 'revenue') {
        if (!note || note.trim().length < 20) {
            return c.json({ error: 'Proof type "revenue" requires a note of at least 20 characters' }, 400);
        }
    }
    const [existing] = await db.select({ id: proofs.id }).from(proofs)
        .where(eq(proofs.milestone_id, id));
    if (existing)
        return c.json({ error: 'Proof already submitted for this milestone' }, 409);
    const result = await db.transaction(async (tx) => {
        const [proof] = await tx.insert(proofs).values({
            milestone_id: id,
            user_id: sub,
            url,
            note: note ?? null,
        }).returning();
        const [updated] = await tx.update(milestones)
            .set({ status: 'done', completed_at: new Date() })
            .where(eq(milestones.id, id))
            .returning();
        await tx.execute(sql `UPDATE users SET streak = streak + 1 WHERE id = ${sub}`);
        return { proof, milestone: updated };
    });
    reputationQueue.push(() => updateReputationAndRank(sub));
    return c.json(result, 201);
});
export default msRoute;
//# sourceMappingURL=milestones.js.map