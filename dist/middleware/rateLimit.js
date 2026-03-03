class TokenBucket {
    tokens;
    lastRefill;
    maxTokens;
    refillRate; // tokens per ms
    constructor(limit, windowMs) {
        this.maxTokens = limit;
        this.tokens = limit;
        this.lastRefill = Date.now();
        this.refillRate = limit / windowMs;
    }
    tryConsume() {
        this.refill();
        if (this.tokens >= 1) {
            this.tokens -= 1;
            return true;
        }
        return false;
    }
    refill() {
        const now = Date.now();
        const elapsed = now - this.lastRefill;
        const refillTokens = elapsed * this.refillRate;
        this.tokens = Math.min(this.maxTokens, this.tokens + refillTokens);
        this.lastRefill = now;
    }
}
const buckets = new Map();
const createRateLimiter = (options) => {
    return async (c, next) => {
        const userId = c.get("jwtPayload")?.sub || c.req.header("x-forwarded-for") || "anonymous";
        const key = `${options.keyPrefix}:${userId}`;
        if (!buckets.has(key)) {
            buckets.set(key, new TokenBucket(options.limit, options.windowMs));
        }
        const bucket = buckets.get(key);
        if (bucket.tryConsume()) {
            await next();
        }
        else {
            return c.json({ error: "Too many requests. Please try again later." }, 429);
        }
    };
};
// 10 req/min per IP
export const loginRateLimit = createRateLimiter({
    limit: 10,
    windowMs: 60 * 1000,
    keyPrefix: "login",
});
// 60 req/min per userId
export const apiRateLimit = createRateLimiter({
    limit: 60,
    windowMs: 60 * 1000,
    keyPrefix: "api",
});
// 5 req/min per userId
export const proofRateLimit = createRateLimiter({
    limit: 5,
    windowMs: 60 * 1000,
    keyPrefix: "proof",
});
//# sourceMappingURL=rateLimit.js.map