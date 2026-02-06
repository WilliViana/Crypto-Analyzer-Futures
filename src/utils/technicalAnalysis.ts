import { StrategyProfile } from '../types';

interface AnalysisResult {
  signal: 'LONG' | 'SHORT' | 'NEUTRAL';
  confidence: number;
  reasons: string[];
}

// Cálculo simples de RSI (Relative Strength Index)
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

// Cálculo básico de EMA (Exponential Moving Average)
function calculateEMA(data: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const emaArray = [data[0]];
  for (let i = 1; i < data.length; i++) {
    emaArray.push(data[i] * k + emaArray[i - 1] * (1 - k));
  }
  return emaArray;
}

export const unifiedTechnicalAnalysis = (candles: any[], profile: StrategyProfile): AnalysisResult => {
  if (!candles || candles.length < 50) {
    return { signal: 'NEUTRAL', confidence: 0, reasons: ['Dados insuficientes'] };
  }

  const closes = candles.map((c: any) => c.close);
  const currentPrice = closes[closes.length - 1];
  
  // 1. Calcular Indicadores
  const rsi = calculateRSI(closes, profile.indicators.rsi.period || 14);
  
  // MACD Simplificado (EMA 12 - EMA 26)
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  const macdLine = ema12[ema12.length - 1] - ema26[ema26.length - 1];

  let scoreBuy = 0;
  let scoreSell = 0;
  const reasons: string[] = [];

  // 2. Lógica Baseada nos Indicadores do Perfil
  
  // --- RSI ---
  if (profile.indicators.rsi.enabled) {
    const low = profile.indicators.rsi.thresholdLow || 30;
    const high = profile.indicators.rsi.thresholdHigh || 70;
    
    if (rsi < low) {
      scoreBuy += profile.indicators.rsi.weight;
      reasons.push(`RSI ${rsi.toFixed(1)} (Sobrevenda)`);
    } else if (rsi > high) {
      scoreSell += profile.indicators.rsi.weight;
      reasons.push(`RSI ${rsi.toFixed(1)} (Sobrecompra)`);
    }
  }

  // --- MACD ---
  if (profile.indicators.macd.enabled) {
    if (macdLine > 0) {
        scoreBuy += profile.indicators.macd.weight; // Tendência de alta
    } else {
        scoreSell += profile.indicators.macd.weight; // Tendência de baixa
    }
  }

  // --- Bandas de Bollinger (Simplificado: Preço vs SMA 20) ---
  if (profile.indicators.bollinger.enabled) {
      // Usando média simples de 20 como base
      const sum = closes.slice(-20).reduce((a, b) => a + b, 0);
      const sma20 = sum / 20;
      
      if (currentPrice < sma20 * 0.98) { // Preço 2% abaixo da média
          scoreBuy += profile.indicators.bollinger.weight;
          reasons.push("Preço abaixo da média (Dip)");
      } else if (currentPrice > sma20 * 1.02) {
          scoreSell += profile.indicators.bollinger.weight;
      }
  }

  // 3. Decisão Final
  // Normaliza score para 0-100
  const totalWeight = Object.values(profile.indicators).reduce((acc, ind) => acc + (ind.enabled ? ind.weight : 0), 0) || 1;
  
  const confidenceBuy = (scoreBuy / totalWeight) * 100;
  const confidenceSell = (scoreSell / totalWeight) * 100;

  if (confidenceBuy > confidenceSell && confidenceBuy >= profile.confidenceThreshold) {
    return { signal: 'LONG', confidence: confidenceBuy, reasons };
  } 
  
  if (confidenceSell > confidenceBuy && confidenceSell >= profile.confidenceThreshold) {
    return { signal: 'SHORT', confidence: confidenceSell, reasons };
  }

  return { signal: 'NEUTRAL', confidence: 0, reasons: [] };
};