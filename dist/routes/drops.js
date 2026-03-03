import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db } from "../db/index.js";
import { drops, milestones, proofs } from "../db/schema.js";
import { eq, and, sql, desc, isNull } from "drizzle-orm";
import { createDropSchema, updateDropSchema, paginationSchema } from "../validators/schemas.js";
import { authMiddleware } from "../middleware/auth.js";
import { apiRateLimit } from "../middleware/rateLimit.js";
import { reputationQueue } from "../lib/queue.js";
import { updateReputationAndRank } from "../lib/reputation.js";
const dropsRoute = new Hono();
// GET /drops
dropsRoute.get("/", zValidator("query", paginationSchema), async (c) => {
    const { page, limit, category, search, userId } = c.req.valid("query");
    const offset = (page - 1) * limit;
    const data = await db.query.drops.findMany({
        where: (drops, { and, isNull, eq, or, like }) => {
            const conditions = [isNull(drops.deletedAt)];
            if (category)
                conditions.push(eq(drops.category, category));
            if (userId)
                conditions.push(eq(drops.userId, userId));
            if (search) {
                const searchOr = or(like(drops.title, `%${search}%`), like(drops.description, `%${search}%`));
                if (searchOr)
                    conditions.push(searchOr);
            }
            return conditions.length > 1 ? and(...conditions) : conditions[0];
        },
        limit,
        offset,
        orderBy: [desc(drops.createdAt)],
        with: {
            user: {
                columns: {
                    username: true,
                    displayName: true,
                    reputationScore: true,
                }
            }
        }
    });
    return c.json({ data, page, limit });
});
// POST /drops
dropsRoute.post("/", authMiddleware, apiRateLimit, zValidator("json", createDropSchema), async (c) => {
    const payload = c.get("jwtPayload");
    const { milestone: milestoneData, ...dropData } = c.req.valid("json");
    try {
        const result = await db.transaction(async (tx) => {
            const [newDrop] = await tx.insert(drops).values({
                ...dropData,
                userId: payload.sub,
            }).returning();
            const [newMilestone] = await tx.insert(milestones).values({
                ...milestoneData,
                dropId: newDrop.id,
                userId: payload.sub,
                order: 1,
            }).returning();
            return { drop: newDrop, milestone: newMilestone };
        });
        reputationQueue.add(() => updateReputationAndRank(payload.sub));
        return c.json(result);
    }
    catch (err) {
        return c.json({ error: "Failed to create drop" }, 500);
    }
});
// GET /drops/:id
dropsRoute.get("/:id", async (c) => {
    const id = c.req.param("id");
    const drop = await db.query.drops.findFirst({
        where: and(eq(drops.id, id), isNull(drops.deletedAt)),
        with: {
            user: {
                columns: {
                    id: true,
                    username: true,
                    displayName: true,
                    reputationScore: true,
                }
            },
            milestones: {
                orderBy: [sql `"order" ASC`],
            }
        }
    });
    if (!drop)
        return c.json({ error: "Drop not found" }, 404);
    const dropProofs = await db.query.proofs.findMany({
        where: eq(proofs.userId, drop.userId),
    });
    const shippedCount = drop.milestones.filter(m => m.status === 'done').length;
    const totalCount = drop.milestones.length;
    const score = totalCount > 0 ? (shippedCount / totalCount) * 100 : 0;
    return c.json({
        ...drop,
        proofs: dropProofs,
        score: parseFloat(score.toFixed(1))
    });
});
// PATCH /drops/:id
dropsRoute.patch("/:id", authMiddleware, apiRateLimit, zValidator("json", updateDropSchema), async (c) => {
    const payload = c.get("jwtPayload");
    const id = c.req.param("id");
    const body = c.req.valid("json");
    const drop = await db.query.drops.findFirst({
        where: eq(drops.id, id),
    });
    if (!drop || drop.deletedAt)
        return c.json({ error: "Drop not found" }, 404);
    if (drop.userId !== payload.sub)
        return c.json({ error: "Forbidden" }, 403);
    const [updatedDrop] = await db.update(drops)
        .set(body)
        .where(eq(drops.id, id))
        .returning();
    return c.json(updatedDrop);
});
// DELETE /drops/:id
dropsRoute.delete("/:id", authMiddleware, apiRateLimit, async (c) => {
    const payload = c.get("jwtPayload");
    const id = c.req.param("id");
    const drop = await db.query.drops.findFirst({
        where: eq(drops.id, id),
    });
    if (!drop || drop.deletedAt)
        return c.json({ error: "Drop not found" }, 404);
    if (drop.userId !== payload.sub)
        return c.json({ error: "Forbidden" }, 403);
    await db.update(drops)
        .set({ deletedAt: new Date() })
        .where(eq(drops.id, id));
    return c.json({ ok: true });
});
export default dropsRoute;
//# sourceMappingURL=drops.js.map