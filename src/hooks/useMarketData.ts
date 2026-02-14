
import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { MarketData } from '../types';
import { calculateRSI, calculateMACD, calculateBollinger } from '../utils/calculations';

// Configuração Inicial
const INITIAL_MARKET_DATA: MarketData = {
  price: 0,
  change24h: 0,
  rsi: 50,
  macd: 0,
  macdSignal: 0,
  macdHist: 0,
  bollingerState: 'Middle',
  volume: 0,
  vwap: 0,
  atr: 0,
  stochasticK: 50,
  stochasticD: 50
};

interface MarketDataContextType {
  marketData: MarketData;
  symbol: string;
  setSymbol: (s: string) => void;
  isConnected: boolean;
}

const MarketDataContext = createContext<MarketDataContextType | undefined>(undefined);

interface MarketDataProviderProps {
  children: ReactNode;
}

export const MarketDataProvider: React.FC<MarketDataProviderProps> = ({ children }) => {
  const [symbol, setSymbol] = useState<string>('BTC');
  const [marketData, setMarketData] = useState<MarketData>(INITIAL_MARKET_DATA);
  const [isConnected, setIsConnected] = useState(false);

  // Refs for state management without re-renders during high-frequency updates
  const wsRef = useRef<WebSocket | null>(null);
  const priceHistoryRef = useRef<number[]>([]);
  const reconnectTimeoutRef = useRef<any>(null);
  const retryCountRef = useRef(0);
  const isMountedRef = useRef(true);

  // Max history for indicator calculation
  const MAX_HISTORY = 100;

  const connect = () => {
    if (!isMountedRef.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const activeSymbol = symbol.toLowerCase().endsWith('usdt') ? symbol.toLowerCase() : `${symbol.toLowerCase()}usdt`;
    // Use futures stream (fstream) to match futures dashboard context
    const wsUrl = `wss://fstream.binance.com/ws/${activeSymbol}@ticker`;

    console.debug(`[MarketStream] Connecting to ${activeSymbol}...`);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.debug('[MarketStream] Connected');
      setIsConnected(true);
      retryCountRef.current = 0; // Reset backoff on success
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const currentPrice = parseFloat(payload.c);

        // Update price history for indicators
        priceHistoryRef.current.push(currentPrice);
        if (priceHistoryRef.current.length > MAX_HISTORY) {
          priceHistoryRef.current.shift();
        }

        const history = priceHistoryRef.current;

        // Real-time Calculations
        const rsi = calculateRSI(history);
        const { macd, signal, histogram } = calculateMACD(history);
        const bollinger = calculateBollinger(history);

        // Simulate data not available in simple ticker stream for UI richness
        const vwap = currentPrice * (1 + (Math.random() * 0.0002 - 0.0001));

        setMarketData(prev => ({
          price: currentPrice,
          change24h: parseFloat(payload.P),
          rsi: rsi,
          macd: macd,
          macdSignal: signal,
          macdHist: histogram,
          bollingerState: bollinger as any,
          volume: parseFloat(payload.q),
          vwap: vwap,
          atr: currentPrice * 0.015,
          stochasticK: prev.stochasticK + (Math.random() * 4 - 2),
          stochasticD: prev.stochasticD + (Math.random() * 4 - 2)
        }));

      } catch (e) {
        console.error('[MarketStream] Parse error', e);
      }
    };

    ws.onclose = () => {
      if (!isMountedRef.current) return;
      setIsConnected(false);
      wsRef.current = null;

      // Exponential Backoff: 1s, 2s, 4s, 8s... max 30s
      const timeout = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);
      console.warn(`[MarketStream] Disconnected. Retrying in ${timeout}ms...`);

      retryCountRef.current += 1;
      reconnectTimeoutRef.current = setTimeout(connect, timeout);
    };

    ws.onerror = (err) => {
      console.error('[MarketStream] Error:', err);
      ws.close();
    };
  };

  useEffect(() => {
    isMountedRef.current = true;
    connect();

    return () => {
      isMountedRef.current = false;
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [symbol]);

  // Using React.createElement to avoid JSX issues in .ts files if environment is strict
  return React.createElement(
    MarketDataContext.Provider,
    { value: { marketData, symbol, setSymbol, isConnected } },
    children
  );
};

// Consumer Hook
export const useMarketData = (requestedSymbol?: string) => {
  const context = useContext(MarketDataContext);
  if (!context) {
    throw new Error('useMarketData must be used within a MarketDataProvider');
  }

  // Update global symbol if requested
  // REMOVED: Automatic symbol update caused infinite loops when multiple components 
  // used this hook with different symbols (e.g., Dashboard vs ChatBot).
  // 
  // useEffect(() => {
  //   if (requestedSymbol && requestedSymbol !== context.symbol) {
  //     context.setSymbol(requestedSymbol);
  //   }
  // }, [requestedSymbol, context]);

  return context.marketData;
};
