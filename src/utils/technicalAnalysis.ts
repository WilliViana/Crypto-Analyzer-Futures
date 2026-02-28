
import { StrategyProfile } from '../types';

interface AnalysisResult {
  signal: 'BUY' | 'SELL' | 'NEUTRAL';
  confidence: number;
  details: string[];
}

function calculateRSI(closes: number[], period: number = 14): number {
  if (closes.length < period + 1) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calculateEMA(data: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const emaArray = [data[0]];
  for (let i = 1; i < data.length; i++) {
    emaArray.push(data[i] * k + emaArray[i - 1] * (1 - k));
  }
  return emaArray;
}

function calculateStdDev(data: number[], period: number): number {
  const slice = data.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
  const variance = slice.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / slice.length;
  return Math.sqrt(variance);
}

export const unifiedTechnicalAnalysis = (candles: any[], profile: StrategyProfile): AnalysisResult => {
  if (!candles || candles.length < 50) {
    return { signal: 'NEUTRAL', confidence: 0, details: ['Dados insuficientes'] };
  }

  const closes = candles.map((c: any) => c.close);
  const highs = candles.map((c: any) => c.high);
  const lows = candles.map((c: any) => c.low);
  const volumes = candles.map((c: any) => c.volume || 0);
  const currentPrice = closes[closes.length - 1];

  const rsi = calculateRSI(closes, profile.indicators.rsi.period || 14);
  const ema9 = calculateEMA(closes, 9);
  const ema12 = calculateEMA(closes, 12);
  const ema21 = calculateEMA(closes, 21);
  const ema26 = calculateEMA(closes, 26);
  const macdLine = ema12[ema12.length - 1] - ema26[ema26.length - 1];
  const prevMacd = ema12[ema12.length - 2] - ema26[ema26.length - 2];

  let scoreBuy = 0;
  let scoreSell = 0;
  const details: string[] = [];

  // ─── RSI (gradual scoring, not binary) ───
  if (profile.indicators.rsi.enabled) {
    const low = profile.indicators.rsi.thresholdLow || 30;
    const high = profile.indicators.rsi.thresholdHigh || 70;
    const weight = profile.indicators.rsi.weight;

    if (rsi < low) {
      // Strong oversold
      scoreBuy += weight;
      details.push(`RSI ${rsi.toFixed(1)} 🔥 Sobrevenda forte`);
    } else if (rsi < 45) {
      // Mild oversold — gradual score
      const factor = (45 - rsi) / (45 - low);
      scoreBuy += weight * factor * 0.7;
      details.push(`RSI ${rsi.toFixed(1)} ↓ Tendência baixista`);
    } else if (rsi > high) {
      // Strong overbought
      scoreSell += weight;
      details.push(`RSI ${rsi.toFixed(1)} 🔥 Sobrecompra forte`);
    } else if (rsi > 55) {
      // Mild overbought — gradual score
      const factor = (rsi - 55) / (high - 55);
      scoreSell += weight * factor * 0.7;
      details.push(`RSI ${rsi.toFixed(1)} ↑ Tendência alt.`);
    }
  }

  // ─── MACD (with crossover detection) ───
  if (profile.indicators.macd.enabled) {
    const weight = profile.indicators.macd.weight;
    if (macdLine > 0 && prevMacd <= 0) {
      // Bullish crossover
      scoreBuy += weight;
      details.push('MACD ↗ Cruzamento alta');
    } else if (macdLine < 0 && prevMacd >= 0) {
      // Bearish crossover
      scoreSell += weight;
      details.push('MACD ↘ Cruzamento baixa');
    } else if (macdLine > 0) {
      // Positive momentum
      scoreBuy += weight * 0.5;
      details.push('MACD + Momentum alta');
    } else {
      // Negative momentum
      scoreSell += weight * 0.5;
      details.push('MACD - Momentum baixa');
    }
  }

  // ─── Bollinger Bands (real stddev) ───
  if (profile.indicators.bollinger.enabled) {
    const weight = profile.indicators.bollinger.weight;
    const period = 20;
    const sma20 = closes.slice(-period).reduce((a, b) => a + b, 0) / period;
    const stdDev = calculateStdDev(closes, period);
    const upperBand = sma20 + 2 * stdDev;
    const lowerBand = sma20 - 2 * stdDev;
    const bandWidth = upperBand - lowerBand;
    const position = bandWidth > 0 ? (currentPrice - lowerBand) / bandWidth : 0.5;

    if (currentPrice <= lowerBand) {
      scoreBuy += weight;
      details.push(`BB abaixo da banda inferior`);
    } else if (position < 0.3) {
      scoreBuy += weight * 0.6;
      details.push(`BB próximo da banda inferior (${(position * 100).toFixed(0)}%)`);
    } else if (currentPrice >= upperBand) {
      scoreSell += weight;
      details.push(`BB acima da banda superior`);
    } else if (position > 0.7) {
      scoreSell += weight * 0.6;
      details.push(`BB próximo da banda superior (${(position * 100).toFixed(0)}%)`);
    }
  }

  // ─── EMA Trend (always active as bonus) ───
  const ema9Current = ema9[ema9.length - 1];
  const ema21Current = ema21[ema21.length - 1];
  const ema9Prev = ema9[ema9.length - 2];
  const ema21Prev = ema21[ema21.length - 2];
  const trendWeight = 0.15; // bonus weight

  if (ema9Current > ema21Current && ema9Prev <= ema21Prev) {
    scoreBuy += trendWeight;
    details.push('EMA9 cruzou EMA21 ↑');
  } else if (ema9Current < ema21Current && ema9Prev >= ema21Prev) {
    scoreSell += trendWeight;
    details.push('EMA9 cruzou EMA21 ↓');
  } else if (ema9Current > ema21Current) {
    scoreBuy += trendWeight * 0.3;
  } else {
    scoreSell += trendWeight * 0.3;
  }

  // ─── Momentum (price change last 5 candles) ───
  const priceChange5 = ((currentPrice - closes[closes.length - 6]) / closes[closes.length - 6]) * 100;
  if (Math.abs(priceChange5) > 0.3) {
    const momentumWeight = 0.1;
    if (priceChange5 > 0) {
      scoreBuy += momentumWeight;
      details.push(`Mom +${priceChange5.toFixed(2)}%`);
    } else {
      scoreSell += momentumWeight;
      details.push(`Mom ${priceChange5.toFixed(2)}%`);
    }
  }

  // ─── Calculate final confidence ───
  const totalActiveWeight = Object.values(profile.indicators).reduce(
    (acc, ind) => acc + (ind.enabled ? ind.weight : 0), 0
  ) + 0.25; // +0.25 for EMA trend and momentum bonuses

  const confidenceBuy = Math.min((scoreBuy / totalActiveWeight) * 100, 100);
  const confidenceSell = Math.min((scoreSell / totalActiveWeight) * 100, 100);

  // Log for debugging (always)
  console.log(`[ANALYSIS] RSI=${rsi.toFixed(1)} MACD=${macdLine > 0 ? '+' : ''}${macdLine.toFixed(4)} BuyConf=${confidenceBuy.toFixed(1)}% SellConf=${confidenceSell.toFixed(1)}% Threshold=${profile.confidenceThreshold}%`);

  if (confidenceBuy > confidenceSell && confidenceBuy >= profile.confidenceThreshold) {
    return { signal: 'BUY', confidence: confidenceBuy, details };
  }
  if (confidenceSell > confidenceBuy && confidenceSell >= profile.confidenceThreshold) {
    return { signal: 'SELL', confidence: confidenceSell, details };
  }

  // Return with actual confidence even if NEUTRAL (for monitoring)
  const maxConf = Math.max(confidenceBuy, confidenceSell);
  const neutralSignal = confidenceBuy > confidenceSell ? 'BUY' : 'SELL';
  return { signal: 'NEUTRAL', confidence: maxConf, details: details.length > 0 ? details : [`Confiança ${maxConf.toFixed(0)}% < threshold ${profile.confidenceThreshold}%`] };
};
