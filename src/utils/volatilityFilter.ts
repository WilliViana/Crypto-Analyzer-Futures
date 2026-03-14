/**
 * Volatility Filter — Filtra operações por nível de volatilidade
 * Cada perfil só opera em faixas de volatilidade adequadas
 */

import { CandleData } from '../services/marketService';
import { calculateATR } from './vpmCalculator';

// ─── Types ───

export type VolatilityLevel = 'VERY_LOW' | 'LOW' | 'NORMAL' | 'HIGH' | 'VERY_HIGH';

export interface VolatilityAnalysis {
  level: VolatilityLevel;
  atrPercent: number;
  recommendation: 'EXECUTE' | 'WAIT' | 'SKIP';
  reasoning: string;
}

export type RiskProfile = 'conservative' | 'moderate' | 'aggressive' | 'scalper';

// ─── Faixas por perfil ───

interface VolatilityRange {
  minATR: number;   // ATR% mínimo para operar
  maxATR: number;   // ATR% máximo para operar
  idealATR: number; // ATR% ideal
}

const PROFILE_RANGES: Record<RiskProfile, VolatilityRange> = {
  conservative: { minATR: 0.2, maxATR: 1.5, idealATR: 0.5 },
  moderate:     { minATR: 0.3, maxATR: 3.0, idealATR: 1.0 },
  aggressive:   { minATR: 0.5, maxATR: 8.0, idealATR: 2.5 },
  scalper:      { minATR: 0.1, maxATR: 2.0, idealATR: 0.4 },
};

// ─── Classificação de Volatilidade ───

function classifyVolatility(atrPercent: number): VolatilityLevel {
  if (atrPercent < 0.3) return 'VERY_LOW';
  if (atrPercent < 0.8) return 'LOW';
  if (atrPercent < 2.0) return 'NORMAL';
  if (atrPercent < 5.0) return 'HIGH';
  return 'VERY_HIGH';
}

// ─── Análise Principal ───

/**
 * Analisa volatilidade e retorna recomendação baseada no perfil
 */
export function analyzeVolatility(
  candles: CandleData[],
  currentPrice: number,
  riskProfile: RiskProfile = 'moderate'
): VolatilityAnalysis {
  const atr = calculateATR(candles);

  if (atr === 0 || currentPrice === 0) {
    return {
      level: 'NORMAL',
      atrPercent: 0,
      recommendation: 'WAIT',
      reasoning: 'Dados insuficientes para calcular volatilidade'
    };
  }

  const atrPercent = (atr / currentPrice) * 100;
  const level = classifyVolatility(atrPercent);
  const range = PROFILE_RANGES[riskProfile];

  let recommendation: VolatilityAnalysis['recommendation'];
  let reasoning: string;

  if (atrPercent < range.minATR) {
    recommendation = 'SKIP';
    reasoning = `Volatilidade muito baixa (${atrPercent.toFixed(2)}%) para perfil ${riskProfile}. Mín: ${range.minATR}%`;
  } else if (atrPercent > range.maxATR) {
    recommendation = 'SKIP';
    reasoning = `Volatilidade muito alta (${atrPercent.toFixed(2)}%) para perfil ${riskProfile}. Máx: ${range.maxATR}%`;
  } else if (atrPercent >= range.idealATR * 0.7 && atrPercent <= range.idealATR * 1.5) {
    recommendation = 'EXECUTE';
    reasoning = `Volatilidade ideal (${atrPercent.toFixed(2)}%) para perfil ${riskProfile}. Range ideal: ${(range.idealATR * 0.7).toFixed(2)}%-${(range.idealATR * 1.5).toFixed(2)}%`;
  } else {
    recommendation = 'WAIT';
    reasoning = `Volatilidade aceitável (${atrPercent.toFixed(2)}%) mas fora do ideal para perfil ${riskProfile}`;
  }

  console.log(`[VOLATILITY] ${level} (ATR ${atrPercent.toFixed(2)}%) → ${recommendation} [${riskProfile}]`);

  return {
    level,
    atrPercent,
    recommendation,
    reasoning
  };
}

/**
 * Check rápido: retorna true se volatilidade é aceitável para o perfil
 */
export function isVolatilityAcceptable(
  candles: CandleData[],
  currentPrice: number,
  riskProfile: RiskProfile = 'moderate'
): boolean {
  const analysis = analyzeVolatility(candles, currentPrice, riskProfile);
  return analysis.recommendation !== 'SKIP';
}
