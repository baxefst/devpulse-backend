import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import auth from './routes/auth.js';
import usersRoute from './routes/users.js';
import dropsRoute from './routes/drops.js';
import msRoute from './routes/milestones.js';
import lb from './routes/leaderboard.js';
import { startCronJobs } from './lib/cron.js';
import { jsonSafeParse } from './middleware/jsonParser.js';
const app = new Hono();
app.use('*', logger());
app.use('*', secureHeaders());
app.use('*', cors({
    origin: process.env.ALLOWED_ORIGIN ?? '*',
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
}));
app.use('*', jsonSafeParse);
app.get('/health', (c) => c.json({ ok: true, ts: new Date().toISOString() }));
app.route('/api/v1/auth', auth);
app.route('/api/v1/users', usersRoute);
app.route('/api/v1/drops', dropsRoute);
app.route('/api/v1', msRoute);
app.route('/api/v1/leaderboard', lb);
app.notFound((c) => c.json({ error: 'Route not found' }, 404));
app.onError((err, c) => {
    console.error(err);
    return c.json({ error: 'Internal server error' }, 500);
});
const port = Number(process.env.PORT ?? 3000);
startCronJobs();
serve({ fetch: app.fetch, port }, () => {
    console.log(`🚀 DevPulse API running on http://localhost:${port}`);
});
//# sourceMappingURL=index.js.map