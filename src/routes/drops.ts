import { Hono } from 'hono'
import { db } from '../db/index.js'
import { drops, milestones, proofs, users } from '../db/schema.js'
import { eq, and, isNull, ilike, or, desc } from 'drizzle-orm'
import { authMiddleware } from '../middleware/auth.js'
import { apiRateLimit } from '../middleware/rateLimit.js'
import { createDropSchema, dropQuerySchema } from '../validators/schemas.js'
import { zValidator } from '@hono/zod-validator'
import { reputationQueue } from '../lib/queue.js'
import { updateReputationAndRank } from '../lib/reputation.js'
import { jsonSafeParse } from '../middleware/jsonParser.js'

const dropsRoute = new Hono()

// GET /drops — public, paginated
dropsRoute.get('/', zValidator('query', dropQuerySchema), async (c) => {
  const { page, limit, category, search } = c.req.valid('query')
  const offset = (page - 1) * limit

  const conditions: any[] = [isNull(drops.deleted_at)]
  if (category) conditions.push(eq(drops.category, category))
  if (search) {
    conditions.push(
      or(ilike(drops.title, `%${search}%`), ilike(drops.description, `%${search}%`))
    )
  }

  const rows = await db.select({
    id: drops.id,
    user_id: drops.user_id,
    title: drops.title,
    description: drops.description,
    category: drops.category,
    tech_stack: drops.tech_stack,
    live_url: drops.live_url,
    emoji: drops.emoji,
    created_at: drops.created_at,
    username: users.username,
    display_name: users.display_name,
    reputation_score: users.reputation_score,
  })
    .from(drops)
    .leftJoin(users, eq(drops.user_id, users.id))
    .where(and(...conditions))
    .orderBy(desc(drops.created_at))
    .limit(limit)
    .offset(offset)

  return c.json({ data: rows, page, limit })
})

// POST /drops — auth required
dropsRoute.post('/',
  authMiddleware,
  apiRateLimit,
  jsonSafeParse,
  zValidator('json', createDropSchema, (result, c) => {
    if (!result.success) {
      return c.json({ error: 'Validation failed', details: result.error.format() }, 400)
    }
  }),
  async (c) => {
    const { sub } = c.get('user')
    const { milestone: msData, ...dropData } = c.req.valid('json')

    const result = await db.transaction(async (tx) => {
      const [drop] = await tx.insert(drops).values({
        ...dropData,
        user_id: sub,
        live_url: dropData.live_url || null,
        emoji: dropData.emoji ?? '🚀',
      }).returning()

      const [ms] = await tx.insert(milestones).values({
        drop_id: drop.id,
        user_id: sub,
        goal: msData.goal,
        deadline: msData.deadline,
        proof_type: msData.proof_type,
        status: 'active',
        order: 1,
      }).returning()

      return { drop, milestone: ms }
    })

    reputationQueue.push(() => updateReputationAndRank(sub))
    return c.json(result, 201)
  })

// GET /drops/:id — public
dropsRoute.get('/:id', async (c) => {
  const id = c.req.param('id')

  const [drop] = await db.select().from(drops)
    .where(and(eq(drops.id, id), isNull(drops.deleted_at)))
  if (!drop) return c.json({ error: 'Drop not found' }, 404)

  const [owner] = await db.select({
    username: users.username,
    display_name: users.display_name,
    bio: users.bio,
    reputation_score: users.reputation_score,
    open_to: users.open_to,
    github_url: users.github_url,
  }).from(users).where(eq(users.id, drop.user_id))

  const ms = await db.select().from(milestones)
    .where(eq(milestones.drop_id, id))
    .orderBy(milestones.order)

  const ps = ms.length > 0
    ? await db.select().from(proofs)
      .where(or(...ms.map(m => eq(proofs.milestone_id, m.id)))!)
    : []

  const milestonesWithProofs = ms.map(m => ({
    ...m,
    proof: ps.find(p => p.milestone_id === m.id) ?? null
  }))

  const shipped = ms.filter(m => m.status === 'done').length
  const score = ms.length > 0 ? Math.round(shipped / ms.length * 100) : 0

  return c.json({ ...drop, owner, milestones: milestonesWithProofs, score })
})

// PATCH /drops/:id — owner only
dropsRoute.patch('/:id',
  authMiddleware,
  apiRateLimit,
  jsonSafeParse,
  async (c) => {
    const { sub } = c.get('user')
    const id = c.req.param('id')

    let body: any
    try {
      body = await c.req.json()
    } catch (err) {
      // This should normally be caught by jsonSafeParse, but as a double safety:
      return c.json({ error: 'Invalid JSON body' }, 400)
    }

    const [drop] = await db.select({ user_id: drops.user_id }).from(drops)
      .where(and(eq(drops.id, id), isNull(drops.deleted_at)))
    if (!drop) return c.json({ error: 'Drop not found' }, 404)
    if (drop.user_id !== sub) return c.json({ error: 'Forbidden' }, 403)

    const allowed = ['title', 'description', 'category', 'tech_stack', 'live_url', 'emoji']
    const patch = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)))

    const [updated] = await db.update(drops).set(patch).where(eq(drops.id, id)).returning()
    return c.json(updated)
  })

// DELETE /drops/:id — soft delete, owner only
dropsRoute.delete('/:id', authMiddleware, async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  const { sub } = user
  const id = c.req.param('id')

  const [drop] = await db.select({ user_id: drops.user_id }).from(drops)
    .where(and(eq(drops.id, id), isNull(drops.deleted_at)))
  if (!drop) return c.json({ error: 'Drop not found' }, 404)
  if (drop.user_id !== sub) return c.json({ error: 'Forbidden' }, 403)

  await db.update(drops).set({ deleted_at: new Date() }).where(eq(drops.id, id))
  return c.json({ ok: true })
})
export default dropsRoute