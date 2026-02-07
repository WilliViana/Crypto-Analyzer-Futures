
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

async function makeBinanceRequest(baseUrl: string, endpoint: string, method: string, params: Record<string, any>, apiKey: string, apiSecret: string) {
  const timestamp = Date.now();
  const queryParams = new URLSearchParams();

  // Add all params
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      queryParams.append(key, String(value));
    }
  }

  queryParams.append('recvWindow', '60000');
  queryParams.append('timestamp', timestamp.toString());

  const queryString = queryParams.toString();
  console.log(`🔐 [PROXY] Query string (antes da assinatura): ${queryString}`);

  console.log(`⏰ [PROXY] Server time: ${timestamp}`);

  const signature = await generateSignature(queryString, apiSecret);
  console.log(`✍️ [PROXY] Signature gerada: ${signature}`);

  const finalQuery = `${queryString}&signature=${signature}`;
  const url = `${baseUrl}${endpoint}?${finalQuery}`;
  console.log(`🚀 [PROXY] URL final: ${url.substring(0, 120)}...`);

  const response = await fetch(url, {
    method: method,
    headers: {
      'X-MBX-APIKEY': apiKey,
      'Content-Type': 'application/json'
    }
  });

  const data = await response.json();
  console.log(`📤 [PROXY] Binance response status: ${response.status}`);
  console.log(`📤 [PROXY] Binance response body: ${JSON.stringify(data).substring(0, 500)}...`);

  return { data, status: response.status };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { endpoint, params = {}, credentials, method = 'GET' } = await req.json();
    console.log(`📥 [PROXY] Request recebido:`, JSON.stringify({ endpoint, method, params, credentials: { ...credentials, apiSecret: '***' } }));

    if (!credentials || !credentials.apiKey || !credentials.apiSecret) {
      throw new Error("Missing API Credentials in request body.");
    }

    const { apiKey, apiSecret, isTestnet } = credentials;
    const baseUrl = isTestnet
      ? 'https://testnet.binancefuture.com'
      : 'https://fapi.binance.com';

    console.log(`🌐 [PROXY] Target: ${baseUrl}${endpoint}`);

    // Primeira tentativa
    let result = await makeBinanceRequest(baseUrl, endpoint, method, params, apiKey, apiSecret);

    // RETRY AUTOMÁTICO: Se erro -4061 (Hedge Mode), adiciona positionSide e tenta novamente
    if (result.data.code === -4061 && endpoint === '/fapi/v1/order') {
      console.log(`🔄 [PROXY] Erro -4061 detectado! Conta em Hedge Mode. Reenviando com positionSide...`);

      // Determina positionSide baseado no side da ordem
      const positionSide = params.side === 'BUY' ? 'LONG' : 'SHORT';
      const retryParams = { ...params, positionSide };

      console.log(`🔄 [PROXY] Novo positionSide: ${positionSide}`);

      result = await makeBinanceRequest(baseUrl, endpoint, method, retryParams, apiKey, apiSecret);

      if (result.data.code === -4061) {
        // Tenta o lado oposto (pode ser fechamento de posição)
        console.log(`🔄 [PROXY] Ainda erro -4061. Tentando lado oposto...`);
        const oppositePositionSide = positionSide === 'LONG' ? 'SHORT' : 'LONG';
        const finalParams = { ...params, positionSide: oppositePositionSide };
        result = await makeBinanceRequest(baseUrl, endpoint, method, finalParams, apiKey, apiSecret);
      }
    }

    return new Response(JSON.stringify(result.data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: result.status,
    });

  } catch (error) {
    console.error("❌ [PROXY] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
