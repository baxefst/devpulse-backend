import { Context, Next } from 'hono'
import { HTTPException } from 'hono/http-exception'

/**
 * Middleware to safely parse JSON body and handle malformed input.
 * Also enforces Content-Type: application/json for POST/PATCH/PUT requests.
 */
export const jsonSafeParse = async (c: Context, next: Next) => {
    const method = c.req.method
    const contentType = c.req.header('Content-Type') || ''

    // Only check for methods that typically have a body
    if (['POST', 'PATCH', 'PUT'].includes(method)) {
        if (!contentType.includes('application/json')) {
            return c.json({ error: 'Content-Type must be application/json' }, 400)
        }

        try {
            const cloned = c.req.raw.clone()
            const rawBody = await cloned.text()

            if (rawBody && rawBody.trim() !== '') {
                try {
                    JSON.parse(rawBody)
                } catch (e) {
                    console.error(`[JSON Parse Error] Method: ${method}, Path: ${c.req.path}`)
                    console.error(`[Raw Body]: ${rawBody}`)
                    return c.json({ error: 'Invalid JSON body' }, 400)
                }
            }
        } catch (err) {
            console.error('[Request Error]:', err)
            return c.json({ error: 'Invalid JSON body' }, 400)
        }
    }

    return await next()
}
