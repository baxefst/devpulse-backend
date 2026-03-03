import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq, sql } from "drizzle-orm";
import { updateMeSchema } from "../validators/schemas.js";
import { authMiddleware } from "../middleware/auth.js";
import { calcReputation } from "../lib/reputation.js";
const usersRoute = new Hono();
// GET /users/:username
usersRoute.get("/:username", async (c) => {
    const username = c.req.param("username");
    const user = await db.query.users.findFirst({
        where: eq(users.username, username),
        columns: {
            passwordHash: false,
        },
        with: {
            drops: {
                where: sql `deleted_at IS NULL`,
            },
            milestones: true,
        },
    });
    if (!user)
        return c.json({ error: "User not found" }, 404);
    const _dropsCount = user.drops.length;
    const _milestonesCount = user.milestones.length;
    const _shippedCount = user.milestones.filter(m => m.status === 'done').length;
    const stats = await calcReputation(user.id);
    const { drops: _, milestones: __, ...userProfile } = user;
    return c.json({
        ...userProfile,
        stats,
        _drops: _dropsCount,
        _shipped: _shippedCount,
        _milestones: _milestonesCount,
    });
});
// PATCH /users/me
usersRoute.patch("/me", authMiddleware, zValidator("json", updateMeSchema), async (c) => {
    const payload = c.get("jwtPayload");
    const body = c.req.valid("json");
    const [updatedUser] = await db.update(users)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(users.id, payload.sub))
        .returning();
    const { passwordHash: _, ...userPublic } = updatedUser;
    return c.json(userPublic);
});
// GET /users/me/stats
usersRoute.get("/me/stats", authMiddleware, async (c) => {
    const payload = c.get("jwtPayload");
    const stats = await calcReputation(payload.sub);
    return c.json(stats);
});
export default usersRoute;
//# sourceMappingURL=users.js.map