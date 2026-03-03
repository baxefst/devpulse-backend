import { db } from "../db/index.js";
import { users, milestones, proofs } from "../db/schema.js";
import { eq, and, gt, sql } from "drizzle-orm";

export interface ReputationBreakdown {
  completionRate: number;
  velocity: number;
  streakScore: number;
  proofQuality: number;
  total: number;
}

export const calcReputation = async (userId: string): Promise<ReputationBreakdown> => {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) throw new Error("User not found");

  const allMilestones = await db.select().from(milestones)
    .where(eq(milestones.user_id, userId));

  let completionRate = 0;
  if (allMilestones.length > 0) {
    const weights: Record<string, number> = {
      done: 100, active: 20, pending: 10, missed: 0,
    };
    const totalWeight = allMilestones.reduce(
      (acc, m) => acc + (weights[m.status] ?? 0), 0
    );
    completionRate = totalWeight / allMilestones.length;
  }

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const recentlyDone = await db.select().from(milestones)
    .where(and(
      eq(milestones.user_id, userId),
      eq(milestones.status, "done"),
      gt(milestones.completed_at, ninetyDaysAgo)
    ));

  const velocity = Math.min(recentlyDone.length * 20, 100);

  const streakScore = Math.min((user.streak ?? 0) * 14, 100);

  const userProofs = await db.select().from(proofs)
    .where(eq(proofs.user_id, userId));

  let pts = Math.min(userProofs.length * 15, 50);
  for (const p of userProofs) {
    if (p.url && isValidUrl(p.url)) pts += 10;
    if (p.note && p.note.length > 20) pts += 5;
  }
  const proofQuality = Math.min(pts, 100);

  const total = parseFloat((
    completionRate * 0.45 +
    velocity * 0.25 +
    streakScore * 0.15 +
    proofQuality * 0.15
  ).toFixed(1));

  return {
    completionRate: Math.round(completionRate),
    velocity,
    streakScore,
    proofQuality,
    total: Math.min(Math.max(total, 0), 100),
  };
};

const isValidUrl = (url: string) => {
  try { new URL(url); return true; }
  catch { return false; }
};

export const updateReputationAndRank = async (userId: string): Promise<void> => {
  const breakdown = await calcReputation(userId);
  await db.update(users)
    .set({ reputation_score: breakdown.total.toString() })
    .where(eq(users.id, userId));
  await recalcAllRanks();
};

export const recalcAllRanks = async (): Promise<void> => {
  await db.execute(sql`
    WITH ranked AS (
      SELECT id,
        ROW_NUMBER() OVER (
          ORDER BY reputation_score::numeric DESC,
          streak DESC,
          username ASC
        ) AS new_rank
      FROM users
    )
    UPDATE users
    SET rank = ranked.new_rank
    FROM ranked
    WHERE users.id = ranked.id
  `);
};