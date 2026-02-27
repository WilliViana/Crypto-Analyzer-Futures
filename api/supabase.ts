/**
 * Vercel Serverless Proxy for Supabase
 * 
 * ALL browser requests come as POST with body:
 * { targetUrl, targetMethod, targetHeaders, targetBody }
 * 
 * The proxy reconstructs the original request and forwards to Supabase.
 * This bypasses ISP/WAF that blocks GET requests with SQL-like query params.
 */

export default async function handler(req: any, res: any) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'content-type');

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
        const opts: RequestInit = {
            method: targetMethod || 'GET',
            headers: targetHeaders || {},
        };

        // Forward body for non-GET methods
        if (targetMethod && targetMethod !== 'GET' && targetMethod !== 'HEAD' && targetBody) {
            opts.body = typeof targetBody === 'string' ? targetBody : JSON.stringify(targetBody);
        }

        const response = await fetch(targetUrl, opts);

        // Forward important response headers
        for (const h of ['content-type', 'content-range', 'x-total-count']) {
            const v = response.headers.get(h);
            if (v) res.setHeader(h, v);
        }

        const body = await response.text();
        return res.status(response.status).send(body);
    } catch (err: any) {
        console.error('[PROXY]', err.message, targetUrl);
        return res.status(502).json({ error: err.message });
    }
}
