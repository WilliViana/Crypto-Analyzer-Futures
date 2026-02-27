/**
 * Vercel Serverless Proxy for Supabase
 * 
 * Why: User's ISP/network blocks Supabase REST API calls after CORS preflight.
 * The browser sends OPTIONS (200 OK) but the actual GET/POST never arrives at Supabase.
 * This proxy makes requests server-side from Vercel's infrastructure, bypassing the block.
 * 
 * Route: /api/supabase?path=rest/v1/exchanges&select=*&user_id=eq.xxx
 * vercel.json rewrites /api/supabase/:path* → /api/supabase?path=:path*
 */

const SUPABASE_URL = 'https://bhigvgfkttvjibvlyqpl.supabase.co';

export default async function handler(req: any, res: any) {
    // CORS headers for all responses
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'apikey, authorization, content-type, prefer, accept, x-client-info, accept-profile, content-profile');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Build target URL from path query param + other query params
    const subPath = req.query.path || '';
    const targetUrl = new URL(`${SUPABASE_URL}/${subPath}`);

    // Forward all query params except our internal 'path'
    for (const [key, value] of Object.entries(req.query)) {
        if (key !== 'path') {
            targetUrl.searchParams.set(key, Array.isArray(value) ? (value as string[])[0] : value as string);
        }
    }

    // Forward auth-related headers
    const headers: Record<string, string> = {};
    const FORWARD = ['apikey', 'authorization', 'content-type', 'prefer', 'accept', 'accept-profile', 'content-profile', 'x-client-info'];
    for (const h of FORWARD) {
        if (req.headers[h]) headers[h] = req.headers[h];
    }

    try {
        const opts: RequestInit = { method: req.method, headers };
        if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
            opts.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
        }

        const response = await fetch(targetUrl.toString(), opts);

        // Forward important response headers
        for (const h of ['content-type', 'content-range', 'x-total-count']) {
            const v = response.headers.get(h);
            if (v) res.setHeader(h, v);
        }

        const body = await response.text();
        return res.status(response.status).send(body);
    } catch (err: any) {
        console.error('[PROXY]', err.message, targetUrl.toString());
        return res.status(502).json({ error: err.message });
    }
}
