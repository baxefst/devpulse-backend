import { Hono } from 'hono'
import { db } from '../db/index.js'
import { users, milestones } from '../db/schema.js'
import { eq, asc, desc, sql } from 'drizzle-orm'
import { leaderboardQuerySchema } from '../validators/schemas.js'
import { zValidator } from '@hono/zod-validator'

const lb = new Hono()

lb.get('/', zValidator('query', leaderboardQuerySchema), async (c) => {
  const { page, limit, open_to } = c.req.valid('query')
  const offset = (page - 1) * limit

  try {
    const allUsers = await db.select({
      id:               users.id,
      username:         users.username,
      display_name:     users.display_name,
      bio:              users.bio,
      tech_stack:       users.tech_stack,
      open_to:          users.open_to,
      github_url:       users.github_url,
      streak:           users.streak,
      rank:             users.rank,
      reputation_score: sql<number>`CAST(${users.reputation_score} AS FLOAT)`,
    })
    .from(users)
    .orderBy(
      desc(users.reputation_score),
      desc(users.streak),
      asc(users.username)
    )
    .limit(limit)
    .offset(offset)

    const filtered = open_to
      ? allUsers.filter(u => u.open_to === open_to || u.open_to === 'all')
      : allUsers

    const weights: Record<string, number> = {
      done: 100, active: 20, pending: 10, missed: 0
    }

    const enriched = await Promise.all(
      filtered.map(async (u) => {
        const ms = await db
          .select({ status: milestones.status })
          .from(milestones)
          .where(eq(milestones.user_id, u.id))

        const cr = ms.length > 0
          ? Math.round(
              ms.reduce((s, m) => s + (weights[m.status] ?? 0), 0) / ms.length
            )
          : 0

        return {
          ...u,
          _shipped:    ms.filter(m => m.status === 'done').length,
          _milestones: ms.length,
          _cr:         cr,
        }
      })
    )

    return c.json({ data: enriched, page, limit })

  } catch (err) {
    console.error('[leaderboard] error:', err)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default lb