
// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// --- HMAC SHA-256 Signature ---
async function hmacSha256(queryString: string, apiSecret: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        "raw", encoder.encode(apiSecret),
        { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(queryString));
    return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// --- Exchange Config ---
interface ExchangeConfig {
    baseUrls: { live: string[]; testnet: string[] };
    signatureParam: string;
    apiKeyHeader: string;
    timestampParam: string;
    recvWindowParam?: string;
    recvWindowValue?: string;
}

const EXCHANGE_CONFIGS: Record<string, ExchangeConfig> = {
    binance: {
        baseUrls: {
            live: ['https://fapi.binance.com', 'https://fapi1.binance.com', 'https://fapi2.binance.com'],
            testnet: ['https://testnet.binancefuture.com'],
        },
        signatureParam: 'signature',
        apiKeyHeader: 'X-MBX-APIKEY',
        timestampParam: 'timestamp',
        recvWindowParam: 'recvWindow',
        recvWindowValue: '60000',
    },
    bybit: {
        baseUrls: {
            live: ['https://api.bybit.com'],
            testnet: ['https://api-testnet.bybit.com'],
        },
        signatureParam: 'sign',
        apiKeyHeader: 'X-BAPI-API-KEY',
        timestampParam: 'X-BAPI-TIMESTAMP',
    },
    okx: {
        baseUrls: {
            live: ['https://www.okx.com'],
            testnet: ['https://www.okx.com'], // OKX uses header for demo
        },
        signatureParam: 'OK-ACCESS-SIGN',
        apiKeyHeader: 'OK-ACCESS-KEY',
        timestampParam: 'OK-ACCESS-TIMESTAMP',
    },
};

// --- Binance-style request (query string signature) ---
async function makeBinanceStyleRequest(
    baseUrl: string, endpoint: string, method: string,
    params: Record<string, any>, apiKey: string, apiSecret: string,
    config: ExchangeConfig
) {
    const timestamp = Date.now();
    const qp = new URLSearchParams();

    for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null) qp.append(k, String(v));
    }

    if (config.recvWindowParam) qp.append(config.recvWindowParam, config.recvWindowValue || '5000');
    qp.append(config.timestampParam, timestamp.toString());

    const queryString = qp.toString();
    const signature = await hmacSha256(queryString, apiSecret);
    const finalQuery = `${queryString}&${config.signatureParam}=${signature}`;
    const url = `${baseUrl}${endpoint}?${finalQuery}`;

    console.log(`🚀 [PROXY] ${method} ${url.substring(0, 120)}...`);

    const response = await fetch(url, {
        method,
        headers: { [config.apiKeyHeader]: apiKey, 'Content-Type': 'application/json' },
    });

    const data = await response.json();
    console.log(`📤 [PROXY] Status: ${response.status} | Body: ${JSON.stringify(data).substring(0, 300)}`);
    return { data, status: response.status };
}

// --- Bybit request (header signature) ---
async function makeBybitRequest(
    baseUrl: string, endpoint: string, method: string,
    params: Record<string, any>, apiKey: string, apiSecret: string,
    _config: ExchangeConfig
) {
    const timestamp = Date.now().toString();
    const recvWindow = '20000';

    let queryString = '';
    let body = '';

    if (method === 'GET') {
        const qp = new URLSearchParams();
        for (const [k, v] of Object.entries(params)) {
            if (v !== undefined && v !== null) qp.append(k, String(v));
        }
        queryString = qp.toString();
    } else {
        body = JSON.stringify(params);
    }

    // Bybit signature: timestamp + apiKey + recvWindow + (queryString or body)
    const preSign = `${timestamp}${apiKey}${recvWindow}${method === 'GET' ? queryString : body}`;
    const signature = await hmacSha256(preSign, apiSecret);

    const url = method === 'GET' && queryString
        ? `${baseUrl}${endpoint}?${queryString}`
        : `${baseUrl}${endpoint}`;

    console.log(`🚀 [BYBIT] ${method} ${url.substring(0, 120)}...`);

    const response = await fetch(url, {
        method,
        headers: {
            'Content-Type': 'application/json',
            'X-BAPI-API-KEY': apiKey,
            'X-BAPI-TIMESTAMP': timestamp,
            'X-BAPI-RECV-WINDOW': recvWindow,
            'X-BAPI-SIGN': signature,
        },
        body: method !== 'GET' ? body : undefined,
    });

    const data = await response.json();
    console.log(`📤 [BYBIT] Status: ${response.status} | Body: ${JSON.stringify(data).substring(0, 300)}`);
    return { data, status: response.status };
}

// --- OKX request (header signature, base64) ---
async function makeOkxRequest(
    baseUrl: string, endpoint: string, method: string,
    params: Record<string, any>, apiKey: string, apiSecret: string,
    _config: ExchangeConfig, isTestnet: boolean, passphrase?: string
) {
    const timestamp = new Date().toISOString();

    let queryString = '';
    let body = '';

    if (method === 'GET') {
        const qp = new URLSearchParams();
        for (const [k, v] of Object.entries(params)) {
            if (v !== undefined && v !== null) qp.append(k, String(v));
        }
        queryString = qp.toString();
    } else {
        body = JSON.stringify(params);
    }

    const path = queryString ? `${endpoint}?${queryString}` : endpoint;
    const preSign = `${timestamp}${method}${path}${body}`;
    const signature = await hmacSha256(preSign, apiSecret);
    // OKX uses base64 of HMAC
    const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(
        await crypto.subtle.sign("HMAC",
            await crypto.subtle.importKey("raw", new TextEncoder().encode(apiSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]),
            new TextEncoder().encode(preSign)
        )
    )));

    const url = `${baseUrl}${path}`;
    console.log(`🚀 [OKX] ${method} ${url.substring(0, 120)}...`);

    const response = await fetch(url, {
        method,
        headers: {
            'Content-Type': 'application/json',
            'OK-ACCESS-KEY': apiKey,
            'OK-ACCESS-SIGN': signatureB64,
            'OK-ACCESS-TIMESTAMP': timestamp,
            'OK-ACCESS-PASSPHRASE': passphrase || '',
            ...(isTestnet ? { 'x-simulated-trading': '1' } : {}),
        },
        body: method !== 'GET' ? body : undefined,
    });

    const data = await response.json();
    console.log(`📤 [OKX] Status: ${response.status} | Body: ${JSON.stringify(data).substring(0, 300)}`);
    return { data, status: response.status };
}

// --- Main Handler ---
serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { endpoint, params = {}, credentials, method = 'GET', exchangeId = 'binance' } = await req.json();
        console.log(`📥 [PROXY] Exchange: ${exchangeId} | ${method} ${endpoint}`);

        if (!credentials?.apiKey) throw new Error("Missing API credentials.");

        const { apiKey, apiSecret, isTestnet, passphrase } = credentials;
        const config = EXCHANGE_CONFIGS[exchangeId] || EXCHANGE_CONFIGS.binance;
        const baseUrls = isTestnet ? config.baseUrls.testnet : config.baseUrls.live;

        let result: any;
        let lastError: any;
        let success = false;

        for (const baseUrl of baseUrls) {
            try {
                if (exchangeId === 'bybit') {
                    result = await makeBybitRequest(baseUrl, endpoint, method, params, apiKey, apiSecret, config);
                } else if (exchangeId === 'okx') {
                    result = await makeOkxRequest(baseUrl, endpoint, method, params, apiKey, apiSecret, config, !!isTestnet, passphrase);
                } else {
                    // Binance-style (binance, mexc, bingx use similar API)
                    result = await makeBinanceStyleRequest(baseUrl, endpoint, method, params, apiKey, apiSecret, config);
                }

                // Check for 451 (Binance geo-block)
                if (result?.data?.code === 451 || result?.data?.code === '451') {
                    console.warn(`⚠️ [PROXY] 451 geo-block on ${baseUrl}. Trying next...`);
                    lastError = result;
                    continue;
                }

                success = true;
                break;
            } catch (err: any) {
                console.warn(`⚠️ [PROXY] Failed on ${baseUrl}: ${err.message}`);
                lastError = { data: { error: err.message }, status: 500 };
            }
        }

        if (!success && lastError) result = lastError;

        // Binance hedge mode retry
        if (exchangeId === 'binance' && result?.data?.code === -4061 && endpoint === '/fapi/v1/order') {
            console.log(`🔄 [PROXY] Hedge mode retry...`);
            const positionSide = params.side === 'BUY' ? 'LONG' : 'SHORT';
            result = await makeBinanceStyleRequest(baseUrls[0], endpoint, method, { ...params, positionSide }, apiKey, apiSecret, config);
            if (result.data.code === -4061) {
                const opp = positionSide === 'LONG' ? 'SHORT' : 'LONG';
                result = await makeBinanceStyleRequest(baseUrls[0], endpoint, method, { ...params, positionSide: opp }, apiKey, apiSecret, config);
            }
        }

        return new Response(JSON.stringify(result.data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: result.status,
        });

    } catch (error: any) {
        console.error("❌ [PROXY] Error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
