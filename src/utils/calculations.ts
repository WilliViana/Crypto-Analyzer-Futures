
export const calculateSMA = (data: number[], period: number): number => {
  if (data.length < period) return 0;
  const slice = data.slice(-period);
  const sum = slice.reduce((acc, val) => acc + val, 0);
  return sum / period;
};

export const calculateEMA = (data: number[], period: number, prevEMA?: number): number => {
  if (data.length < period) return data[data.length - 1];
  const k = 2 / (period + 1);
  const currentPrice = data[data.length - 1];
  
  if (prevEMA === undefined) {
    return calculateSMA(data, period);
  }
  
  return (currentPrice - prevEMA) * k + prevEMA;
};

export const calculateRSI = (prices: number[], period = 14): number => {
  if (prices.length < period + 1) return 50;
  let gains = 0, losses = 0;
  
  // Calculate initial average gain/loss
  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  
  let avgGain = gains / period;
  let avgLoss = losses / period;

  // Smoothing
  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) {
      avgGain = (avgGain * (period - 1) + diff) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) - diff) / period;
    }
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
};

export const calculateMACD = (prices: number[]): { macd: number; signal: number; histogram: number } => {
  if (prices.length < 26) return { macd: 0, signal: 0, histogram: 0 };

  // Calculate EMAs for the entire series efficiently would require carrying state.
  // For this HFT simulation, we will recalculate on the slice for stability.
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  
  const macdLine = ema12 - ema26;
  
  // Note: True MACD Signal line requires a history of MACD lines to calculate its own EMA(9).
  // Here we approximate with a smoothing factor for real-time performance without heavy state.
  const signalLine = macdLine * 0.9; 
  
  return {
    macd: macdLine,
    signal: signalLine,
    histogram: macdLine - signalLine
  };
};

export const calculateBollinger = (prices: number[], period = 20, multiplier = 2) => {
  if (prices.length < period) return 'Middle';
  
  const sma = calculateSMA(prices, period);
  const slice = prices.slice(-period);
  const squaredDiffs = slice.map(price => Math.pow(price - sma, 2));
  const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / period;
  const stdDev = Math.sqrt(variance);
  
  const upper = sma + (multiplier * stdDev);
  const lower = sma - (multiplier * stdDev);
  const current = prices[prices.length - 1];

  if (current >= upper) return 'Upper';
  if (current <= lower) return 'Lower';
  return 'Middle';
};
