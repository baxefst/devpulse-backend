import cron from "node-cron";
import { db } from "../db/index.js";
import { milestones } from "../db/schema.js";
import { and, eq, lt, sql } from "drizzle-orm";
import { recalcAllRanks } from "./reputation.js";

export const startCronJobs = () => {
    // Runs every hour
    cron.schedule("0 * * * *", async () => {
        console.log("Running hourly missed-milestone check...");

        const result = await db.update(milestones)
            .set({ status: "missed" })
            .where(
                and(
                    eq(milestones.status, "active"),
                    lt(milestones.deadline, sql`CURRENT_DATE`)
                )
            );

        if (result.rowCount && result.rowCount > 0) {
            console.log(`Marked ${result.rowCount} milestones as missed. Recalculating ranks...`);
            await recalcAllRanks();
        }
    });
};
