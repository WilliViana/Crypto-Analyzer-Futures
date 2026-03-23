/**
 * PDCA Agent Service — Engine de Agentes IA com ciclo Plan/Do/Check/Act
 * Integrado com StrategyProfile do Motor Algorítmico
 */

import { StrategyProfile } from '../types';
import { fetchAuditLogs, AuditLogEntry } from './auditService';

// ─── Types ───

export type PDCAPhase = 'PLAN' | 'DO' | 'CHECK' | 'ACT' | 'IDLE';

export interface PDCACycleResult {
  cycleId: string;
  agentId: string;
  startTime: Date;
  endTime?: Date;
  phase: PDCAPhase;
  planSymbol?: string;
  planSignal?: 'BUY' | 'SELL';
  planConfidence?: number;
  planReasoning?: string;
  doExecuted?: boolean;
  doOrderId?: string;
  doEntry?: number;
  doTP?: number;
  doSL?: number;
  checkResult?: 'WIN' | 'LOSS' | 'PENDING';
  checkPnL?: number;
  checkDuration?: number;
  actAdjustments?: string[];
  actNewThreshold?: number;
}

export interface AIAgent {
  id: string;
  name: string;
  strategy: string;
  active: boolean;
  phase: PDCAPhase;
  cycles: number;
  wins: number;
  losses: number;
  totalPnL: number;
  winRate: number;
  sharpeRatio: number;
  confidenceThreshold: number;
  adaptiveParams: {
    initialThreshold: number;
    adjustedThreshold: number;
    leverageMultiplier: number;
    cooldownMs: number;
  };
  lastCycle?: PDCACycleResult;
  history: PDCACycleResult[];
}

// ─── Profile Analysis Result ───
export interface ProfileAnalysisResult {
  profileId: string;
  profileName: string;
  profileColor: string;
  riskLevel: string;
  currentMetrics: {
    leverage: number;
    marginPerTrade: number;
    stopLoss: number;
    takeProfit: number;
    confidenceThreshold: number;
    capital: number;
    currentCapital: number;
    realPnL: number;
    pnlPct: number;
    pnl: number;
    winRate: number;
    trades: number;
    bestTrade: number;
    worstTrade: number;
  };
  suggestedChanges: ProfileChange[];
  reasoning: string[];
  overallScore: number; // 0-100
}

export interface ProfileChange {
  field: string;
  fieldLabel: string;
  currentValue: number;
  newValue: number;
  reason: string;
  impact: 'positive' | 'neutral' | 'warning';
  selected: boolean;
}

// ─── State ───

let agents: AIAgent[] = [];
let agentListeners: Array<(agents: AIAgent[]) => void> = [];

// ─── Persistência ───

function loadAgents(): AIAgent[] {
  try {
    const saved = localStorage.getItem('cap_pdca_agents');
    if (saved) return JSON.parse(saved);
  } catch { }
  return getDefaultAgents();
}

function saveAgents() {
  const slim = agents.map(a => ({
    ...a,
    history: a.history.slice(-20)
  }));
  localStorage.setItem('cap_pdca_agents', JSON.stringify(slim));
}

function notifyAgentListeners() {
  const snapshot = [...agents];
  for (const listener of agentListeners) {
    try { listener(snapshot); } catch { }
  }
}

// ─── Default Agents ───

function getDefaultAgents(): AIAgent[] {
  return [
    {
      id: 'agent_trend',
      name: 'Trend Hunter',
      strategy: 'Segue tendências com EMA + MACD',
      active: true,
      phase: 'IDLE',
      cycles: 0, wins: 0, losses: 0, totalPnL: 0, winRate: 0, sharpeRatio: 0,
      confidenceThreshold: 70,
      adaptiveParams: { initialThreshold: 70, adjustedThreshold: 70, leverageMultiplier: 1.0, cooldownMs: 30000 },
      history: []
    },
    {
      id: 'agent_reversal',
      name: 'Reversal Sniper',
      strategy: 'Detecta reversões com RSI + Bollinger',
      active: true,
      phase: 'IDLE',
      cycles: 0, wins: 0, losses: 0, totalPnL: 0, winRate: 0, sharpeRatio: 0,
      confidenceThreshold: 75,
      adaptiveParams: { initialThreshold: 75, adjustedThreshold: 75, leverageMultiplier: 1.0, cooldownMs: 45000 },
      history: []
    },
    {
      id: 'agent_scalper',
      name: 'Scalp Machine',
      strategy: 'Scalping com momentum + volume',
      active: false,
      phase: 'IDLE',
      cycles: 0, wins: 0, losses: 0, totalPnL: 0, winRate: 0, sharpeRatio: 0,
      confidenceThreshold: 60,
      adaptiveParams: { initialThreshold: 60, adjustedThreshold: 60, leverageMultiplier: 1.5, cooldownMs: 15000 },
      history: []
    },
    {
      id: 'agent_sentiment',
      name: 'Sentiment Reader',
      strategy: 'Opera com base em sentimento + técnico',
      active: false,
      phase: 'IDLE',
      cycles: 0, wins: 0, losses: 0, totalPnL: 0, winRate: 0, sharpeRatio: 0,
      confidenceThreshold: 80,
      adaptiveParams: { initialThreshold: 80, adjustedThreshold: 80, leverageMultiplier: 0.8, cooldownMs: 60000 },
      history: []
    },
  ];
}

// ─── Profile Personality Definitions ───
// Cada perfil tem uma "personalidade" de investidor que guia os ajustes

interface ProfilePersonality {
  name: string;
  description: string;
  leverageRange: [number, number];
  marginRange: [number, number];
  stopLossRange: [number, number];
  takeProfitRange: [number, number];
  confidenceRange: [number, number];
  riskTolerance: number; // 0-1 quanto tolera perda
  aggression: number; // 0-1 quanto busca oportunidades
  patience: number; // 0-1 quanto espera por sinais melhores
}

const PROFILE_PERSONALITIES: Record<string, ProfilePersonality> = {
  safe: {
    name: 'Seguro',
    description: 'Preserva capital acima de tudo. Entra só em sinais muito fortes.',
    leverageRange: [1, 5],
    marginRange: [5, 30],
    stopLossRange: [1, 3],
    takeProfitRange: [3, 8],
    confidenceRange: [75, 95],
    riskTolerance: 0.15,
    aggression: 0.2,
    patience: 0.9,
  },
  moderate: {
    name: 'Moderado',
    description: 'Equilíbrio entre risco e retorno. Consistência é a meta.',
    leverageRange: [3, 10],
    marginRange: [15, 60],
    stopLossRange: [2, 7],
    takeProfitRange: [5, 15],
    confidenceRange: [60, 80],
    riskTolerance: 0.35,
    aggression: 0.5,
    patience: 0.6,
  },
  bold: {
    name: 'Ousado',
    description: 'Aceita volatilidade alta para capturar movimentos grandes.',
    leverageRange: [5, 25],
    marginRange: [20, 80],
    stopLossRange: [3, 12],
    takeProfitRange: [8, 25],
    confidenceRange: [45, 70],
    riskTolerance: 0.55,
    aggression: 0.75,
    patience: 0.35,
  },
  specialist: {
    name: 'Especialista',
    description: 'Opera pouco mas com precisão cirúrgica. Usa padrões avançados.',
    leverageRange: [5, 30],
    marginRange: [10, 50],
    stopLossRange: [2, 8],
    takeProfitRange: [10, 25],
    confidenceRange: [80, 95],
    riskTolerance: 0.3,
    aggression: 0.4,
    patience: 0.95,
  },
  alpha: {
    name: 'Alpha Predator',
    description: 'Máxima agressividade. Caça liquidações e volatilidade extrema.',
    leverageRange: [10, 75],
    marginRange: [10, 50],
    stopLossRange: [1, 5],
    takeProfitRange: [3, 10],
    confidenceRange: [35, 65],
    riskTolerance: 0.8,
    aggression: 0.95,
    patience: 0.1,
  },
};

function getProfilePersonality(profileId: string): ProfilePersonality {
  return PROFILE_PERSONALITIES[profileId] || PROFILE_PERSONALITIES['moderate'];
}

// ─── Profile Analysis Engine ───

/**
 * Analisa um perfil individual e gera sugestões de mudança
 * Cada perfil é tratado como um investidor com personalidade própria
 */
export function analyzeProfile(
  profile: StrategyProfile,
  auditTrades: { pnl: number; symbol: string; side: string; time: number }[],
  allProfiles: StrategyProfile[]
): ProfileAnalysisResult {
  const personality = getProfilePersonality(profile.id);
  const changes: ProfileChange[] = [];
  const reasoning: string[] = [];
  let score = 50; // Score base

  // Métricas do perfil baseadas nos trades da auditoria
  const profileTrades = auditTrades;
  const totalTrades = profileTrades.length;
  const wins = profileTrades.filter(t => t.pnl > 0).length;
  const losses = profileTrades.filter(t => t.pnl <= 0).length;
  const totalPnL = profileTrades.reduce((s, t) => s + t.pnl, 0);
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
  const pnls = profileTrades.map(t => t.pnl);
  const avgPnl = pnls.length > 0 ? pnls.reduce((a, b) => a + b, 0) / pnls.length : 0;
  const stdDev = pnls.length > 1 ? Math.sqrt(pnls.reduce((s, p) => s + Math.pow(p - avgPnl, 2), 0) / pnls.length) : 1;
  const sharpe = stdDev > 0 ? avgPnl / stdDev : 0;

  // Competição: ver como os outros perfis estão indo
  const competitors = allProfiles.filter(p => p.id !== profile.id && p.active);
  const myRank = allProfiles
    .filter(p => p.active)
    .sort((a, b) => b.pnl - a.pnl)
    .findIndex(p => p.id === profile.id);

  // --- ANÁLISE DE LEVERAGE ---
  if (totalTrades >= 3) {
    if (winRate < 40 && profile.leverage > personality.leverageRange[0]) {
      // Perdendo demais -> reduzir alavancagem
      const reduction = Math.max(personality.leverageRange[0], Math.round(profile.leverage * 0.75));
      changes.push({
        field: 'leverage', fieldLabel: 'Alavancagem',
        currentValue: profile.leverage, newValue: reduction,
        reason: `Win Rate baixo (${winRate.toFixed(0)}%). Reduzir alavancagem para proteger capital.`,
        impact: 'warning', selected: true,
      });
      reasoning.push(`📉 Win Rate de ${winRate.toFixed(0)}% está abaixo do aceitável para ${personality.name}. Reduzindo alavancagem.`);
      score -= 15;
    } else if (winRate > 65 && profile.leverage < personality.leverageRange[1]) {
      // Ganhando bem -> pode aumentar
      const increase = Math.min(personality.leverageRange[1], Math.round(profile.leverage * (1 + personality.aggression * 0.3)));
      changes.push({
        field: 'leverage', fieldLabel: 'Alavancagem',
        currentValue: profile.leverage, newValue: increase,
        reason: `Win Rate alto (${winRate.toFixed(0)}%). Oportunidade de aumentar lucros com mais alavancagem.`,
        impact: 'positive', selected: true,
      });
      reasoning.push(`📈 Win Rate forte! O perfil ${personality.name} pode ser mais agressivo.`);
      score += 10;
    }
  }

  // --- ANÁLISE DE MARGIN PER TRADE ---
  if (totalTrades >= 3) {
    if (totalPnL < 0 && avgPnl < -2) {
      // Perdas médias altas -> reduzir margem
      const newMargin = Math.max(personality.marginRange[0], Math.round(profile.marginPerTrade * 0.8));
      if (newMargin !== profile.marginPerTrade) {
        changes.push({
          field: 'marginPerTrade', fieldLabel: 'Margem por Trade',
          currentValue: profile.marginPerTrade, newValue: newMargin,
          reason: `Perda média de $${Math.abs(avgPnl).toFixed(2)} por trade. Reduzir exposição.`,
          impact: 'warning', selected: true,
        });
        score -= 10;
      }
    } else if (winRate > 55 && avgPnl > 1) {
      // Lucrando -> pode aumentar margem conforme personalidade
      const increase = Math.min(personality.marginRange[1], Math.round(profile.marginPerTrade * (1 + personality.aggression * 0.25)));
      if (increase > profile.marginPerTrade) {
        changes.push({
          field: 'marginPerTrade', fieldLabel: 'Margem por Trade',
          currentValue: profile.marginPerTrade, newValue: increase,
          reason: `Lucro médio de +$${avgPnl.toFixed(2)} por trade. Aumentar margem para capturar mais lucro.`,
          impact: 'positive', selected: true,
        });
        score += 5;
      }
    }
  }

  // --- ANÁLISE DE STOP LOSS ---
  if (totalTrades >= 3) {
    const bigLosses = profileTrades.filter(t => t.pnl < -(profile.marginPerTrade * 0.5)).length;
    if (bigLosses >= 2) {
      // Muitas perdas grandes -> apertar stop loss
      const newSL = Math.max(personality.stopLossRange[0], Math.round(profile.stopLoss * 0.7 * 10) / 10);
      if (newSL < profile.stopLoss) {
        changes.push({
          field: 'stopLoss', fieldLabel: 'Stop Loss %',
          currentValue: profile.stopLoss, newValue: newSL,
          reason: `${bigLosses} perdas grandes detectadas. Apertar stop loss para ${newSL}%.`,
          impact: 'warning', selected: true,
        });
        reasoning.push(`🛡 Muitas perdas significativas. Stop Loss precisa ser mais rigoroso.`);
        score -= 10;
      }
    } else if (winRate > 60 && sharpe > 0.5) {
      // Operando bem -> pode relaxar um pouco se personalidade permite
      const newSL = Math.min(personality.stopLossRange[1], Math.round(profile.stopLoss * (1 + personality.riskTolerance * 0.3) * 10) / 10);
      if (newSL > profile.stopLoss) {
        changes.push({
          field: 'stopLoss', fieldLabel: 'Stop Loss %',
          currentValue: profile.stopLoss, newValue: newSL,
          reason: `Sharpe positivo (${sharpe.toFixed(2)}). Relaxar stop loss para capturar swings maiores.`,
          impact: 'positive', selected: true,
        });
        score += 5;
      }
    }
  }

  // --- ANÁLISE DE TAKE PROFIT ---
  if (totalTrades >= 3) {
    const avgWin = profileTrades.filter(t => t.pnl > 0).reduce((s, t) => s + t.pnl, 0) / Math.max(wins, 1);
    const avgLoss = Math.abs(profileTrades.filter(t => t.pnl < 0).reduce((s, t) => s + t.pnl, 0) / Math.max(losses, 1));
    const riskReward = avgLoss > 0 ? avgWin / avgLoss : 1;

    if (riskReward < 1.2 && winRate < 55) {
      // Risk/Reward ruim -> aumentar TP
      const newTP = Math.min(personality.takeProfitRange[1], Math.round(profile.takeProfit * 1.3));
      if (newTP !== profile.takeProfit) {
        changes.push({
          field: 'takeProfit', fieldLabel: 'Take Profit %',
          currentValue: profile.takeProfit, newValue: newTP,
          reason: `Risk/Reward de ${riskReward.toFixed(2)}. Aumentar TP para melhorar proporção ganho/perda.`,
          impact: 'warning', selected: true,
        });
        score -= 5;
      }
    }
  }

  // --- ANÁLISE DE CONFIDENCE THRESHOLD ---
  if (totalTrades >= 3) {
    if (winRate < 35 && profile.confidenceThreshold < personality.confidenceRange[1]) {
      // Aceitando sinais fracos demais
      const newConf = Math.min(personality.confidenceRange[1], profile.confidenceThreshold + 5 + Math.round(personality.patience * 5));
      changes.push({
        field: 'confidenceThreshold', fieldLabel: 'Threshold de Confiança %',
        currentValue: profile.confidenceThreshold, newValue: newConf,
        reason: `Win Rate de ${winRate.toFixed(0)}%. Ser mais seletivo nos sinais para melhorar qualidade.`,
        impact: 'warning', selected: true,
      });
      score -= 10;
    } else if (winRate > 70 && totalTrades < 5 && profile.confidenceThreshold > personality.confidenceRange[0]) {
      // Win Rate alto mas poucos trades -> pode ser menos exigente
      const newConf = Math.max(personality.confidenceRange[0], profile.confidenceThreshold - 5);
      changes.push({
        field: 'confidenceThreshold', fieldLabel: 'Threshold de Confiança %',
        currentValue: profile.confidenceThreshold, newValue: newConf,
        reason: `Poucos trades (${totalTrades}) com WR alta. Capturar mais oportunidades.`,
        impact: 'positive', selected: true,
      });
      score += 5;
    }
  }

  // --- COMPETIÇÃO ENTRE PERFIS ---
  if (myRank >= 0 && competitors.length > 0) {
    const bestCompetitor = competitors.sort((a, b) => b.pnl - a.pnl)[0];
    if (bestCompetitor && bestCompetitor.pnl > profile.pnl + 20) {
      reasoning.push(`🏆 Perdendo para "${bestCompetitor.name}" por $${(bestCompetitor.pnl - profile.pnl).toFixed(2)}. Ajustes mais agressivos aplicados conforme personalidade ${personality.name}.`);
      score -= 5;
    }
    if (myRank === 0) {
      reasoning.push(`🥇 Liderando entre todos os perfis! Mantendo parâmetros com otimizações leves.`);
      score += 15;
    }
  }

  // --- SEM TRADES ---
  if (totalTrades === 0) {
    reasoning.push(`📊 Sem trades recentes para análise. Usando dados do capital atual como referência.`);
  }

  // PnL real = currentCapital - capital original
  const realPnL = profile.currentCapital - profile.capital;
  const pnlPct = profile.capital > 0 ? ((profile.currentCapital - profile.capital) / profile.capital) * 100 : 0;
  const bestTrade = pnls.length > 0 ? Math.max(...pnls) : 0;
  const worstTrade = pnls.length > 0 ? Math.min(...pnls) : 0;
  
  // Ajustar score baseado no PnL REAL do perfil
  if (realPnL > 0) {
    score += Math.min(25, Math.round(pnlPct)); // Até +25 por lucro %
  } else if (realPnL < 0) {
    score -= Math.min(30, Math.round(Math.abs(pnlPct) / 2)); // Penalizar perdas
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  // Resultado
  if (changes.length === 0 && totalTrades > 0) {
    reasoning.push(`✅ Perfil "${profile.name}" operando bem dentro dos parâmetros do ${personality.name}. Nenhum ajuste necessário.`);
    score = Math.max(score, 65);
  }

  return {
    profileId: profile.id,
    profileName: profile.name,
    profileColor: profile.color,
    riskLevel: profile.riskLevel,
    currentMetrics: {
      leverage: profile.leverage,
      marginPerTrade: profile.marginPerTrade,
      stopLoss: profile.stopLoss,
      takeProfit: profile.takeProfit,
      confidenceThreshold: profile.confidenceThreshold,
      capital: profile.capital,
      currentCapital: profile.currentCapital,
      realPnL,
      pnlPct,
      pnl: profile.pnl,
      winRate: winRate || profile.winRate,
      trades: totalTrades || profile.trades,
      bestTrade,
      worstTrade,
    },
    suggestedChanges: changes,
    reasoning,
    overallScore: score,
  };
}

/**
 * Analisa TODOS os perfis ativos e gera resultados
 */
export function analyzeAllProfiles(
  profiles: StrategyProfile[],
  tradesByProfile: Record<string, { pnl: number; symbol: string; side: string; time: number }[]>
): ProfileAnalysisResult[] {
  return profiles
    .filter(p => p.active)
    .map(profile => {
      const trades = tradesByProfile[profile.id] || tradesByProfile['_all'] || [];
      return analyzeProfile(profile, trades, profiles);
    })
    .sort((a, b) => b.overallScore - a.overallScore);
}

/**
 * Aplica mudanças selecionadas a um perfil
 * Retorna o perfil atualizado
 */
export function applyProfileChanges(
  profile: StrategyProfile,
  changes: ProfileChange[]
): { updatedProfile: StrategyProfile; appliedChanges: string[] } {
  const updatedProfile = { ...profile };
  const appliedChanges: string[] = [];

  for (const change of changes) {
    if (!change.selected) continue;
    
    switch (change.field) {
      case 'leverage':
        updatedProfile.leverage = change.newValue;
        appliedChanges.push(`⚡ Alavancagem: ${change.currentValue}x → ${change.newValue}x`);
        break;
      case 'marginPerTrade':
        updatedProfile.marginPerTrade = change.newValue;
        appliedChanges.push(`💰 Margem/Trade: $${change.currentValue} → $${change.newValue}`);
        break;
      case 'stopLoss':
        updatedProfile.stopLoss = change.newValue;
        appliedChanges.push(`🛡 Stop Loss: ${change.currentValue}% → ${change.newValue}%`);
        break;
      case 'takeProfit':
        updatedProfile.takeProfit = change.newValue;
        appliedChanges.push(`🎯 Take Profit: ${change.currentValue}% → ${change.newValue}%`);
        break;
      case 'confidenceThreshold':
        updatedProfile.confidenceThreshold = change.newValue;
        appliedChanges.push(`📊 Threshold: ${change.currentValue}% → ${change.newValue}%`);
        break;
    }
  }

  return { updatedProfile, appliedChanges };
}

// ─── Legacy PDCA Logic (for backward compat) ───

function actPhase(agent: AIAgent): { adjustments: string[]; newThreshold: number } {
  const adjustments: string[] = [];
  let threshold = agent.adaptiveParams.adjustedThreshold;

  if (agent.cycles >= 5 && agent.winRate < 40) {
    const increase = Math.min(5, (40 - agent.winRate) / 10);
    threshold = Math.min(95, threshold + increase);
    adjustments.push(`Threshold ↑ ${increase.toFixed(1)}%`);
  }
  if (agent.cycles >= 10 && agent.winRate > 65) {
    const decrease = Math.min(3, (agent.winRate - 65) / 10);
    threshold = Math.max(50, threshold - decrease);
    adjustments.push(`Threshold ↓ ${decrease.toFixed(1)}%`);
  }

  return { adjustments, newThreshold: threshold };
}

// ─── Public API ───

export function initPDCAService() {
  agents = loadAgents();
}

export function getAgents(): AIAgent[] {
  if (agents.length === 0) agents = loadAgents();
  return [...agents];
}

export function getAgent(id: string): AIAgent | undefined {
  return agents.find(a => a.id === id);
}

export function toggleAgent(id: string): void {
  agents = agents.map(a => a.id === id ? { ...a, active: !a.active } : a);
  saveAgents();
  notifyAgentListeners();
}

export function updateAgentThreshold(id: string, threshold: number): void {
  agents = agents.map(a => a.id === id ? {
    ...a,
    confidenceThreshold: threshold,
    adaptiveParams: { ...a.adaptiveParams, adjustedThreshold: threshold }
  } : a);
  saveAgents();
  notifyAgentListeners();
}

export function recordAgentTrade(
  agentId: string,
  symbol: string,
  signal: 'BUY' | 'SELL',
  confidence: number,
  pnl: number
): void {
  const agent = agents.find(a => a.id === agentId);
  if (!agent) return;

  agent.cycles++;
  if (pnl > 0) agent.wins++;
  else agent.losses++;
  agent.totalPnL += pnl;
  agent.winRate = agent.cycles > 0 ? (agent.wins / agent.cycles) * 100 : 0;

  const actResult = actPhase(agent);
  agent.adaptiveParams.adjustedThreshold = actResult.newThreshold;
  agent.confidenceThreshold = actResult.newThreshold;

  if (agent.history.length >= 5) {
    const returns = agent.history.filter(h => h.checkPnL !== undefined).map(h => h.checkPnL!);
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const stdD = Math.sqrt(returns.reduce((a, r) => a + Math.pow(r - avgReturn, 2), 0) / returns.length);
    agent.sharpeRatio = stdD > 0 ? avgReturn / stdD : 0;
  }

  agent.phase = 'IDLE';
  saveAgents();
  notifyAgentListeners();
}

export function resetAgent(id: string): void {
  agents = agents.map(a => a.id === id ? {
    ...a,
    cycles: 0, wins: 0, losses: 0, totalPnL: 0, winRate: 0, sharpeRatio: 0,
    phase: 'IDLE',
    confidenceThreshold: a.adaptiveParams.initialThreshold,
    adaptiveParams: { ...a.adaptiveParams, adjustedThreshold: a.adaptiveParams.initialThreshold },
    history: [], lastCycle: undefined
  } : a);
  saveAgents();
  notifyAgentListeners();
}

export function onAgentsChange(cb: (agents: AIAgent[]) => void): () => void {
  agentListeners.push(cb);
  return () => { agentListeners = agentListeners.filter(l => l !== cb); };
}

export function getAgentSuggestions(agentId: string): string[] {
  const agent = agents.find(a => a.id === agentId);
  if (!agent) return [];
  const suggestions: string[] = [];
  if (agent.cycles === 0) {
    suggestions.push('🔄 Aguardando primeiros trades para gerar análises.');
    return suggestions;
  }
  if (agent.cycles >= 3 && agent.winRate < 40) suggestions.push(`📉 Win Rate baixo (${agent.winRate.toFixed(0)}%).`);
  if (agent.cycles >= 3 && agent.winRate > 65) suggestions.push(`📈 Win Rate alto (${agent.winRate.toFixed(0)}%)!`);
  if (agent.sharpeRatio < 0 && agent.cycles >= 5) suggestions.push(`⚠️ Sharpe negativo (${agent.sharpeRatio.toFixed(2)}).`);
  if (agent.totalPnL < -50) suggestions.push(`💰 PnL negativo ($${agent.totalPnL.toFixed(2)}).`);
  if (suggestions.length === 0) suggestions.push('✅ Operando dentro dos parâmetros.');
  return suggestions;
}

export function applySuggestions(agentId: string): string[] {
  const agent = agents.find(a => a.id === agentId);
  if (!agent) return ['❌ Agente não encontrado'];
  if (agent.cycles === 0) return ['ℹ️ Sem dados para análise.'];
  const applied: string[] = [];

  if (agent.cycles >= 3 && agent.winRate < 40) {
    const newThreshold = Math.min(90, agent.confidenceThreshold + 5);
    updateAgentThreshold(agentId, newThreshold);
    applied.push(`Threshold → ${newThreshold}%`);
  }
  if (agent.sharpeRatio < 0 && agent.cycles >= 5) {
    agent.adaptiveParams.leverageMultiplier = Math.max(0.5, agent.adaptiveParams.leverageMultiplier - 0.2);
    applied.push(`Leverage mult → ${agent.adaptiveParams.leverageMultiplier.toFixed(1)}x`);
  }
  if (agent.totalPnL < -50) {
    agent.adaptiveParams.cooldownMs = Math.min(300000, agent.adaptiveParams.cooldownMs + 30000);
    applied.push(`Cooldown → ${(agent.adaptiveParams.cooldownMs / 1000).toFixed(0)}s`);
  }

  if (applied.length === 0) applied.push('✅ Nenhum ajuste necessário.');
  localStorage.setItem(`lastAnalysis_${agentId}`, Date.now().toString());
  notifyAgentListeners();
  return applied;
}

export function applyAllSuggestions(): { agentName: string; actions: string[] }[] {
  return agents
    .filter(a => a.active)
    .map(a => ({ agentName: a.name, actions: applySuggestions(a.id) }));
}

export function getLastAnalysisTime(agentId: string): number | null {
  const ts = localStorage.getItem(`lastAnalysis_${agentId}`);
  return ts ? parseInt(ts) : null;
}

export function isAutoAnalysisEnabled(): boolean {
  return localStorage.getItem('aiAutoAnalysis') === 'true';
}

export function setAutoAnalysis(enabled: boolean): void {
  localStorage.setItem('aiAutoAnalysis', String(enabled));
}

// ─── Real Trade Data Integration ───

interface RealTrade {
  symbol: string;
  side: string;
  pnl: number;
  time: number;
  realizedPnl: number;
  qty?: number;
  price?: number;
  commission?: number;
}

let realTradeData: RealTrade[] = [];

export function feedRealTrades(trades: RealTrade[]): void {
  realTradeData = trades.filter(t => t.realizedPnl !== 0);
  if (realTradeData.length === 0) return;

  const now = Date.now();
  const last7days = now - 7 * 24 * 60 * 60 * 1000;
  const recentTrades = realTradeData.filter(t => t.time >= last7days);
  if (recentTrades.length === 0) return;

  const activeAgents = agents.filter(a => a.active);
  if (activeAgents.length === 0) return;

  const tradesPerAgent = Math.ceil(recentTrades.length / activeAgents.length);

  activeAgents.forEach((agent, idx) => {
    const agentTrades = recentTrades.slice(idx * tradesPerAgent, (idx + 1) * tradesPerAgent);
    if (agentTrades.length === 0) return;

    const agentWins = agentTrades.filter(t => t.realizedPnl > 0).length;
    const agentPnL = agentTrades.reduce((s, t) => s + t.realizedPnl, 0);
    const agentWR = agentTrades.length > 0 ? (agentWins / agentTrades.length) * 100 : 0;
    const agentPnls = agentTrades.map(t => t.realizedPnl);
    const agentAvg = agentPnls.reduce((a, b) => a + b, 0) / agentPnls.length;
    const agentStd = agentPnls.length > 1 ? Math.sqrt(agentPnls.reduce((s, p) => s + Math.pow(p - agentAvg, 2), 0) / agentPnls.length) : 1;

    agent.cycles = agentTrades.length;
    agent.wins = agentWins;
    agent.losses = agentTrades.filter(t => t.realizedPnl < 0).length;
    agent.totalPnL = agentPnL;
    agent.winRate = agentWR;
    agent.sharpeRatio = agentStd > 0 ? agentAvg / agentStd : 0;

    const lastTrade = agentTrades[agentTrades.length - 1];
    if (lastTrade) {
      agent.lastCycle = {
        cycleId: `real_${lastTrade.time}`,
        agentId: agent.id,
        startTime: new Date(lastTrade.time),
        endTime: new Date(lastTrade.time),
        phase: 'CHECK',
        planSymbol: lastTrade.symbol,
        planSignal: lastTrade.side === 'BUY' ? 'BUY' : 'SELL',
        planConfidence: agentWR,
        checkResult: lastTrade.realizedPnl > 0 ? 'WIN' : 'LOSS',
        checkPnL: lastTrade.realizedPnl,
      };
    }

    agent.phase = agent.totalPnL > 0 ? 'ACT' : agent.cycles > 3 ? 'CHECK' : 'DO';
  });

  saveAgents();
  notifyAgentListeners();
}

export function analyzeWithRealData(): { agentName: string; actions: string[] }[] {
  if (realTradeData.length === 0) {
    return agents.filter(a => a.active).map(a => ({
      agentName: a.name,
      actions: a.cycles > 0
        ? applySuggestions(a.id)
        : ['⚠️ Sem trades recebidos da API — conecte a exchange.']
    }));
  }
  feedRealTrades(realTradeData);
  return applyAllSuggestions();
}

export function hasRealTradeData(): boolean {
  return realTradeData.length > 0;
}

export function getRealTradeStats(): { totalTrades: number; totalPnL: number; winRate: number; wins: number; losses: number } | null {
  if (realTradeData.length === 0) return null;
  const now = Date.now();
  const last7days = now - 7 * 24 * 60 * 60 * 1000;
  const recent = realTradeData.filter(t => t.time >= last7days);
  if (recent.length === 0) return null;
  const wins = recent.filter(t => t.realizedPnl > 0).length;
  return {
    totalTrades: recent.length,
    totalPnL: recent.reduce((s, t) => s + t.realizedPnl, 0),
    winRate: recent.length > 0 ? Math.round((wins / recent.length) * 100) : 0,
    wins,
    losses: recent.filter(t => t.realizedPnl < 0).length,
  };
}

export function getRealTrades(): RealTrade[] {
  return [...realTradeData];
}
