/**
 * PDCA Agent Service — Engine de Agentes IA com ciclo Plan/Do/Check/Act
 */

// ─── Types ───

export type PDCAPhase = 'PLAN' | 'DO' | 'CHECK' | 'ACT' | 'IDLE';

export interface PDCACycleResult {
  cycleId: string;
  agentId: string;
  startTime: Date;
  endTime?: Date;
  phase: PDCAPhase;

  // Plan
  planSymbol?: string;
  planSignal?: 'BUY' | 'SELL';
  planConfidence?: number;
  planReasoning?: string;

  // Do
  doExecuted?: boolean;
  doOrderId?: string;
  doEntry?: number;
  doTP?: number;
  doSL?: number;

  // Check
  checkResult?: 'WIN' | 'LOSS' | 'PENDING';
  checkPnL?: number;
  checkDuration?: number; // ms

  // Act
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
  // Salva sem o history completo pra não estourar localStorage
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

// ─── PDCA Logic ───

/**
 * Simula ciclo PLAN para um agente
 */
function planPhase(agent: AIAgent, symbol: string, signal: 'BUY' | 'SELL', confidence: number): PDCACycleResult {
  return {
    cycleId: `cycle_${Date.now().toString(36)}`,
    agentId: agent.id,
    startTime: new Date(),
    phase: 'PLAN',
    planSymbol: symbol,
    planSignal: signal,
    planConfidence: confidence,
    planReasoning: `${agent.name} detectou ${signal} em ${symbol} com ${confidence.toFixed(1)}% confiança`,
  };
}

/**
 * Atualiza fase CHECK com resultado
 */
function checkPhase(cycle: PDCACycleResult, pnl: number): PDCACycleResult {
  return {
    ...cycle,
    phase: 'CHECK',
    checkResult: pnl > 0 ? 'WIN' : 'LOSS',
    checkPnL: pnl,
    checkDuration: Date.now() - cycle.startTime.getTime(),
    endTime: new Date()
  };
}

/**
 * ACT: Ajusta parâmetros adaptativos com base nos resultados
 */
function actPhase(agent: AIAgent): { adjustments: string[]; newThreshold: number } {
  const adjustments: string[] = [];
  let threshold = agent.adaptiveParams.adjustedThreshold;

  // Se winRate < 40%, aumenta threshold (mais seletivo)
  if (agent.cycles >= 5 && agent.winRate < 40) {
    const increase = Math.min(5, (40 - agent.winRate) / 10);
    threshold = Math.min(95, threshold + increase);
    adjustments.push(`Threshold ↑ ${increase.toFixed(1)}% (winRate baixo: ${agent.winRate.toFixed(1)}%)`);
  }

  // Se winRate > 65%, pode reduzir threshold (mais oportunidades)
  if (agent.cycles >= 10 && agent.winRate > 65) {
    const decrease = Math.min(3, (agent.winRate - 65) / 10);
    threshold = Math.max(50, threshold - decrease);
    adjustments.push(`Threshold ↓ ${decrease.toFixed(1)}% (winRate alto: ${agent.winRate.toFixed(1)}%)`);
  }

  // Ajusta cooldown baseado em perdas consecutivas recentes
  const recentHistory = agent.history.slice(-5);
  const recentLosses = recentHistory.filter(c => c.checkResult === 'LOSS').length;
  if (recentLosses >= 3) {
    agent.adaptiveParams.cooldownMs = Math.min(120000, agent.adaptiveParams.cooldownMs * 1.5);
    adjustments.push(`Cooldown ↑ para ${(agent.adaptiveParams.cooldownMs / 1000).toFixed(0)}s (${recentLosses} perdas recentes)`);
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

/**
 * Registra resultado de trade para um agente
 */
export function recordAgentTrade(
  agentId: string,
  symbol: string,
  signal: 'BUY' | 'SELL',
  confidence: number,
  pnl: number
): void {
  const agent = agents.find(a => a.id === agentId);
  if (!agent) return;

  // Cria ciclo completo
  let cycle = planPhase(agent, symbol, signal, confidence);
  cycle = { ...cycle, phase: 'DO', doExecuted: true };
  cycle = checkPhase(cycle, pnl);

  // Atualiza métricas
  agent.cycles++;
  if (pnl > 0) agent.wins++;
  else agent.losses++;
  agent.totalPnL += pnl;
  agent.winRate = agent.cycles > 0 ? (agent.wins / agent.cycles) * 100 : 0;
  agent.lastCycle = cycle;
  agent.history = [...agent.history.slice(-49), cycle];

  // ACT phase
  const actResult = actPhase(agent);
  cycle.phase = 'ACT';
  (cycle as any).actAdjustments = actResult.adjustments;
  (cycle as any).actNewThreshold = actResult.newThreshold;
  agent.adaptiveParams.adjustedThreshold = actResult.newThreshold;
  agent.confidenceThreshold = actResult.newThreshold;

  // Calcula Sharpe (simplificado)
  if (agent.history.length >= 5) {
    const returns = agent.history.filter(h => h.checkPnL !== undefined).map(h => h.checkPnL!);
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const stdDev = Math.sqrt(returns.reduce((a, r) => a + Math.pow(r - avgReturn, 2), 0) / returns.length);
    agent.sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;
  }

  agent.phase = 'IDLE';
  saveAgents();
  notifyAgentListeners();
}

/**
 * Reseta agente
 */
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
