/**
 * Vercel Serverless Proxy for Supabase
 * 
 * ALL browser requests come as POST with body:
 * { targetUrl, targetMethod, targetHeaders, targetBody }
 * 
 * The proxy reconstructs the original request and forwards to Supabase.
 * Strips Set-Cookie from response to prevent cookie accumulation.
 */

export default async function handler(req: any, res: any) {
    // CORS + prevent cookie accumulation
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'content-type');
    // Explicitly clear any cookies to prevent 400 Request Header Too Large
    res.setHeader('Set-Cookie', 'clear=; path=/; max-age=0');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Only POST allowed' });
    }

    const { targetUrl, targetMethod, targetHeaders, targetBody } = req.body || {};

    if (!targetUrl) {
        return res.status(400).json({ error: 'Missing targetUrl in body' });
    }

    try {
        // Clean headers — only forward essential ones to Supabase
        const cleanHeaders: Record<string, string> = {};
        const ALLOWED = ['apikey', 'authorization', 'content-type', 'prefer', 'accept', 'accept-profile', 'content-profile', 'x-client-info'];
        if (targetHeaders) {
            for (const [k, v] of Object.entries(targetHeaders)) {
                if (ALLOWED.includes(k.toLowerCase()) && typeof v === 'string') {
                    cleanHeaders[k] = v;
                }
            }
        }

        const opts: RequestInit = {
            method: targetMethod || 'GET',
            headers: cleanHeaders,
        };

        if (targetMethod && targetMethod !== 'GET' && targetMethod !== 'HEAD' && targetBody) {
            opts.body = typeof targetBody === 'string' ? targetBody : JSON.stringify(targetBody);
        }

        const response = await fetch(targetUrl, opts);

        // Only forward safe response headers (NO Set-Cookie!)
        const ct = response.headers.get('content-type');
        if (ct) res.setHeader('Content-Type', ct);
        const cr = response.headers.get('content-range');
        if (cr) res.setHeader('Content-Range', cr);

        const body = await response.text();
        return res.status(response.status).send(body);
    } catch (err: any) {
        console.error('[PROXY]', err.message, targetUrl);
        return res.status(502).json({ error: err.message });
    }
}
