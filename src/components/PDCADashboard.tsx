/**
 * PDCA Dashboard — Painel visual dos Agentes de IA
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bot, Play, Pause, RotateCcw, TrendingUp, TrendingDown, Award, Zap, Brain, Target, Activity, ChevronDown, ChevronUp, Clock, CheckCircle, RefreshCw, Power } from 'lucide-react';
import {
  AIAgent,
  getAgents,
  toggleAgent,
  resetAgent,
  updateAgentThreshold,
  onAgentsChange,
  initPDCAService,
  getAgentSuggestions,
  applySuggestions,
  applyAllSuggestions,
  getLastAnalysisTime,
  isAutoAnalysisEnabled,
  setAutoAnalysis,
  feedRealTrades,
  analyzeWithRealData,
  hasRealTradeData,
  getRealTradeStats,
} from '../services/pdcaAgentService';
import { fetchTradeHistory } from '../services/exchangeService';
import { Exchange } from '../types';

const PHASE_COLORS: Record<string, string> = {
  PLAN: 'text-blue-400 bg-blue-500/10',
  DO: 'text-yellow-400 bg-yellow-500/10',
  CHECK: 'text-purple-400 bg-purple-500/10',
  ACT: 'text-green-400 bg-green-500/10',
  IDLE: 'text-gray-400 bg-gray-500/10',
};

function timeAgo(ts: number | null): string {
  if (!ts) return 'Nunca';
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Agora';
  if (mins < 60) return `${mins}min atrás`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h atrás`;
  return `${Math.floor(hrs / 24)}d atrás`;
}

interface PDCADashboardProps {
  exchanges?: Exchange[];
  assets?: { symbol: string; amount: number; price: number; value: number; unrealizedPnL: number; allocation?: number; initialMargin?: number }[];
}

export default function PDCADashboard({ exchanges = [], assets = [] }: PDCADashboardProps) {
  const [agents, setAgents] = useState<AIAgent[]>(() => {
    initPDCAService();
    return getAgents();
  });
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [autoEnabled, setAutoEnabled] = useState(isAutoAnalysisEnabled());
  const [appliedResults, setAppliedResults] = useState<Record<string, string[]>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [allResults, setAllResults] = useState<{ agentName: string; actions: string[] }[] | null>(null);
  const [isLoadingTrades, setIsLoadingTrades] = useState(false);
  const [tradeStats, setTradeStats] = useState<{ totalTrades: number; totalPnL: number; winRate: number } | null>(null);
  const autoTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const unsub = onAgentsChange(setAgents);
    return unsub;
  }, []);

  // Refs para acessar valores atuais sem causar re-render
  const exchangesRef = useRef(exchanges);
  const assetsRef = useRef(assets);
  const hasLoadedRef = useRef(false);
  exchangesRef.current = exchanges;
  assetsRef.current = assets;

  // Função de carga de trades (reutilizável)
  const loadRealTrades = useCallback(async (showLoading = false) => {
    const currentExchanges = exchangesRef.current;
    const currentAssets = assetsRef.current;
    const activeExchange = currentExchanges.find(e => e.status === 'CONNECTED');

    if (!activeExchange) {
      // Fallback: usar posições abertas
      if (currentAssets.length > 0) {
        const assetTrades = currentAssets.filter(a => a.unrealizedPnL !== 0).map(a => ({
          symbol: a.symbol, side: a.amount > 0 ? 'BUY' : 'SELL',
          pnl: a.unrealizedPnL, time: Date.now(), realizedPnl: a.unrealizedPnL,
        }));
        if (assetTrades.length > 0) {
          feedRealTrades(assetTrades);
          const stats = getRealTradeStats();
          if (stats) setTradeStats(stats);
        }
      }
      return;
    }

    if (showLoading) setIsLoadingTrades(true);
    try {
      const trades = await fetchTradeHistory(activeExchange);
      if (trades.length > 0) {
        feedRealTrades(trades);
        const stats = getRealTradeStats();
        if (stats) setTradeStats(stats);
      } else if (currentAssets.length > 0) {
        const assetTrades = currentAssets.filter(a => a.unrealizedPnL !== 0).map(a => ({
          symbol: a.symbol, side: a.amount > 0 ? 'BUY' : 'SELL',
          pnl: a.unrealizedPnL, time: Date.now(), realizedPnl: a.unrealizedPnL,
        }));
        if (assetTrades.length > 0) {
          feedRealTrades(assetTrades);
          const stats = getRealTradeStats();
          if (stats) setTradeStats(stats);
        }
      }
    } catch (err) {
      console.warn('[PDCA] Erro ao carregar trades:', err);
      if (currentAssets.length > 0) {
        const assetTrades = currentAssets.filter(a => a.unrealizedPnL !== 0).map(a => ({
          symbol: a.symbol, side: a.amount > 0 ? 'BUY' : 'SELL',
          pnl: a.unrealizedPnL, time: Date.now(), realizedPnl: a.unrealizedPnL,
        }));
        if (assetTrades.length > 0) {
          feedRealTrades(assetTrades);
          const stats = getRealTradeStats();
          if (stats) setTradeStats(stats);
        }
      }
    } finally {
      setIsLoadingTrades(false);
    }
  }, []);

  // Carregar uma vez na montagem + a cada 5 minutos
  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadRealTrades(true); // primeira vez mostra loading
    }
    const interval = setInterval(() => loadRealTrades(false), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadRealTrades]);

  // Auto-análise a cada 24h
  useEffect(() => {
    if (!autoEnabled) {
      if (autoTimerRef.current) clearInterval(autoTimerRef.current);
      return;
    }

    const checkAndRun = async () => {
      // Buscar trades reais antes de analisar
      const activeExchange = exchanges.find(e => e.status === 'CONNECTED');
      if (activeExchange) {
        try {
          const trades = await fetchTradeHistory(activeExchange);
          if (trades.length > 0) feedRealTrades(trades);
        } catch {}
      }
      
      const now = Date.now();
      const agentList = getAgents();
      agentList.forEach(agent => {
        const lastTs = getLastAnalysisTime(agent.id);
        if (!lastTs || now - lastTs >= 24 * 60 * 60 * 1000) {
          applySuggestions(agent.id);
        }
      });
    };

    checkAndRun();
    autoTimerRef.current = setInterval(checkAndRun, 60 * 60 * 1000);
    return () => { if (autoTimerRef.current) clearInterval(autoTimerRef.current); };
  }, [autoEnabled, exchanges]);

  const handleToggleAuto = () => {
    const next = !autoEnabled;
    setAutoEnabled(next);
    setAutoAnalysis(next);
  };

  const handleAnalyzeNow = async () => {
    setIsAnalyzing(true);
    
    // Buscar trades reais primeiro
    const activeExchange = exchanges.find(e => e.status === 'CONNECTED');
    if (activeExchange) {
      try {
        const trades = await fetchTradeHistory(activeExchange);
        if (trades.length > 0) {
          feedRealTrades(trades);
          const stats = getRealTradeStats();
          if (stats) setTradeStats(stats);
        } else if (assets.length > 0) {
          // API vazia, usar assets
          const assetTrades = assets.filter(a => a.unrealizedPnL !== 0).map(a => ({
            symbol: a.symbol, side: a.amount > 0 ? 'BUY' : 'SELL',
            pnl: a.unrealizedPnL, time: Date.now(), realizedPnl: a.unrealizedPnL,
          }));
          if (assetTrades.length > 0) feedRealTrades(assetTrades);
        }
      } catch (err) {
        console.warn('[PDCA] Erro ao buscar trades:', err);
        // Fallback assets
        if (assets.length > 0) {
          const assetTrades = assets.filter(a => a.unrealizedPnL !== 0).map(a => ({
            symbol: a.symbol, side: a.amount > 0 ? 'BUY' : 'SELL',
            pnl: a.unrealizedPnL, time: Date.now(), realizedPnl: a.unrealizedPnL,
          }));
          if (assetTrades.length > 0) feedRealTrades(assetTrades);
        }
      }
    } else if (assets.length > 0) {
      // Sem exchange, usar assets direto
      const assetTrades = assets.filter(a => a.unrealizedPnL !== 0).map(a => ({
        symbol: a.symbol, side: a.amount > 0 ? 'BUY' : 'SELL',
        pnl: a.unrealizedPnL, time: Date.now(), realizedPnl: a.unrealizedPnL,
      }));
      if (assetTrades.length > 0) feedRealTrades(assetTrades);
    }

    // Analisar com dados reais
    const results = analyzeWithRealData();
    setAllResults(results);
    setIsAnalyzing(false);
  };

  const handleApplySingle = (agentId: string) => {
    const results = applySuggestions(agentId);
    setAppliedResults(prev => ({ ...prev, [agentId]: results }));
    setTimeout(() => {
      setAppliedResults(prev => { const n = { ...prev }; delete n[agentId]; return n; });
    }, 8000);
  };

  // Leaderboard
  const ranked = [...agents].filter(a => a.cycles > 0).sort((a, b) => b.totalPnL - a.totalPnL);

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div className="bg-[#151A25] border border-[#2A303C] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-purple-500/10">
              <Brain className="text-purple-400" size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Agentes IA — PDCA</h2>
              <p className="text-xs text-gray-500">Plan • Do • Check • Act — Ciclo adaptativo de trading</p>
            </div>
          </div>
        </div>

        {/* Trade Data Status */}
        {tradeStats && (
          <div className="bg-[#0B0E14] border border-green-500/15 rounded-lg p-3 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle size={14} className="text-green-400" />
              <span className="text-xs text-green-400 font-bold">Dados Reais Carregados</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span>{tradeStats.totalTrades} trades (7d)</span>
              <span className={tradeStats.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}>${tradeStats.totalPnL.toFixed(2)} PnL</span>
              <span>{tradeStats.winRate}% WR</span>
            </div>
          </div>
        )}
        {isLoadingTrades && (
          <div className="bg-[#0B0E14] rounded-lg p-3 mb-4 flex items-center gap-2">
            <RefreshCw size={14} className="text-cyan-400 animate-spin" />
            <span className="text-xs text-gray-400">Carregando trades da API...</span>
          </div>
        )}

        {/* Auto-Analysis Controls */}
        <div className="bg-gradient-to-r from-purple-500/5 to-cyan-500/5 border border-purple-500/15 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-yellow-400" />
              <span className="text-sm font-bold text-white">Análise Inteligente</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleAuto}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                  autoEnabled
                    ? 'bg-green-500/15 text-green-400 border-green-500/30'
                    : 'bg-gray-500/10 text-gray-500 border-gray-700'
                }`}
                title={autoEnabled ? 'Desativar análise automática' : 'Ativar análise automática a cada 24h'}
              >
                <Power size={12} />
                Auto 24h {autoEnabled ? 'ON' : 'OFF'}
              </button>
              <button
                onClick={handleAnalyzeNow}
                disabled={isAnalyzing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/25 transition-all disabled:opacity-50"
                title="Buscar trades reais e analisar agora"
              >
                {isAnalyzing ? <RefreshCw size={12} className="animate-spin" /> : <Activity size={12} />}
                {isAnalyzing ? 'Analisando...' : 'Analisar Agora'}
              </button>
            </div>
          </div>
          <div className="text-[10px] text-gray-500">
            {autoEnabled
              ? '✅ Análise automática ativa — busca trades reais da API e aplica ajustes a cada 24h.'
              : '⏸ Análise automática desativada — use "Analisar Agora" para buscar trades e analisar.'}
          </div>
        </div>

        {/* All Results (after Analyze Now) */}
        {allResults && (
          <div className="bg-[#0B0E14] border border-cyan-500/20 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CheckCircle size={14} className="text-green-400" />
                <span className="text-xs font-bold text-white">Resultado da Análise</span>
              </div>
              <button onClick={() => setAllResults(null)} className="text-gray-500 hover:text-white text-xs" title="Fechar">✕</button>
            </div>
            <div className="space-y-2">
              {allResults.map((r, i) => (
                <div key={i} className="border-l-2 border-cyan-500/30 pl-3 py-1">
                  <div className="text-xs font-bold text-cyan-400 mb-0.5">{r.agentName}</div>
                  {r.actions.map((a, j) => (
                    <div key={j} className="text-[10px] text-gray-400">{a}</div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Global Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-[#0B0E14] rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-cyan-400">{agents.filter(a => a.active).length}</div>
            <div className="text-xs text-gray-500">Agentes Ativos</div>
          </div>
          <div className="bg-[#0B0E14] rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-yellow-400">{agents.reduce((s, a) => s + a.cycles, 0)}</div>
            <div className="text-xs text-gray-500">Ciclos Total</div>
          </div>
          <div className="bg-[#0B0E14] rounded-lg p-3 text-center">
            <div className={`text-2xl font-bold ${agents.reduce((s, a) => s + a.totalPnL, 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              ${agents.reduce((s, a) => s + a.totalPnL, 0).toFixed(2)}
            </div>
            <div className="text-xs text-gray-500">PnL Total</div>
          </div>
          <div className="bg-[#0B0E14] rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-purple-400">
              {agents.reduce((s, a) => s + a.cycles, 0) > 0
                ? ((agents.reduce((s, a) => s + a.wins, 0) / agents.reduce((s, a) => s + a.cycles, 0)) * 100).toFixed(0)
                : 0}%
            </div>
            <div className="text-xs text-gray-500">Win Rate Geral</div>
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      {ranked.length > 0 && (
        <div className="bg-[#151A25] border border-[#2A303C] rounded-xl p-5">
          <h3 className="text-sm font-bold text-gray-400 uppercase mb-3 flex items-center gap-2">
            <Award size={14} className="text-yellow-400" /> Leaderboard
          </h3>
          <div className="space-y-2">
            {ranked.map((agent, i) => (
              <div key={agent.id} className="flex items-center justify-between bg-[#0B0E14] rounded-lg px-4 py-2">
                <div className="flex items-center gap-3">
                  <span className={`text-lg font-bold ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : 'text-orange-400'}`}>
                    #{i + 1}
                  </span>
                  <div>
                    <span className="text-sm text-white font-bold">{agent.name}</span>
                    <span className="text-[10px] text-gray-500 ml-2">{agent.cycles} ciclos</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">{agent.winRate.toFixed(0)}% WR</span>
                  <span className={`text-sm font-bold ${agent.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ${agent.totalPnL.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Agent Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {agents.map(agent => (
          <div key={agent.id} className="bg-[#151A25] border border-[#2A303C] rounded-xl p-4 hover:border-[#3A404C] transition-all">
            {/* Agent Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Bot size={18} className={agent.active ? 'text-cyan-400' : 'text-gray-600'} />
                <div>
                  <h4 className="text-sm font-bold text-white">{agent.name}</h4>
                  <p className="text-[10px] text-gray-500">{agent.strategy}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${PHASE_COLORS[agent.phase]}`}>
                  {agent.phase}
                </span>
                <button
                  onClick={() => toggleAgent(agent.id)}
                  className={`p-1.5 rounded ${agent.active ? 'text-green-400 hover:bg-green-500/10' : 'text-gray-500 hover:bg-white/5'}`}
                  title={agent.active ? 'Desativar' : 'Ativar'}
                >
                  {agent.active ? <Pause size={14} /> : <Play size={14} />}
                </button>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-4 gap-3 mb-4 bg-[#0B0E14] rounded-lg p-3">
              <div className="text-center">
                <div className="text-lg font-bold text-white">{agent.cycles}</div>
                <div className="text-xs text-gray-500">Ciclos</div>
              </div>
              <div className="text-center">
                <div className={`text-lg font-bold ${agent.winRate >= 50 ? 'text-green-400' : agent.winRate > 0 ? 'text-red-400' : 'text-gray-500'}`}>
                  {agent.winRate.toFixed(0)}%
                </div>
                <div className="text-xs text-gray-500">Win Rate</div>
              </div>
              <div className="text-center">
                <div className={`text-lg font-bold ${agent.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  ${agent.totalPnL.toFixed(2)}
                </div>
                <div className="text-xs text-gray-500">PnL</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-purple-400">{agent.sharpeRatio.toFixed(2)}</div>
                <div className="text-xs text-gray-500">Sharpe</div>
              </div>
            </div>

            {/* Last Analysis Time */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Clock size={10} />
                Última análise: {timeAgo(getLastAnalysisTime(agent.id))}
              </div>
              <button
                onClick={() => handleApplySingle(agent.id)}
                className="flex items-center gap-1.5 text-xs font-bold text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 px-3 py-1.5 rounded-lg transition-colors"
                title="Aplicar sugestões para este agente"
              >
                <Zap size={10} />
                Aplicar Ajustes
              </button>
            </div>

            {/* Applied Results */}
            {appliedResults[agent.id] && (
              <div className="bg-purple-500/5 border border-purple-500/15 rounded-lg p-2.5 mb-2">
                <div className="text-[10px] font-bold text-purple-400 mb-1">Ajustes Aplicados:</div>
                {appliedResults[agent.id].map((r, i) => (
                  <div key={i} className="text-[10px] text-gray-300 py-0.5">{r}</div>
                ))}
              </div>
            )}

            {/* Expandable Details */}
            <button
              onClick={() => setExpandedAgent(expandedAgent === agent.id ? null : agent.id)}
              className="w-full flex items-center justify-center gap-1 text-[10px] text-gray-500 hover:text-gray-300 py-1"
            >
              {expandedAgent === agent.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {expandedAgent === agent.id ? 'Menos' : 'Detalhes'}
            </button>

            {expandedAgent === agent.id && (
              <div className="mt-2 space-y-2 border-t border-[#2A303C]/50 pt-2">
                {/* Threshold */}
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-400 font-medium">Threshold: {agent.confidenceThreshold}%</label>
                  <input
                    type="range"
                    min={40}
                    max={95}
                    value={agent.confidenceThreshold}
                    onChange={(e) => updateAgentThreshold(agent.id, parseInt(e.target.value))}
                    className="w-24 h-1 accent-cyan-400"
                    title="Threshold de confiança"
                  />
                </div>

                {/* Adaptive Params */}
                <div className="text-xs text-gray-500 space-y-1">
                  <div>Threshold Inicial: {agent.adaptiveParams.initialThreshold}% → Atual: {agent.adaptiveParams.adjustedThreshold.toFixed(1)}%</div>
                  <div>Cooldown: {(agent.adaptiveParams.cooldownMs / 1000).toFixed(0)}s</div>
                  <div>Leverage Mult: {agent.adaptiveParams.leverageMultiplier.toFixed(1)}x</div>
                </div>

                {/* Last Cycle */}
                {agent.lastCycle && (
                  <div className="bg-[#0B0E14] rounded-lg p-2 mt-1">
                    <div className="text-xs text-gray-500 font-bold">Último Trade</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {agent.lastCycle.planSymbol} {agent.lastCycle.planSignal} ({agent.lastCycle.planConfidence?.toFixed(0)}%)
                      → {agent.lastCycle.checkResult === 'WIN' ? '✅ WIN' : '❌ LOSS'}
                      {agent.lastCycle.checkPnL !== undefined && ` $${agent.lastCycle.checkPnL.toFixed(2)}`}
                    </div>
                  </div>
                )}

                {/* Sugestões de Melhoria */}
                <div className="bg-gradient-to-r from-purple-500/5 to-cyan-500/5 rounded-lg p-3 mt-2 border border-purple-500/10">
                  <div className="text-[10px] text-purple-400 font-bold mb-1.5 flex items-center gap-1">
                    <Zap size={10} /> SUGESTÕES DE MELHORIA
                  </div>
                  {getAgentSuggestions(agent.id).map((sug, i) => (
                    <div key={i} className="text-[10px] text-gray-300 py-0.5">
                      {sug}
                    </div>
                  ))}
                  <button
                    onClick={() => handleApplySingle(agent.id)}
                    className="mt-2 flex items-center gap-1 text-[10px] font-bold text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 px-3 py-1.5 rounded-lg transition-colors w-full justify-center border border-cyan-500/20"
                    title="Aplicar todas as sugestões"
                  >
                    <CheckCircle size={10} />
                    Aplicar Sugestões Automaticamente
                  </button>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={() => resetAgent(agent.id)}
                    className="flex items-center gap-1 text-[10px] text-red-400 hover:bg-red-500/10 px-2 py-1 rounded"
                    title="Resetar dados do agente"
                  >
                    <RotateCcw size={10} /> Reset
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
