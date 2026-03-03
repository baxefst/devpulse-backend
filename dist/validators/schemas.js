import { z } from "zod";
// Auth
export const registerSchema = z.object({
    username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9._-]+$/),
    displayName: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(8),
    bio: z.string().max(500).optional(),
    githubUrl: z.string().url().optional(),
});
export const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});
export const refreshSchema = z.object({
    refreshToken: z.string().min(1),
});
// Users
export const updateMeSchema = z.object({
    displayName: z.string().min(1).optional(),
    bio: z.string().max(500).optional(),
    techStack: z.array(z.string()).optional(),
    openTo: z.enum(["jobs", "cofounders", "investment", "contracts", "all"]).optional(),
    githubUrl: z.string().url().optional(),
    twitterUrl: z.string().url().optional(),
});
// Drops
export const createDropSchema = z.object({
    title: z.string().min(10).max(80),
    description: z.string().min(40).max(500),
    category: z.enum(["SaaS", "Dev Tool", "API", "Mobile", "Open Source", "Other"]),
    techStack: z.array(z.string()).default([]),
    liveUrl: z.string().url().optional(),
    emoji: z.string().default("🚀"),
    milestone: z.object({
        goal: z.string().min(5),
        deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
        proofType: z.enum(["live_link", "screenshot", "revenue", "users", "github", "video"]),
    }),
});
export const updateDropSchema = z.object({
    title: z.string().min(10).max(80).optional(),
    description: z.string().min(40).max(500).optional(),
    category: z.enum(["SaaS", "Dev Tool", "API", "Mobile", "Open Source", "Other"]).optional(),
    techStack: z.array(z.string()).optional(),
    liveUrl: z.string().url().optional(),
    emoji: z.string().optional(),
});
// Milestones
export const createMilestoneSchema = z.object({
    goal: z.string().min(5),
    deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    proofType: z.enum(["live_link", "screenshot", "revenue", "users", "github", "video"]),
});
export const updateMilestoneSchema = z.object({
    goal: z.string().min(5).optional(),
    deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    proofType: z.enum(["live_link", "screenshot", "revenue", "users", "github", "video"]).optional(),
});
export const createProofSchema = z.object({
    url: z.string().url(),
    note: z.string().max(1000).optional(),
});
// Query Params
export const paginationSchema = z.object({
    page: z.string().transform(Number).default("1"),
    limit: z.string().transform(Number).default("20"),
    category: z.enum(["SaaS", "Dev Tool", "API", "Mobile", "Open Source", "Other"]).optional(),
    search: z.string().optional(),
    userId: z.string().optional(),
});
export const leaderboardQuerySchema = z.object({
    page: z.string().transform(Number).default("1"),
    limit: z.string().transform(Number).default("50"),
    openTo: z.enum(["jobs", "cofounders", "investment", "contracts", "all"]).optional(),
});
//# sourceMappingURL=schemas.js.map