import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { cors } from "hono/cors";
import authRoutes from "./routes/auth.js";
import usersRoutes from "./routes/users.js";
import dropsRoutes from "./routes/drops.js";
import milestonesRoutes from "./routes/milestones.js";
import leaderboardRoutes from "./routes/leaderboard.js";
import { startCronJobs } from "./lib/cron.js";
const app = new Hono().basePath("/api/v1");
// Global Middleware
app.use("*", logger());
app.use("*", secureHeaders());
app.use("*", cors({
    origin: process.env.ALLOWED_ORIGIN || "*",
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
}));
// Routes
app.route("/auth", authRoutes);
app.route("/users", usersRoutes);
app.route("/", dropsRoutes); // drops has /drops prefix in file
app.route("/", milestonesRoutes); // milestones has /drops/:id/milestones and /milestones/:id
app.route("/leaderboard", leaderboardRoutes);
// Health Check
app.get("/health", (c) => c.json({ status: "ok", timestamp: new Date().toISOString() }));
// Start Cron Jobs
startCronJobs();
// Serve
const port = Number(process.env.PORT) || 3000;
console.log(`🚀 DevPulse Backend running on port ${port}`);
serve({
    fetch: app.fetch,
    port,
});
//# sourceMappingURL=index.js.map