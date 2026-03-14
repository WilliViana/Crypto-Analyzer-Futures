/**
 * VPM Calculator — TP/SL Dinâmico baseado em ATR (Average True Range)
 * Calcula targets de take-profit e stop-loss adaptativos por volatilidade
 */

import { CandleData } from '../services/marketService';

// ─── Types ───

export interface VPMResult {
  takeProfit: number;
  stopLoss: number;
  riskRewardRatio: number;
  atr: number;
  atrPercent: number;
  quality: 'GOOD' | 'FAIR' | 'POOR';
  reasoning: string;
}

export type ProfileRisk = 'conservative' | 'moderate' | 'aggressive' | 'scalper';

// ─── ATR Calculation ───

/**
 * Calcula Average True Range (ATR)
 * True Range = max(H-L, |H-Cprev|, |L-Cprev|)
 */
export function calculateATR(candles: CandleData[], period: number = 14): number {
  if (candles.length < period + 1) return 0;

  const trueRanges: number[] = [];

  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i - 1].close;

    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    trueRanges.push(tr);
  }

  // Usa média simples para o ATR inicial, depois EMA
  if (trueRanges.length < period) {
    return trueRanges.reduce((a, b) => a + b, 0) / trueRanges.length;
  }

  // ATR como EMA dos True Ranges
  let atr = trueRanges.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < trueRanges.length; i++) {
    atr = ((atr * (period - 1)) + trueRanges[i]) / period;
  }

  return atr;
}

// ─── Multiplicadores por perfil ───

const PROFILE_MULTIPLIERS: Record<ProfileRisk, { tpMultiplier: number; slMultiplier: number; minRR: number }> = {
  conservative: { tpMultiplier: 1.5, slMultiplier: 1.0, minRR: 2.0 },
  moderate:     { tpMultiplier: 2.0, slMultiplier: 1.2, minRR: 1.5 },
  aggressive:   { tpMultiplier: 3.0, slMultiplier: 1.5, minRR: 1.2 },
  scalper:      { tpMultiplier: 1.0, slMultiplier: 0.8, minRR: 1.0 },
};

// ─── VPM Calculation ───

/**
 * Calcula TP/SL dinâmico baseado em ATR
 */
export function calculateVPM(
  candles: CandleData[],
  currentPrice: number,
  signal: 'BUY' | 'SELL',
  profileRisk: ProfileRisk = 'moderate'
): VPMResult {
  const atr = calculateATR(candles);

  if (atr === 0) {
    return {
      takeProfit: signal === 'BUY' ? currentPrice * 1.02 : currentPrice * 0.98,
      stopLoss: signal === 'BUY' ? currentPrice * 0.99 : currentPrice * 1.01,
      riskRewardRatio: 2.0,
      atr: 0,
      atrPercent: 0,
      quality: 'POOR',
      reasoning: 'ATR = 0, usando valores fixos de fallback'
    };
  }

  const atrPercent = (atr / currentPrice) * 100;
  const multipliers = PROFILE_MULTIPLIERS[profileRisk];

  let takeProfit: number;
  let stopLoss: number;

  if (signal === 'BUY') {
    takeProfit = currentPrice + (atr * multipliers.tpMultiplier);
    stopLoss = currentPrice - (atr * multipliers.slMultiplier);
  } else {
    takeProfit = currentPrice - (atr * multipliers.tpMultiplier);
    stopLoss = currentPrice + (atr * multipliers.slMultiplier);
  }

  const tpDistance = Math.abs(takeProfit - currentPrice);
  const slDistance = Math.abs(stopLoss - currentPrice);
  const riskRewardRatio = slDistance > 0 ? tpDistance / slDistance : 0;

  // Quality assessment
  let quality: VPMResult['quality'] = 'POOR';
  if (riskRewardRatio >= multipliers.minRR && atrPercent >= 0.2) {
    quality = 'GOOD';
  } else if (riskRewardRatio >= multipliers.minRR * 0.7) {
    quality = 'FAIR';
  }

  const reasoning = `ATR: ${atr.toFixed(4)} (${atrPercent.toFixed(2)}%) | TP: ${((tpDistance / currentPrice) * 100).toFixed(2)}% | SL: ${((slDistance / currentPrice) * 100).toFixed(2)}% | R:R ${riskRewardRatio.toFixed(2)} | Perfil: ${profileRisk}`;

  console.log(`[VPM] ${signal} @ ${currentPrice.toFixed(2)} | TP: ${takeProfit.toFixed(2)} | SL: ${stopLoss.toFixed(2)} | ${quality}`);

  return {
    takeProfit,
    stopLoss,
    riskRewardRatio,
    atr,
    atrPercent,
    quality,
    reasoning
  };
}

/**
 * Versão simplificada: retorna apenas TP e SL em percentual
 */
export function calculateVPMPercent(
  candles: CandleData[],
  currentPrice: number,
  signal: 'BUY' | 'SELL',
  profileRisk: ProfileRisk = 'moderate'
): { tpPercent: number; slPercent: number } {
  const result = calculateVPM(candles, currentPrice, signal, profileRisk);
  return {
    tpPercent: Math.abs(((result.takeProfit - currentPrice) / currentPrice) * 100),
    slPercent: Math.abs(((result.stopLoss - currentPrice) / currentPrice) * 100),
  };
}
