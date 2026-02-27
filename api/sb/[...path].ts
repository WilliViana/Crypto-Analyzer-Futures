const SUPABASE_URL = 'https://bhigvgfkttvjibvlyqpl.supabase.co';

export default async function handler(req: any, res: any) {
    // Extract the sub-path from the URL
    const { path } = req.query;
    const subPath = Array.isArray(path) ? path.join('/') : path || '';

    // Build the target Supabase URL with query parameters
    const url = new URL(`${SUPABASE_URL}/${subPath}`);
    // Forward all query params except 'path' (which is the catch-all param)
    Object.entries(req.query).forEach(([key, value]: [string, any]) => {
        if (key !== 'path') {
            url.searchParams.set(key, Array.isArray(value) ? value[0] : value || '');
        }
    });

    // Forward relevant headers
    const headers: Record<string, string> = {};
    const forwardHeaders = ['apikey', 'authorization', 'content-type', 'prefer', 'accept', 'accept-profile', 'content-profile', 'x-client-info'];
    for (const h of forwardHeaders) {
        const val = req.headers[h];
        if (val) headers[h] = Array.isArray(val) ? val[0] : val;
    }

    try {
        const response = await fetch(url.toString(), {
            method: req.method || 'GET',
            headers,
            body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
        });

        // Forward response headers
        const responseHeaders = ['content-type', 'x-total-count', 'content-range', 'prefer'];
        for (const h of responseHeaders) {
            const val = response.headers.get(h);
            if (val) res.setHeader(h, val);
        }

        // Allow CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'apikey, authorization, content-type, prefer, accept, x-client-info');

        // Handle OPTIONS preflight
        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }

        const data = await response.text();
        res.status(response.status).send(data);
    } catch (error: any) {
        console.error('[PROXY ERROR]', error.message);
        res.status(502).json({ error: 'Proxy error', message: error.message });
    }
}
