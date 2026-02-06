import { OrderRequest, Exchange, Trade, RealAccountData } from '../types';
import { SUPABASE_URL, supabase } from './supabaseClient';

function fixPrecision(value: number, precision: number): string {
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
  if (!response.ok) throw new Error(`Proxy Error: ${await response.text()}`);
  const data = await response.json();
  if (data.code && data.code !== 200) throw new Error(`Binance Error: ${data.msg}`);
  return data;
}

export const fetchMarketInfo = async (exchange: Exchange) => {
  if (!exchange.apiKey) return { pairs: [], quoteAssets: [] };
  try {
    const data = await callBinanceProxy('/fapi/v1/exchangeInfo', 'GET', {}, exchange);
    const activeSymbols = data.symbols.filter((s: any) => s.status === 'TRADING');
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
  if (!exchange) return { success: false, message: "Nenhuma corretora selecionada." };
  try {
    const cleanProfile = profileName.replace(/[^a-zA-Z0-9]/g, '');
    const clientOrderId = `web_${cleanProfile}_${Date.now()}`;
    let qtyPrecision = 3; let pricePrecision = 2;
    try { const info = await fetchMarketInfo(exchange); const s = (info.pairs as any[]).find(p => p.symbol === order.symbol); if(s){qtyPrecision=s.quantityPrecision; pricePrecision=s.pricePrecision;} } catch(e){}

    let finalQty = order.quantity;
    if (!finalQty || finalQty === 0) {
        const priceData = await callBinanceProxy('/fapi/v1/premiumIndex', 'GET', {symbol: order.symbol}, exchange);
        const price = parseFloat(priceData.markPrice);
        finalQty = (50 * (order.leverage || 10)) / price; // Regra fixa: $50 margem
    }

    const params: any = { symbol: order.symbol, side: order.side, type: 'MARKET', quantity: fixPrecision(finalQty, qtyPrecision), newClientOrderId: clientOrderId };
    try { await callBinanceProxy('/fapi/v1/leverage', 'POST', { symbol: order.symbol, leverage: order.leverage || 10 }, exchange); } catch (e) {}
    
    const res = await callBinanceProxy('/fapi/v1/order', 'POST', params, exchange);
    
    if (res.orderId && (order.stopLossPrice || order.takeProfitPrice)) {
        const closeSide = order.side === 'BUY' ? 'SELL' : 'BUY';
        if (order.stopLossPrice) await callBinanceProxy('/fapi/v1/order', 'POST', { symbol: order.symbol, side: closeSide, type: 'STOP_MARKET', stopPrice: fixPrecision(order.stopLossPrice, pricePrecision), closePosition: 'true', timeInForce: 'GTC' }, exchange);
        if (order.takeProfitPrice) await callBinanceProxy('/fapi/v1/order', 'POST', { symbol: order.symbol, side: closeSide, type: 'TAKE_PROFIT_MARKET', stopPrice: fixPrecision(order.takeProfitPrice, pricePrecision), closePosition: 'true', timeInForce: 'GTC' }, exchange);
    }
    return { success: true, message: "Ordem Executada", orderId: res.orderId };
  } catch (e: any) { return { success: false, message: e.message || "Erro desconhecido" }; }
};