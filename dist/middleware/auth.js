import { verifyAccessToken } from "../lib/jwt.js";
export const authMiddleware = async (c, next) => {
    const authHeader = c.req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return c.json({ error: "Unauthorized: Missing or invalid token" }, 401);
    }
    const token = authHeader.split(" ")[1];
    const payload = await verifyAccessToken(token);
    if (!payload) {
        return c.json({ error: "Unauthorized: Token expired or invalid" }, 401);
    }
    c.set("jwtPayload", payload);
    await next();
};
//# sourceMappingURL=auth.js.map