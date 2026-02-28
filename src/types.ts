
export enum StrategyType {
  SAFE = 'SAFE',
  MODERATE = 'MODERATE',
  BOLD = 'BOLD',
  SPECIALIST = 'SPECIALIST',
  ALPHA = 'ALPHA',
  CUSTOM = 'CUSTOM'
}

export type Language = 'pt' | 'en' | 'es';

export interface IndicatorConfig {
  enabled: boolean;
  period?: number;
  thresholdLow?: number; // Oversold
  thresholdHigh?: number; // Overbought
  weight: number; // Confidence points (0-100)
}

export interface AdvancedIndicators {
  rsi: IndicatorConfig;
  macd: IndicatorConfig;
  stochastic: IndicatorConfig;
  bollinger: IndicatorConfig; // Rejection/Squeeze
  ichimoku: IndicatorConfig; // Cloud bullish/bearish
  sar: IndicatorConfig; // Trend flip
  cci: IndicatorConfig;
  volume: IndicatorConfig; // Volume spread/climax
}

export interface StrategyProfile {
  id: string;
  user_id?: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  riskLevel: string;
  confidenceThreshold: number; // Global threshold (e.g. 80%) to trigger trade
  leverage: number;
  capital: number;
  pnl: number;
  trades: number;
  winRate: number;
  active: boolean;
  workflowSteps: string[];
  stopLoss: number;
  takeProfit: number;
  maxDrawdown?: number;
  // New Granular Config
  indicators: AdvancedIndicators;
  useDivergences: boolean;
  useCandlePatterns: boolean;
}

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
  strategyName?: string; // New field for UI display
}

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
  assets: { symbol: string; amount: number; price: number; value: number; unrealizedPnL: number; allocation?: number; initialMargin?: number; strategyName?: string }[];
  isSimulated?: boolean;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS' | 'SYSTEM';
  message: string;
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
  clientOrderId?: string; // New field for tracking strategy on exchange
}

export type LeverageOption = 5 | 10 | 15 | 20 | 25 | 30 | 35 | 40 | 45 | 50 | 55 | 60 | 65 | 70 | 75 | 80 | 85 | 90 | 95 | 100;

export type DrawingType = 'NONE' | 'TRENDLINE' | 'FIBONACCI';

export interface Point {
  x: number;
  y: number;
}

export interface Drawing {
  id: string;
  type: DrawingType;
  start: Point;
  end: Point;
  color: string;
}
