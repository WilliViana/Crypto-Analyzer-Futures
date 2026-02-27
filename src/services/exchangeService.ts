import { OrderRequest, Exchange, Trade, RealAccountData } from '../types';
import { SUPABASE_URL, supabase } from './supabaseClient';
import { addAuditLog, AUDIT_ACTIONS } from './auditService';

function fixPrecision(value: number, precision: number): string {
  if (!value || isNaN(value)) return "0";
  if (precision === 0) return Math.floor(value).toString();
  const factor = Math.pow(10, precision);
  const rounded = Math.floor(value * factor) / factor;
  return rounded.toFixed(precision);
}

async function callBinanceProxy(endpoint: string, method: string, params: any, exchange: Exchange) {
  if (!exchange.apiKey || !exchange.apiSecret) throw new Error("Credenciais ausentes.");
  const edgeFunctionUrl = `https://bhigvgfkttvjibvlyqpl.supabase.co/functions/v1/binance-proxy`;
  const payload = { endpoint, method, params, credentials: { apiKey: exchange.apiKey, apiSecret: exchange.apiSecret, isTestnet: exchange.isTestnet } };

  const { data: { session } } = await supabase.auth.getSession();
  const targetHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
  if (session?.access_token) {
    targetHeaders['Authorization'] = `Bearer ${session.access_token}`;
  }

  // In production: use Vercel proxy to bypass ISP/WAF block
  const isDev = (import.meta as any).env?.DEV === true;
  const proxyUrl = isDev ? edgeFunctionUrl : `${window.location.origin}/api/supabase`;

  const response = isDev
    ? await fetch(edgeFunctionUrl, { method: 'POST', headers: targetHeaders, body: JSON.stringify(payload) })
    : await fetch(proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetUrl: edgeFunctionUrl,
        targetMethod: 'POST',
        targetHeaders,
        targetBody: JSON.stringify(payload),
      }),
    });

  if (!response.ok) {
    const txt = await response.text();
    console.error("[PROXY FAIL]", response.status, txt);
    throw new Error(`Proxy (${response.status}): ${txt}`);
  }

  const data = await response.json();
  if (data.code && data.code !== 200) {
    throw new Error(`Binance: ${data.msg}`);
  }
  return data;
}

export const fetchMarketInfo = async (exchange: Exchange) => {
  if (!exchange.apiKey) return { pairs: [], quoteAssets: [] };
  try {
    const data = await callBinanceProxy('/fapi/v1/exchangeInfo', 'GET', {}, exchange);
    const activeSymbols = (data.symbols || []).filter((s: any) => s.status === 'TRADING');
    const quoteAssets = Array.from(new Set(activeSymbols.map((s: any) => s.quoteAsset))) as string[];
    const pairs = activeSymbols.map((s: any) => ({ symbol: s.symbol, baseAsset: s.baseAsset, quoteAsset: s.quoteAsset, pricePrecision: s.pricePrecision, quantityPrecision: s.quantityPrecision }));
    return { pairs, quoteAssets };
  } catch (error) { return { pairs: [], quoteAssets: [] }; }
};

export const fetchRealAccountData = async (exchange: Exchange): Promise<RealAccountData> => {
  if (!exchange.apiKey) return { totalBalance: 0, unrealizedPnL: 0, assets: [], isSimulated: false };
  try {
    const data = await callBinanceProxy('/fapi/v2/account', 'GET', {}, exchange);
    const assets = (data.positions || []).filter((p: any) => parseFloat(p.positionAmt) !== 0).map((p: any) => ({
      symbol: p.symbol, amount: parseFloat(p.positionAmt), price: parseFloat(p.entryPrice), value: parseFloat(p.notional), unrealizedPnL: parseFloat(p.unrealizedProfit), initialMargin: parseFloat(p.initialMargin)
    }));
    return { totalBalance: parseFloat(data.totalMarginBalance), unrealizedPnL: parseFloat(data.totalUnrealizedProfit), assets, isSimulated: exchange.isTestnet };
  } catch (error) { return { totalBalance: 0, unrealizedPnL: 0, assets: [], isSimulated: false }; }
};

/**
 * Validates API credentials by making a test call to Binance.
 * Returns { valid, balance?, error? }
 */
export const validateApiCredentials = async (exchange: Exchange): Promise<{ valid: boolean; balance?: number; error?: string }> => {
  try {
    const data = await callBinanceProxy('/fapi/v2/balance', 'GET', {}, exchange);
    if (Array.isArray(data)) {
      const usdt = data.find((a: any) => a.asset === 'USDT');
      return { valid: true, balance: usdt ? parseFloat(usdt.balance) : 0 };
    }
    return { valid: true, balance: 0 };
  } catch (error: any) {
    const msg = error.message || 'Erro desconhecido';
    if (msg.includes('-2015') || msg.includes('Invalid API-key')) {
      return { valid: false, error: 'API Key inválida. Verifique a chave.' };
    }
    if (msg.includes('-1022') || msg.includes('Signature')) {
      return { valid: false, error: 'Secret inválido. Verifique a chave privada.' };
    }
    if (msg.includes('Proxy não encontrada') || msg.includes('404')) {
      return { valid: false, error: 'Proxy de API não configurada. Deploy a Edge Function.' };
    }
    return { valid: false, error: msg };
  }
};

export const executeOrder = async (order: OrderRequest, exchange: Exchange | undefined, profileName: string = "Manual"): Promise<{ success: boolean; message: string; orderId?: string }> => {
  if (!exchange) return { success: false, message: "Corretora desconectada." };

  try {
    console.log(`[EXECUTE] ${order.side} ${order.symbol} | Perfil: ${profileName}`);
    const cleanProfile = profileName.replace(/[^a-zA-Z0-9]/g, '');
    const clientOrderId = `web_${cleanProfile}_${Date.now()}`;

    let qtyPrecision = 3;
    try { const info = await fetchMarketInfo(exchange); const s = (info.pairs as any[]).find(p => p.symbol === order.symbol); if (s) { qtyPrecision = s.quantityPrecision; } } catch (e) { }

    let finalQty = order.quantity;
    if (!finalQty || finalQty <= 0) {
      const ticker = await callBinanceProxy('/fapi/v1/ticker/price', 'GET', { symbol: order.symbol }, exchange);
      const price = parseFloat(ticker.price);
      if (!price) throw new Error("Preço inválido.");
      const marginUSD = 50;
      const leverage = order.leverage || 10;
      finalQty = (marginUSD * leverage) / price;
    }

    let positionSide = 'BOTH';
    let isHedgeMode = false;

    try {
      const positionMode = await callBinanceProxy('/fapi/v1/positionSide/dual', 'GET', {}, exchange);
      isHedgeMode = positionMode.dualSidePosition === true;
      if (isHedgeMode) {
        positionSide = order.side === 'BUY' ? 'LONG' : 'SHORT';
      }
    } catch (e: any) { }

    try { await callBinanceProxy('/fapi/v1/leverage', 'POST', { symbol: order.symbol, leverage: order.leverage || 10 }, exchange); } catch (e) { }

    const params: any = {
      symbol: order.symbol,
      side: order.side,
      type: 'MARKET',
      quantity: fixPrecision(finalQty, qtyPrecision),
      newClientOrderId: clientOrderId,
    };

    if (positionSide !== 'BOTH') {
      params.positionSide = positionSide;
    }

    let res;
    try {
      res = await callBinanceProxy('/fapi/v1/order', 'POST', params, exchange);
    } catch (orderError: any) {
      if (orderError.message?.includes('-4061') || orderError.message?.includes('position side')) {
        params.positionSide = order.side === 'BUY' ? 'LONG' : 'SHORT';
        params.newClientOrderId = `${clientOrderId}_retry`;
        res = await callBinanceProxy('/fapi/v1/order', 'POST', params, exchange);
      } else {
        throw orderError;
      }
    }

    if (res.orderId && (order.stopLossPrice || order.takeProfitPrice)) {
      const tpSlOrders: any[] = [];
      const closeSide = order.side === 'BUY' ? 'SELL' : 'BUY';

      // Get price precision for the symbol (fallback to 2)
      let pricePrecision = 2;
      try {
        const info = await fetchMarketInfo(exchange);
        const symbolInfo = (info.pairs as any[]).find(p => p.symbol === order.symbol);
        if (symbolInfo) pricePrecision = symbolInfo.pricePrecision;
      } catch (e) { /* use default */ }

      // Common params for TP/SL (no timeInForce — not valid for STOP_MARKET/TAKE_PROFIT_MARKET)
      const commonParams: any = {
        symbol: order.symbol,
        side: closeSide,
        quantity: fixPrecision(finalQty, qtyPrecision),
        workingType: 'MARK_PRICE'
      };

      // Hedge Mode: use positionSide, NO reduceOnly
      // One-way Mode: use reduceOnly, NO positionSide
      if (positionSide !== 'BOTH') {
        commonParams.positionSide = positionSide;
      } else {
        commonParams.reduceOnly = 'true';
      }

      if (order.stopLossPrice) {
        tpSlOrders.push({
          ...commonParams,
          type: 'STOP_MARKET',
          stopPrice: fixPrecision(order.stopLossPrice, pricePrecision),
        });
      }

      if (order.takeProfitPrice) {
        tpSlOrders.push({
          ...commonParams,
          type: 'TAKE_PROFIT_MARKET',
          stopPrice: fixPrecision(order.takeProfitPrice, pricePrecision),
        });
      }

      // Execute TP/SL orders sequentially
      for (const o of tpSlOrders) {
        try {
          await callBinanceProxy('/fapi/v1/order', 'POST', o, exchange);
          console.log(`[TP/SL] ✅ Placed ${o.type} at ${o.stopPrice}`);
        } catch (err: any) {
          console.error(`[TP/SL ERROR] Failed to place ${o.type}:`, err);
          await addAuditLog(AUDIT_ACTIONS.ORDER_FAILED, 'WARN', {
            symbol: order.symbol,
            action: `PLACE_${o.type}`,
            error: err.message
          });
        }
      }
    }

    // Audit log for successful order
    await addAuditLog(AUDIT_ACTIONS.ORDER_PLACED, 'SUCCESS', {
      symbol: order.symbol,
      side: order.side,
      quantity: finalQty,
      leverage: order.leverage,
      orderId: res.orderId,
      profileName
    });

    return { success: true, message: `Ordem Executada! ID: ${res.orderId}`, orderId: res.orderId };

  } catch (e: any) {
    console.error("[EXECUTE ERROR]", e);

    // Audit log for failed order
    await addAuditLog(AUDIT_ACTIONS.ORDER_FAILED, 'ERROR', {
      symbol: order.symbol,
      side: order.side,
      error: e.message,
      profileName
    });

    return { success: false, message: e.message || "Erro na execução" };
  }
};

export const closePosition = async (
  symbol: string,
  quantity: number,
  side: 'BUY' | 'SELL',
  exchange: Exchange
): Promise<{ success: boolean; message: string }> => {
  try {
    console.log(`[CLOSE POSITION] ${symbol} | Side: ${side} | Qty: ${quantity}`);

    let qtyPrecision = 3;
    try {
      const info = await fetchMarketInfo(exchange);
      const s = (info.pairs as any[]).find(p => p.symbol === symbol);
      if (s) qtyPrecision = s.quantityPrecision;
    } catch (e) { }

    let positionSide: 'BOTH' | 'LONG' | 'SHORT' = 'BOTH';
    try {
      const positionMode = await callBinanceProxy('/fapi/v1/positionSide/dual', 'GET', {}, exchange);
      if (positionMode.dualSidePosition === true) {
        positionSide = side === 'SELL' ? 'LONG' : 'SHORT';
      }
    } catch (e) { }

    const params: any = {
      symbol,
      side,
      type: 'MARKET',
      quantity: fixPrecision(quantity, qtyPrecision),
    };

    // In Hedge mode use positionSide, in One-way mode use reduceOnly
    // Cannot use both at the same time
    if (positionSide !== 'BOTH') {
      params.positionSide = positionSide;
    } else {
      params.reduceOnly = 'true';
    }

    let res;
    try {
      res = await callBinanceProxy('/fapi/v1/order', 'POST', params, exchange);
    } catch (orderError: any) {
      if (orderError.message?.includes('-4061') || orderError.message?.includes('position side')) {
        params.positionSide = side === 'SELL' ? 'LONG' : 'SHORT';
        res = await callBinanceProxy('/fapi/v1/order', 'POST', params, exchange);
      } else {
        throw orderError;
      }
    }

    // Audit log for closed position
    await addAuditLog(AUDIT_ACTIONS.ORDER_CLOSED, 'SUCCESS', {
      symbol,
      side,
      quantity,
      orderId: res.orderId
    });

    return { success: true, message: `Posição fechada! ID: ${res.orderId}` };
  } catch (e: any) {
    console.error("[CLOSE POSITION ERROR]", e);

    await addAuditLog(AUDIT_ACTIONS.ORDER_FAILED, 'ERROR', {
      symbol,
      side,
      action: 'CLOSE_POSITION',
      error: e.message
    });

    return { success: false, message: e.message || "Erro ao fechar posição" };
  }
};