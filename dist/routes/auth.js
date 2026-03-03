import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import bcrypt from "bcrypt";
import { db } from "../db/index.js";
import { users, refreshTokens } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { registerSchema, loginSchema, refreshSchema } from "../validators/schemas.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken, hashToken } from "../lib/jwt.js";
const auth = new Hono();
// POST /auth/register
auth.post("/register", zValidator("json", registerSchema), async (c) => {
    const body = c.req.valid("json");
    // Check unique constraints
    const existingEmail = await db.query.users.findFirst({
        where: eq(users.email, body.email),
    });
    if (existingEmail)
        return c.json({ error: "Email already taken" }, 409);
    const existingUsername = await db.query.users.findFirst({
        where: eq(users.username, body.username),
    });
    if (existingUsername)
        return c.json({ error: "Username already taken" }, 409);
    // Hash password
    const passwordHash = await bcrypt.hash(body.password, 12);
    // Create user
    const [user] = await db.insert(users).values({
        username: body.username,
        displayName: body.displayName,
        email: body.email,
        passwordHash,
        bio: body.bio,
        githubUrl: body.githubUrl,
    }).returning();
    const { passwordHash: _, ...userPublic } = user;
    // Generate tokens
    const payload = { sub: user.id, email: user.email };
    const accessToken = await signAccessToken(payload);
    const refreshToken = await signRefreshToken(payload);
    // Store refresh token
    await db.insert(refreshTokens).values({
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });
    return c.json({ accessToken, refreshToken, user: userPublic });
});
// POST /auth/login
auth.post("/login", zValidator("json", loginSchema), async (c) => {
    const { email, password } = c.req.valid("json");
    const user = await db.query.users.findFirst({
        where: eq(users.email, email),
    });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        return c.json({ error: "Invalid credentials" }, 401);
    }
    const { passwordHash: _, ...userPublic } = user;
    const payload = { sub: user.id, email: user.email };
    const accessToken = await signAccessToken(payload);
    const refreshToken = await signRefreshToken(payload);
    await db.insert(refreshTokens).values({
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    return c.json({ accessToken, refreshToken, user: userPublic });
});
// POST /auth/refresh
auth.post("/refresh", zValidator("json", refreshSchema), async (c) => {
    const { refreshToken } = c.req.valid("json");
    const payload = await verifyRefreshToken(refreshToken);
    if (!payload)
        return c.json({ error: "Invalid refresh token" }, 401);
    const tokenHash = hashToken(refreshToken);
    const storedToken = await db.query.refreshTokens.findFirst({
        where: eq(refreshTokens.tokenHash, tokenHash),
    });
    if (!storedToken || storedToken.expiresAt < new Date()) {
        return c.json({ error: "Token expired or revoked" }, 401);
    }
    const newAccessToken = await signAccessToken({ sub: payload.sub, email: payload.email });
    return c.json({ accessToken: newAccessToken });
});
// POST /auth/logout
auth.post("/logout", zValidator("json", refreshSchema), async (c) => {
    const { refreshToken } = c.req.valid("json");
    const tokenHash = hashToken(refreshToken);
    await db.delete(refreshTokens).where(eq(refreshTokens.tokenHash, tokenHash));
    return c.json({ ok: true });
});
export default auth;
//# sourceMappingURL=auth.js.map