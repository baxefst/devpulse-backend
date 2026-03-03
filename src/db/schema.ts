import {
  pgTable, uuid, text, timestamp, integer,
  numeric, date, pgEnum, unique, index
} from 'drizzle-orm/pg-core'

export const openToEnum = pgEnum('open_to', [
  'jobs', 'cofounders', 'investment', 'contracts', 'all'
])

export const categoryEnum = pgEnum('category', [
  'SaaS', 'Dev Tool', 'API', 'Mobile', 'Open Source', 'Other'
])

export const proofTypeEnum = pgEnum('proof_type', [
  'live_link', 'screenshot', 'revenue', 'users', 'github', 'video'
])

export const milestoneStatusEnum = pgEnum('milestone_status', [
  'active', 'done', 'missed', 'pending'
])

export const users = pgTable('users', {
  id:               uuid('id').primaryKey().defaultRandom(),
  username:         text('username').notNull().unique(),
  display_name:     text('display_name'),
  email:            text('email').notNull().unique(),
  password_hash:    text('password_hash'),
  bio:              text('bio'),
  tech_stack:       text('tech_stack').array(),
  open_to:          openToEnum('open_to'),
  github_url:       text('github_url'),
  twitter_url:      text('twitter_url'),
  streak:           integer('streak').notNull().default(0),
  reputation_score: numeric('reputation_score', { precision: 5, scale: 1 }).notNull().default('0'),
  rank:             integer('rank'),
  created_at:       timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at:       timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const drops = pgTable('drops', {
  id:          uuid('id').primaryKey().defaultRandom(),
  user_id:     uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title:       text('title').notNull(),
  description: text('description').notNull(),
  category:    categoryEnum('category').notNull(),
  tech_stack:  text('tech_stack').array().notNull().default([]),
  live_url:    text('live_url'),
  emoji:       text('emoji').notNull().default('🚀'),
  deleted_at:  timestamp('deleted_at', { withTimezone: true }),
  created_at:  timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userIdx: index('drops_user_idx').on(t.user_id),
}))

export const milestones = pgTable('milestones', {
  id:           uuid('id').primaryKey().defaultRandom(),
  drop_id:      uuid('drop_id').notNull().references(() => drops.id, { onDelete: 'cascade' }),
  user_id:      uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  goal:         text('goal').notNull(),
  deadline:     date('deadline').notNull(),
  proof_type:   proofTypeEnum('proof_type').notNull(),
  status:       milestoneStatusEnum('status').notNull().default('active'),
  order:        integer('order').notNull().default(1),
  completed_at: timestamp('completed_at', { withTimezone: true }),
  created_at:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  dropIdx: index('milestones_drop_idx').on(t.drop_id),
  userIdx: index('milestones_user_idx').on(t.user_id),
}))

export const proofs = pgTable('proofs', {
  id:           uuid('id').primaryKey().defaultRandom(),
  milestone_id: uuid('milestone_id').notNull().references(() => milestones.id, { onDelete: 'cascade' }),
  user_id:      uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  url:          text('url').notNull(),
  note:         text('note'),
  created_at:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqueMs: unique('proofs_milestone_unique').on(t.milestone_id),
}))

export const refreshTokens = pgTable('refresh_tokens', {
  id:         uuid('id').primaryKey().defaultRandom(),
  user_id:    uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token_hash: text('token_hash').notNull().unique(),
  expires_at: timestamp('expires_at', { withTimezone: true }).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type User      = typeof users.$inferSelect
export type Drop      = typeof milestones.$inferSelect
export type Milestone = typeof milestones.$inferSelect
export type Proof     = typeof proofs.$inferSelect