
// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function generateSignature(queryString: string, apiSecret: string) {
  const encoder = new TextEncoder();
  const key = encoder.encode(apiSecret);
  const data = encoder.encode(queryString);
  const hmac = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", hmac, data);
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { endpoint, params, credentials, method = 'GET' } = await req.json();

    if (!credentials || !credentials.apiKey || !credentials.apiSecret) {
      throw new Error("Missing API Credentials in request body.");
    }

    const { apiKey, apiSecret, isTestnet } = credentials;
    const baseUrl = isTestnet 
      ? 'https://testnet.binancefuture.com' 
      : 'https://fapi.binance.com';

    // 1. Prepare Query String
    const timestamp = Date.now();
    let queryParams = new URLSearchParams(params);
    queryParams.append('timestamp', timestamp.toString());
    queryParams.append('recvWindow', '5000');

    // 2. Sign
    const queryString = queryParams.toString();
    const signature = await generateSignature(queryString, apiSecret);
    const finalQuery = `${queryString}&signature=${signature}`;

    // 3. Forward Request
    const url = `${baseUrl}${endpoint}?${finalQuery}`;
    
    console.log(`Forwarding to: ${baseUrl}${endpoint}`);

    const response = await fetch(url, {
      method: method,
      headers: {
        'X-MBX-APIKEY': apiKey,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: response.status,
    });

  } catch (error) {
    console.error("Proxy Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
