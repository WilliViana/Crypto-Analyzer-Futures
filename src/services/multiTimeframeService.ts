/**
 * Multi-Timeframe Consensus Service
 * Valida sinais em múltiplos timeframes antes de executar trades
 */

import { StrategyProfile } from '../types';
import { fetchHistoricalCandles, CandleData } from './marketService';
import { unifiedTechnicalAnalysis } from '../utils/technicalAnalysis';

// ─── Types ───

export interface TimeframeAnalysis {
  timeframe: string;
  signal: 'BUY' | 'SELL' | 'NEUTRAL';
  confidence: number;
  trend: 'UPTREND' | 'DOWNTREND' | 'RANGING';
}

export interface ConsensusResult {
  consensus: 'BUY' | 'SELL' | 'NEUTRAL';
  strength: number; // 0-100
  agreementRate: number; // % de timeframes em acordo
  details: TimeframeAnalysis[];
  recommendation: 'EXECUTE' | 'WAIT' | 'SKIP';
  reasoning: string;
}

// ─── EMA helpers ───

function calculateEMA(data: number[], period: number): number[] {
  if (data.length === 0) return [];
  const k = 2 / (period + 1);
  const ema = [data[0]];
  for (let i = 1; i < data.length; i++) {
    ema.push(data[i] * k + ema[i - 1] * (1 - k));
  }
  return ema;
}

function detectTrend(candles: CandleData[]): 'UPTREND' | 'DOWNTREND' | 'RANGING' {
  if (candles.length < 50) return 'RANGING';

  const closes = candles.map(c => c.close);
  const ema20 = calculateEMA(closes, 20);
  const ema50 = calculateEMA(closes, 50);

  const lastEMA20 = ema20[ema20.length - 1];
  const lastEMA50 = ema50[ema50.length - 1];

  // Margem de 0.1% para considerar "ranging"
  const diff = ((lastEMA20 - lastEMA50) / lastEMA50) * 100;

  if (diff > 0.1) return 'UPTREND';
  if (diff < -0.1) return 'DOWNTREND';
  return 'RANGING';
}

// ─── Pesos por timeframe ───

const TIMEFRAME_WEIGHTS: Record<string, number> = {
  '5m': 0.15,
  '15m': 0.25,
  '1h': 0.35,
  '4h': 0.25,
};

// ─── Consensus principal ───

/**
 * Analisa sinal em múltiplos timeframes e retorna consenso
 * Timeframes: 5m, 15m, 1h, 4h
 */
export async function getMultiTimeframeConsensus(
  symbol: string,
  profile: StrategyProfile
): Promise<ConsensusResult> {
  const timeframes = ['5m', '15m', '1h', '4h'];
  const analyses: TimeframeAnalysis[] = [];
  const errors: string[] = [];

  // Analisa cada timeframe em paralelo
  const promises = timeframes.map(async (tf) => {
    try {
      const candles = await fetchHistoricalCandles(symbol, tf, 100);

      if (!candles || candles.length < 50) {
        return {
          timeframe: tf,
          signal: 'NEUTRAL' as const,
          confidence: 0,
          trend: 'RANGING' as const,
        };
      }

      const analysis = unifiedTechnicalAnalysis(candles, profile);
      const trend = detectTrend(candles);

      return {
        timeframe: tf,
        signal: analysis.signal,
        confidence: analysis.confidence,
        trend,
      };
    } catch (err: any) {
      errors.push(`${tf}: ${err.message}`);
      return {
        timeframe: tf,
        signal: 'NEUTRAL' as const,
        confidence: 0,
        trend: 'RANGING' as const,
      };
    }
  });

  const results = await Promise.all(promises);
  analyses.push(...results);

  // ─── Calcula consenso ponderado ───

  let weightedBuy = 0;
  let weightedSell = 0;
  let totalWeight = 0;

  for (const a of analyses) {
    const weight = TIMEFRAME_WEIGHTS[a.timeframe] || 0.2;
    totalWeight += weight;

    if (a.signal === 'BUY') {
      weightedBuy += weight * (a.confidence / 100);
    } else if (a.signal === 'SELL') {
      weightedSell += weight * (a.confidence / 100);
    }

    // Trend alignment bonus: se trend do timeframe maior alinha com sinal menor
    if (a.timeframe === '1h' || a.timeframe === '4h') {
      if (a.trend === 'UPTREND') weightedBuy += weight * 0.15;
      if (a.trend === 'DOWNTREND') weightedSell += weight * 0.15;
    }
  }

  // Normaliza
  const normalizedBuy = totalWeight > 0 ? (weightedBuy / totalWeight) * 100 : 0;
  const normalizedSell = totalWeight > 0 ? (weightedSell / totalWeight) * 100 : 0;

  // Determina consenso
  let consensus: ConsensusResult['consensus'] = 'NEUTRAL';
  if (normalizedBuy > normalizedSell && normalizedBuy > 30) {
    consensus = 'BUY';
  } else if (normalizedSell > normalizedBuy && normalizedSell > 30) {
    consensus = 'SELL';
  }

  // Agreement rate
  const buyVotes = analyses.filter(a => a.signal === 'BUY').length;
  const sellVotes = analyses.filter(a => a.signal === 'SELL').length;
  const agreementRate = (Math.max(buyVotes, sellVotes) / analyses.length) * 100;

  // Strength = combinação de confidence e agreement
  const maxNormalized = Math.max(normalizedBuy, normalizedSell);
  const strength = (maxNormalized * 0.7) + (agreementRate * 0.3);

  // Recomendação
  let recommendation: ConsensusResult['recommendation'] = 'SKIP';
  if (consensus !== 'NEUTRAL' && strength >= 60) {
    recommendation = 'EXECUTE';
  } else if (consensus !== 'NEUTRAL' && strength >= 40) {
    recommendation = 'WAIT';
  }

  // Verifica se timeframes maiores estão alinhados (1h e 4h)
  const higherTF = analyses.filter(a => a.timeframe === '1h' || a.timeframe === '4h');
  const higherAligned = higherTF.every(a => a.signal === consensus || a.signal === 'NEUTRAL');

  if (!higherAligned && recommendation === 'EXECUTE') {
    recommendation = 'WAIT'; // Rebaixa se 1h/4h não alinham
  }

  // Reasoning
  const trendInfo = analyses
    .filter(a => a.timeframe === '1h' || a.timeframe === '4h')
    .map(a => `${a.timeframe}:${a.trend}`)
    .join(', ');

  const signalInfo = analyses
    .map(a => `${a.timeframe}:${a.signal}(${a.confidence.toFixed(0)}%)`)
    .join(', ');

  const reasoning = `Consensus: ${consensus} | Força: ${strength.toFixed(1)}% | Agreement: ${agreementRate.toFixed(0)}% | Sinais: [${signalInfo}] | Trends: [${trendInfo}]${errors.length > 0 ? ` | Erros: ${errors.join(', ')}` : ''}`;

  console.log(`[CONSENSUS] ${symbol}: ${recommendation} - ${reasoning.slice(0, 120)}`);

  return {
    consensus,
    strength,
    agreementRate,
    details: analyses,
    recommendation,
    reasoning
  };
}

/**
 * Versão rápida: só verifica se timeframe maior confirma direção
 * Mais rápido que consensus completo, bom para filtro rápido
 */
export async function quickTrendCheck(
  symbol: string,
  expectedSignal: 'BUY' | 'SELL'
): Promise<boolean> {
  try {
    const candles1h = await fetchHistoricalCandles(symbol, '1h', 60);
    if (!candles1h || candles1h.length < 50) return true; // Se sem dados, permite

    const trend = detectTrend(candles1h);

    if (expectedSignal === 'BUY' && trend === 'DOWNTREND') {
      console.log(`[QUICK_CHECK] ${symbol} BUY rejeitado: 1h em DOWNTREND`);
      return false;
    }
    if (expectedSignal === 'SELL' && trend === 'UPTREND') {
      console.log(`[QUICK_CHECK] ${symbol} SELL rejeitado: 1h em UPTREND`);
      return false;
    }

    return true;
  } catch {
    return true; // Em caso de erro, permite trade
  }
}
