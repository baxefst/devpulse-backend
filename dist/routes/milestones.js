import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db } from "../db/index.js";
import { users, drops, milestones, proofs } from "../db/schema.js";
import { eq, sql } from "drizzle-orm";
import { createMilestoneSchema, updateMilestoneSchema, createProofSchema } from "../validators/schemas.js";
import { authMiddleware } from "../middleware/auth.js";
import { apiRateLimit, proofRateLimit } from "../middleware/rateLimit.js";
import { reputationQueue } from "../lib/queue.js";
import { updateReputationAndRank } from "../lib/reputation.js";
const milestonesRoute = new Hono();
// POST /drops/:dropId/milestones
milestonesRoute.post("/drops/:dropId/milestones", authMiddleware, apiRateLimit, zValidator("json", createMilestoneSchema), async (c) => {
    const payload = c.get("jwtPayload");
    const dropId = c.req.param("dropId");
    const body = c.req.valid("json");
    const drop = await db.query.drops.findFirst({
        where: eq(drops.id, dropId),
    });
    if (!drop || drop.deletedAt)
        return c.json({ error: "Drop not found" }, 404);
    if (drop.userId !== payload.sub)
        return c.json({ error: "Forbidden" }, 403);
    const existingMilestones = await db.query.milestones.findMany({
        where: eq(milestones.dropId, dropId),
    });
    const [newMilestone] = await db.insert(milestones).values({
        ...body,
        dropId,
        userId: payload.sub,
        order: existingMilestones.length + 1,
    }).returning();
    return c.json(newMilestone);
});
// PATCH /milestones/:id
milestonesRoute.patch("/milestones/:id", authMiddleware, apiRateLimit, zValidator("json", updateMilestoneSchema), async (c) => {
    const payload = c.get("jwtPayload");
    const id = c.req.param("id");
    const body = c.req.valid("json");
    const milestone = await db.query.milestones.findFirst({
        where: eq(milestones.id, id),
    });
    if (!milestone)
        return c.json({ error: "Milestone not found" }, 404);
    if (milestone.userId !== payload.sub)
        return c.json({ error: "Forbidden" }, 403);
    if (milestone.status === "done")
        return c.json({ error: "Cannot edit completed milestone" }, 400);
    const [updatedMilestone] = await db.update(milestones)
        .set(body)
        .where(eq(milestones.id, id))
        .returning();
    return c.json(updatedMilestone);
});
// POST /milestones/:id/proof
milestonesRoute.post("/milestones/:id/proof", authMiddleware, proofRateLimit, zValidator("json", createProofSchema), async (c) => {
    const payload = c.get("jwtPayload");
    const id = c.req.param("id");
    const body = c.req.valid("json");
    const milestone = await db.query.milestones.findFirst({
        where: eq(milestones.id, id),
    });
    if (!milestone)
        return c.json({ error: "Milestone not found" }, 404);
    if (milestone.userId !== payload.sub)
        return c.json({ error: "Forbidden" }, 403);
    if (milestone.status === "done")
        return c.json({ error: "Proof already exists" }, 409);
    if (milestone.status === "missed")
        return c.json({ error: "Cannot submit proof for missed milestone" }, 400);
    const result = await db.transaction(async (tx) => {
        const [newProof] = await tx.insert(proofs).values({
            ...body,
            milestoneId: id,
            userId: payload.sub,
        }).returning();
        const [updatedMilestone] = await tx.update(milestones)
            .set({ status: "done", completedAt: new Date() })
            .where(eq(milestones.id, id))
            .returning();
        await tx.update(users)
            .set({ streak: sql `streak + 1` })
            .where(eq(users.id, payload.sub));
        return { proof: newProof, milestone: updatedMilestone };
    });
    reputationQueue.add(() => updateReputationAndRank(payload.sub));
    return c.json(result);
});
export default milestonesRoute;
//# sourceMappingURL=milestones.js.map