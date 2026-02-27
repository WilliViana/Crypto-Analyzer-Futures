const SUPABASE_URL = 'https://bhigvgfkttvjibvlyqpl.supabase.co';

export default async function handler(req: any, res: any) {
    // The 'path' query param is set by vercel.json rewrite: /sb/:path* → /api/proxy?path=:path*
    const subPath = req.query.path || '';

    // Build full Supabase URL
    const targetUrl = new URL(`${SUPABASE_URL}/${subPath}`);

    // Forward all query params EXCEPT 'path' (internal routing param)
    Object.entries(req.query).forEach(([key, value]: [string, any]) => {
        if (key !== 'path') {
            targetUrl.searchParams.set(key, Array.isArray(value) ? value[0] : value || '');
        }
    });

    // Forward relevant headers to Supabase
    const headers: Record<string, string> = {};
    const forwardHeaders = [
        'apikey', 'authorization', 'content-type', 'prefer',
        'accept', 'accept-profile', 'content-profile', 'x-client-info'
    ];
    for (const h of forwardHeaders) {
        const val = req.headers[h];
        if (val) headers[h] = Array.isArray(val) ? val[0] : val;
    }

    // Handle OPTIONS preflight immediately
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'apikey, authorization, content-type, prefer, accept, x-client-info');
        return res.status(200).end();
    }

    try {
        const fetchOptions: any = {
            method: req.method || 'GET',
            headers,
        };

        // Forward body for non-GET requests
        if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
            fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
        }

        const response = await fetch(targetUrl.toString(), fetchOptions);

        // Forward Supabase response headers
        const responseHeadersToForward = [
            'content-type', 'x-total-count', 'content-range',
            'sb-gateway-version', 'x-envoy-upstream-service-time'
        ];
        for (const h of responseHeadersToForward) {
            const val = response.headers.get(h);
            if (val) res.setHeader(h, val);
        }

        // Allow CORS
        res.setHeader('Access-Control-Allow-Origin', '*');

        const data = await response.text();
        res.status(response.status).send(data);
    } catch (error: any) {
        console.error('[SUPABASE PROXY ERROR]', error.message);
        res.status(502).json({
            error: 'Proxy connection failed',
            message: error.message,
            target: targetUrl.toString()
        });
    }
}
