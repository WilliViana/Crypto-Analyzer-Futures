import { Exchange, CoinData } from '../types';

// Cache simples para evitar spam na API
const candleCache: Record<string, { data: any[], timestamp: number }> = {};

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export const fetchAssetPrice = async (symbol: string): Promise<number> => {
  try {
    const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
    const data = await res.json();
    return parseFloat(data.price);
  } catch (error) {
    console.warn(`Erro ao buscar preço de ${symbol}`, error);
    return 0;
  }
};

export const fetchHistoricalCandles = async (symbol: string, interval: string = '15m', limit: number = 100): Promise<CandleData[]> => {
  const cacheKey = `${symbol}-${interval}`;
  const now = Date.now();

  // Se tiver cache com menos de 10 segundos, usa o cache
  if (candleCache[cacheKey] && (now - candleCache[cacheKey].timestamp < 10000)) {
      return candleCache[cacheKey].data;
  }

  try {
    // Usa API Pública da Binance (não precisa de chave para dados históricos básicos)
    const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
    
    if (!response.ok) throw new Error('Falha na API Binance');
    
    const rawData = await response.json();
    
    // Formata para objeto legível
    const candles: CandleData[] = rawData.map((c: any) => ({
      time: c[0],
      open: parseFloat(c[1]),
      high: parseFloat(c[2]),
      low: parseFloat(c[3]),
      close: parseFloat(c[4]),
      volume: parseFloat(c[5])
    }));

    // Salva no cache
    candleCache[cacheKey] = { data: candles, timestamp: now };
    
    return candles;
  } catch (error) {
    console.error(`Erro ao buscar candles para ${symbol}:`, error);
    return [];
  }
};

export const fetchTopMovers = async (): Promise<CoinData[]> => {
    try {
        const response = await fetch('https://api.binance.com/api/v3/ticker/24hr');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        
        // Filter for USDT pairs and sort by absolute percent change to find movers
        const movers = data
            .filter((ticker: any) => ticker.symbol.endsWith('USDT'))
            .map((ticker: any) => ({
                symbol: ticker.symbol.replace('USDT', ''),
                name: ticker.symbol,
                price: parseFloat(ticker.lastPrice),
                change: parseFloat(ticker.priceChangePercent),
                size: Math.abs(parseFloat(ticker.priceChangePercent))
            }))
            .sort((a: any, b: any) => b.size - a.size)
            .slice(0, 50);

        return movers;
    } catch (error) {
        console.error('Error fetching top movers:', error);
        return [];
    }
};

export const fetchOrderBook = async (symbol: string) => {
    try {
        const pair = symbol.toUpperCase().endsWith('USDT') ? symbol.toUpperCase() : `${symbol.toUpperCase()}USDT`;
        const response = await fetch(`https://api.binance.com/api/v3/depth?symbol=${pair}&limit=20`);
        if (!response.ok) throw new Error('Failed to fetch order book');
        const data = await response.json();
        
        return {
            bids: data.bids.map((bid: string[]) => ({ price: parseFloat(bid[0]), qty: parseFloat(bid[1]) })),
            asks: data.asks.map((ask: string[]) => ({ price: parseFloat(ask[0]), qty: parseFloat(ask[1]) }))
        };
    } catch (error) {
        console.error('Error fetching order book:', error);
        return { bids: [], asks: [] };
    }
};

export const fetchAssetHealth = async (symbol: string) => {
    // Placeholder for health data since we don't have on-chain API key
    return [];
};

export const initializeMarketSymbols = async () => {};
export const getRandomTokenFromSector = () => 'BTC';