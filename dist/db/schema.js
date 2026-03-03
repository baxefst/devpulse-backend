import { pgTable, text, timestamp, uuid, integer, numeric, pgEnum, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
// Enums
export const openToEnum = pgEnum("open_to", ["jobs", "cofounders", "investment", "contracts", "all"]);
export const categoryEnum = pgEnum("category", ["SaaS", "Dev Tool", "API", "Mobile", "Open Source", "Other"]);
export const proofTypeEnum = pgEnum("proof_type", ["live_link", "screenshot", "revenue", "users", "github", "video"]);
export const milestoneStatusEnum = pgEnum("milestone_status", ["active", "done", "missed", "pending"]);
// Users Table
export const users = pgTable("users", {
    id: uuid("id").primaryKey().defaultRandom(),
    username: text("username").notNull().unique(),
    displayName: text("display_name").notNull(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    bio: text("bio"),
    techStack: text("tech_stack").array(),
    openTo: openToEnum("open_to"),
    githubUrl: text("github_url"),
    twitterUrl: text("twitter_url"),
    streak: integer("streak").notNull().default(0),
    reputationScore: numeric("reputation_score", { precision: 5, scale: 1 }).notNull().default("0.0"),
    rank: integer("rank"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
// Drops Table
export const drops = pgTable("drops", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    category: categoryEnum("category").notNull(),
    techStack: text("tech_stack").array().notNull().default([]),
    liveUrl: text("live_url"),
    emoji: text("emoji").notNull().default("🚀"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
    userIndex: index("drops_user_idx").on(table.userId),
}));
// Milestones Table
export const milestones = pgTable("milestones", {
    id: uuid("id").primaryKey().defaultRandom(),
    dropId: uuid("drop_id").notNull().references(() => drops.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    goal: text("goal").notNull(),
    deadline: timestamp("deadline", { mode: "string" }).notNull(), // date as string in Drizzle
    proofType: proofTypeEnum("proof_type").notNull(),
    status: milestoneStatusEnum("milestone_status").notNull().default("active"),
    order: integer("order").notNull().default(1),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
    dropIndex: index("milestones_drop_idx").on(table.dropId),
    userIndex: index("milestones_user_idx").on(table.userId),
}));
// Proofs Table
export const proofs = pgTable("proofs", {
    id: uuid("id").primaryKey().defaultRandom(),
    milestoneId: uuid("milestone_id").notNull().unique().references(() => milestones.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
// Refresh Tokens Table
export const refreshTokens = pgTable("refresh_tokens", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
// Relations
export const usersRelations = relations(users, ({ many }) => ({
    drops: many(drops),
    milestones: many(milestones),
    proofs: many(proofs),
    refreshTokens: many(refreshTokens),
}));
export const dropsRelations = relations(drops, ({ one, many }) => ({
    user: one(users, { fields: [drops.userId], references: [users.id] }),
    milestones: many(milestones),
}));
export const milestonesRelations = relations(milestones, ({ one }) => ({
    drop: one(drops, { fields: [milestones.dropId], references: [drops.id] }),
    user: one(users, { fields: [milestones.userId], references: [users.id] }),
    proof: one(proofs, { fields: [milestones.id], references: [proofs.milestoneId] }),
}));
export const proofsRelations = relations(proofs, ({ one }) => ({
    milestone: one(milestones, { fields: [proofs.milestoneId], references: [milestones.id] }),
    user: one(users, { fields: [proofs.userId], references: [users.id] }),
}));
export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
    user: one(users, { fields: [refreshTokens.userId], references: [users.id] }),
}));
//# sourceMappingURL=schema.js.map