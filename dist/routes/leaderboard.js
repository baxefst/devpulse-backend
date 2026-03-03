import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq, and, desc, or } from "drizzle-orm";
import { leaderboardQuerySchema } from "../validators/schemas.js";
const leaderboard = new Hono();
// GET /leaderboard
leaderboard.get("/", zValidator("query", leaderboardQuerySchema), async (c) => {
    const { page, limit, openTo } = c.req.valid("query");
    const offset = (page - 1) * limit;
    const whereClause = [];
    if (openTo) {
        whereClause.push(or(eq(users.openTo, openTo), eq(users.openTo, "all")));
    }
    const data = await db.query.users.findMany({
        where: whereClause.length > 0 ? and(...whereClause) : undefined,
        limit,
        offset,
        columns: {
            passwordHash: false,
        },
        orderBy: [desc(users.reputationScore), desc(users.streak), users.username],
        with: {
            milestones: {
                columns: {
                    status: true,
                },
            },
        },
    });
    const formattedData = data.map((user) => {
        const totalMilestones = user.milestones.length;
        const shippedCount = user.milestones.filter((m) => m.status === "done").length;
        const completionRate = totalMilestones > 0 ? (shippedCount / totalMilestones) * 100 : 0;
        const { milestones: _, ...userFields } = user;
        return {
            ...userFields,
            _shipped: shippedCount,
            _milestones: totalMilestones,
            _cr: parseFloat(completionRate.toFixed(1)),
        };
    });
    return c.json({ data: formattedData, page, limit });
});
export default leaderboard;
//# sourceMappingURL=leaderboard.js.map