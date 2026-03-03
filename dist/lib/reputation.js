import { db } from "../db/index.js";
import { users, milestones, proofs } from "../db/schema.js";
import { eq, and, gt, sql } from "drizzle-orm";
export const calcReputation = async (userId) => {
    const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
    });
    if (!user) {
        throw new Error("User not found");
    }
    // 1. Completion Rate
    const allMilestones = await db.query.milestones.findMany({
        where: eq(milestones.userId, userId),
    });
    let completionRate = 0;
    if (allMilestones.length > 0) {
        const weights = {
            done: 100,
            active: 20,
            pending: 10,
            missed: 0,
        };
        const totalWeight = allMilestones.reduce((acc, m) => acc + (weights[m.status] || 0), 0);
        completionRate = totalWeight / allMilestones.length;
    }
    // 2. Velocity
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const recentlyDone = await db.query.milestones.findMany({
        where: and(eq(milestones.userId, userId), eq(milestones.status, "done"), gt(milestones.completedAt, ninetyDaysAgo)),
    });
    const velocity = Math.min(recentlyDone.length * 20, 100);
    // 3. Streak Score
    const streakScore = Math.min(user.streak * 14, 100);
    // 4. Proof Quality
    const userProofs = await db.query.proofs.findMany({
        where: eq(proofs.userId, userId),
    });
    let pts = Math.min(userProofs.length * 15, 50);
    for (const p of userProofs) {
        if (isValidUrl(p.url))
            pts += 10;
        if (p.note && p.note.length > 20)
            pts += 5;
    }
    const proofQuality = Math.min(pts, 100);
    // Final Total
    const total = parseFloat((completionRate * 0.45 +
        velocity * 0.25 +
        streakScore * 0.15 +
        proofQuality * 0.15).toFixed(1));
    return { completionRate, velocity, streakScore, proofQuality, total: Math.min(Math.max(total, 0), 100) };
};
const isValidUrl = (url) => {
    try {
        new URL(url);
        return true;
    }
    catch {
        return false;
    }
};
export const updateReputationAndRank = async (userId) => {
    const breakdown = await calcReputation(userId);
    await db.update(users)
        .set({ reputationScore: breakdown.total.toString() })
        .where(eq(users.id, userId));
    await recalcAllRanks();
};
export const recalcAllRanks = async () => {
    // Use raw SQL for ROW_NUMBER() as requested
    await db.execute(sql `
    WITH RankedUsers AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY reputation_score DESC, streak DESC, username ASC) as new_rank
      FROM users
    )
    UPDATE users
    SET rank = RankedUsers.new_rank
    FROM RankedUsers
    WHERE users.id = RankedUsers.id;
  `);
};
//# sourceMappingURL=reputation.js.map