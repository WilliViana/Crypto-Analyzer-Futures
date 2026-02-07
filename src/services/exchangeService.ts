import { OrderRequest, Exchange, Trade, RealAccountData } from '../types';
import { SUPABASE_URL, supabase } from './supabaseClient';

function fixPrecision(value: number, precision: number): string {
  if (!value || isNaN(value)) return "0";
  if (precision === 0) return Math.floor(value).toString();
  const factor = Math.pow(10, precision);
  const rounded = Math.floor(value * factor) / factor;
  return rounded.toFixed(precision);
}

async function callBinanceProxy(endpoint: string, method: string, params: any, exchange: Exchange) {
  if (!exchange.apiKey || !exchange.apiSecret) throw new Error("Credenciais ausentes.");
  const baseUrl = SUPABASE_URL.replace(/\/$/, '');
  const proxyUrl = `${baseUrl}/functions/v1/binance-proxy`;
  const payload = { endpoint, method, params, credentials: { apiKey: exchange.apiKey, apiSecret: exchange.apiSecret, isTestnet: exchange.isTestnet } };
  const response = await fetch(proxyUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

  if (!response.ok) {
    const txt = await response.text();
    console.error("[PROXY FAIL]", txt);
    throw new Error(`Proxy: ${txt}`);
  }

  const data = await response.json();
  if (data.code && data.code !== 200) {
    console.error("[BINANCE FAIL]", data);
    throw new Error(`Binance: ${data.msg}`); // Aqui capturamos o erro -4061
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

export const executeOrder = async (order: OrderRequest, exchange: Exchange | undefined, profileName: string = "Manual"): Promise<{ success: boolean; message: string; orderId?: string }> => {
  if (!exchange) return { success: false, message: "Corretora desconectada." };

  try {
    console.log(`[EXECUTE] ${order.side} ${order.symbol} | Perfil: ${profileName}`);
    const cleanProfile = profileName.replace(/[^a-zA-Z0-9]/g, '');
    const clientOrderId = `web_${cleanProfile}_${Date.now()}`;

    // 1. Obter Precisão
    let qtyPrecision = 3;
    try { const info = await fetchMarketInfo(exchange); const s = (info.pairs as any[]).find(p => p.symbol === order.symbol); if (s) { qtyPrecision = s.quantityPrecision; } } catch (e) { }

    // 2. Calcular Quantidade
    let finalQty = order.quantity;
    if (!finalQty || finalQty <= 0) {
      const ticker = await callBinanceProxy('/fapi/v1/ticker/price', 'GET', { symbol: order.symbol }, exchange);
      const price = parseFloat(ticker.price);
      if (!price) throw new Error("Preço inválido.");
      const marginUSD = 50;
      const leverage = order.leverage || 10;
      finalQty = (marginUSD * leverage) / price;
      console.log(`[CALC] Qtd: ${finalQty}`);
    }

    // 3. Verificar Modo de Posição (Hedge vs One-Way)
    // Em Hedge Mode: BUY = LONG, SELL = SHORT (para abrir)
    // Vamos detectar automaticamente ou usar cache

    let positionSide = 'BOTH'; // Padrão One-Way
    let isHedgeMode = false;

    try {
      const positionMode = await callBinanceProxy('/fapi/v1/positionSide/dual', 'GET', {}, exchange);
      isHedgeMode = positionMode.dualSidePosition === true;
      if (isHedgeMode) {
        positionSide = order.side === 'BUY' ? 'LONG' : 'SHORT';
        console.log(`[HEDGE MODE] positionSide: ${positionSide}`);
      }
    } catch (e: any) {
      console.warn("Falha ao checar dual side, tentando detectar por erro:", e.message);
      // Se não conseguiu checar, vamos tentar com BOTH primeiro e tratar erro depois
    }

    // 4. Ajustar Alavancagem
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

    // 5. Enviar Ordem (com retry para Hedge Mode)
    let res;
    try {
      res = await callBinanceProxy('/fapi/v1/order', 'POST', params, exchange);
    } catch (orderError: any) {
      // Erro -4061: Conta em Hedge Mode mas enviamos sem positionSide
      if (orderError.message?.includes('-4061') || orderError.message?.includes('position side')) {
        console.log('[RETRY] Detectado Hedge Mode. Reenviando com positionSide...');
        params.positionSide = order.side === 'BUY' ? 'LONG' : 'SHORT';
        params.newClientOrderId = `${clientOrderId}_retry`;
        res = await callBinanceProxy('/fapi/v1/order', 'POST', params, exchange);
      } else {
        throw orderError;
      }
    }

    // 6. SL/TP (Se sucesso)
    if (res.orderId && (order.stopLossPrice || order.takeProfitPrice)) {
      // ... Lógica SL/TP
    }

    return { success: true, message: `Ordem Executada! ID: ${res.orderId}`, orderId: res.orderId };

  } catch (e: any) {
    console.error("[EXECUTE ERROR]", e);
    // Retorna a mensagem exata da Binance para o usuário saber (ex: "Position Side mismatch")
    return { success: false, message: e.message || "Erro na execução" };
  }
};