// --- ENUMS & TYPES BÁSICOS ---
export enum StrategyType {
  SAFE = 'SAFE',
  MODERATE = 'MODERATE',
  BOLD = 'BOLD',
  SPECIALIST = 'SPECIALIST',
  ALPHA = 'ALPHA',
  CUSTOM = 'CUSTOM'
}

export type Language = 'pt' | 'en' | 'es';

// --- INDICADORES ---
export interface IndicatorConfig {
  enabled: boolean;
  period?: number;
  thresholdLow?: number; // Nível de sobrevenda (Oversold)
  thresholdHigh?: number; // Nível de sobrecompra (Overbought)
  weight: number; // Peso na decisão (0-100)
}

export interface AdvancedIndicators {
  rsi: IndicatorConfig;
  macd: IndicatorConfig;
  stochastic: IndicatorConfig;
  bollinger: IndicatorConfig;
  ichimoku: IndicatorConfig;
  sar: IndicatorConfig;
  cci: IndicatorConfig;
  volume: IndicatorConfig;
}

// --- PERFIL DE ESTRATÉGIA ---
export interface StrategyProfile {
  id: string;
  user_id?: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  riskLevel: string;
  confidenceThreshold: number; // % Mínima para entrar no trade
  leverage: number; // Alavancagem (ex: 10, 20)
  capital: number;
  pnl: number;
  trades: number;
  winRate: number;
  active: boolean; // Se o perfil está rodando no scanner
  workflowSteps: string[];
  stopLoss: number; // %
  takeProfit: number; // %
  maxDrawdown?: number;
  indicators: AdvancedIndicators; 
  useDivergences: boolean;
  useCandlePatterns: boolean;
}

// --- DADOS DE MERCADO ---
export interface MarketData {
  price: number;
  change24h: number;
  rsi: number;
  macd: number;
  macdSignal: number;
  macdHist: number;
  bollingerState: 'Upper' | 'Lower' | 'Middle';
  volume: number;
  vwap: number;
  atr: number;
  stochasticK: number;
  stochasticD: number;
}

export interface CoinData {
  symbol: string;
  name: string;
  change: number;
  price: number;
  size: number;
  change7d?: number;
  marketCap?: string;
  volume24h?: string;
  rsi?: number;
  aiScore?: number;
  signal?: string;
  trend?: string;
  sector?: string;
}

// --- DADOS DE CONTA E TRADES ---
export interface Exchange {
  id: string;
  user_id?: string;
  name: string;
  type: 'CEX' | 'DEX';
  status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
  apiKey?: string;
  apiSecret?: string;
  balance?: string;
  isTestnet?: boolean;
}

export interface RealAccountData {
  totalBalance: number;
  unrealizedPnL: number;
  assets: { 
      symbol: string; 
      amount: number; 
      price: number; 
      value: number; // Valor nocional (Tamanho * Preço)
      initialMargin?: number; // Valor investido (Margem isolada ou cruzada alocada)
      unrealizedPnL: number; 
      allocation?: number 
  }[];
  isSimulated?: boolean;
}

export interface Trade {
  id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice?: number;
  amount: number;
  pnl: number;
  status: 'OPEN' | 'CLOSED';
  timestamp: string;
  strategyId: string;
  strategyName?: string; // IMPORTANTE: Usado para exibir quem abriu a ordem
  clientOrderId?: string; // IMPORTANTE: ID de rastreio da Binance
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS' | 'SYSTEM';
  message: string;
}

// --- ORDENS ---
export type OrderSide = 'BUY' | 'SELL';
export type OrderType = 'MARKET' | 'LIMIT';

export interface OrderRequest {
    symbol: string;
    side: OrderSide;
    type: OrderType;
    quantity: number;
    price?: number;
    leverage: number;
    stopLossPrice?: number;
    takeProfitPrice?: number;
    clientOrderId?: string;
}
