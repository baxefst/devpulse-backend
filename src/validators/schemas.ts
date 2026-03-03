import { z } from 'zod'

export const registerSchema = z.object({
  username:     z.string().min(3).max(20).regex(/^[a-zA-Z0-9._-]+$/),
  display_name: z.string().min(1).max(80),
  email:        z.string().email(),
  password:     z.string().min(8).max(128),
  bio:          z.string().max(300).optional(),
  github_url:   z.string().url().optional().or(z.literal('')),
})

export const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
})

export const updateProfileSchema = z.object({
  display_name: z.string().min(1).max(80).optional(),
  bio:          z.string().max(300).optional(),
  tech_stack:   z.array(z.string().max(30)).max(10).optional(),
  open_to:      z.enum(['jobs','cofounders','investment','contracts','all']).nullable().optional(),
  github_url:   z.string().url().optional().or(z.literal('')),
  twitter_url:  z.string().url().optional().or(z.literal('')),
})

export const createDropSchema = z.object({
  title:       z.string().min(10).max(80),
  description: z.string().min(40).max(500),
  category:    z.enum(['SaaS','Dev Tool','API','Mobile','Open Source','Other']),
  tech_stack:  z.array(z.string().max(30)).max(10).default([]),
  live_url:    z.string().url().optional().or(z.literal('')),
  emoji:       z.string().max(4).optional(),
  milestone: z.object({
    goal:       z.string().min(5).max(200),
    deadline:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    proof_type: z.enum(['live_link','screenshot','revenue','users','github','video']),
  }),
})

export const createMilestoneSchema = z.object({
  goal:       z.string().min(5).max(200),
  deadline:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  proof_type: z.enum(['live_link','screenshot','revenue','users','github','video']),
})

export const submitProofSchema = z.object({
  url:  z.string().url(),
  note: z.string().max(1000).optional(),
})

export const dropQuerySchema = z.object({
  page:     z.coerce.number().int().min(1).default(1),
  limit:    z.coerce.number().int().min(1).max(50).default(20),
  category: z.enum(['SaaS','Dev Tool','API','Mobile','Open Source','Other']).optional(),
  search:   z.string().max(100).optional(),
})

export const leaderboardQuerySchema = z.object({
  page:    z.coerce.number().int().min(1).default(1),
  limit:   z.coerce.number().int().min(1).max(100).default(50),
  open_to: z.enum(['jobs','cofounders','investment','contracts','all']).optional(),
})