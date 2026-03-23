/**
 * PDCA Dashboard — Painel visual dos Agentes de IA
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bot, Play, Pause, RotateCcw, TrendingUp, TrendingDown, Award, Zap, Brain, Target, Activity, ChevronDown, ChevronUp, Clock, CheckCircle, RefreshCw, Power, Info, Check, X } from 'lucide-react';
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
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set());
  const [autoEnabled, setAutoEnabled] = useState(isAutoAnalysisEnabled());
  const [appliedResults, setAppliedResults] = useState<Record<string, string[]>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [allResults, setAllResults] = useState<{ agentName: string; actions: string[] }[] | null>(null);
  const [selectedActions, setSelectedActions] = useState<Set<string>>(new Set());
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
      loadRealTrades(true);
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
    
    const activeExchange = exchanges.find(e => e.status === 'CONNECTED');
    if (activeExchange) {
      try {
        const trades = await fetchTradeHistory(activeExchange);
        if (trades.length > 0) {
          feedRealTrades(trades);
          const stats = getRealTradeStats();
          if (stats) setTradeStats(stats);
        } else if (assets.length > 0) {
          const assetTrades = assets.filter(a => a.unrealizedPnL !== 0).map(a => ({
            symbol: a.symbol, side: a.amount > 0 ? 'BUY' : 'SELL',
            pnl: a.unrealizedPnL, time: Date.now(), realizedPnl: a.unrealizedPnL,
          }));
          if (assetTrades.length > 0) feedRealTrades(assetTrades);
        }
      } catch (err) {
        console.warn('[PDCA] Erro ao buscar trades:', err);
        if (assets.length > 0) {
          const assetTrades = assets.filter(a => a.unrealizedPnL !== 0).map(a => ({
            symbol: a.symbol, side: a.amount > 0 ? 'BUY' : 'SELL',
            pnl: a.unrealizedPnL, time: Date.now(), realizedPnl: a.unrealizedPnL,
          }));
          if (assetTrades.length > 0) feedRealTrades(assetTrades);
        }
      }
    } else if (assets.length > 0) {
      const assetTrades = assets.filter(a => a.unrealizedPnL !== 0).map(a => ({
        symbol: a.symbol, side: a.amount > 0 ? 'BUY' : 'SELL',
        pnl: a.unrealizedPnL, time: Date.now(), realizedPnl: a.unrealizedPnL,
      }));
      if (assetTrades.length > 0) feedRealTrades(assetTrades);
    }

    const results = analyzeWithRealData();
    setAllResults(results);
    // Selecionar todas as ações por padrão
    if (results) {
      const allActionKeys = new Set<string>();
      results.forEach((r, ri) => r.actions.forEach((_, ai) => allActionKeys.add(`${ri}-${ai}`)));
      setSelectedActions(allActionKeys);
    }
    setIsAnalyzing(false);
  };

  const handleApplyAll = () => {
    const results = applyAllSuggestions();
    setAllResults(results);
    if (results) {
      const allActionKeys = new Set<string>();
      results.forEach((r, ri) => r.actions.forEach((_, ai) => allActionKeys.add(`${ri}-${ai}`)));
      setSelectedActions(allActionKeys);
    }
  };

  const handleApplySingle = (agentId: string) => {
    const results = applySuggestions(agentId);
    setAppliedResults(prev => ({ ...prev, [agentId]: results }));
    setTimeout(() => {
      setAppliedResults(prev => { const n = { ...prev }; delete n[agentId]; return n; });
    }, 8000);
  };

  const toggleActionSelection = (key: string) => {
    setSelectedActions(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleExpanded = (agentId: string) => {
    setExpandedAgents(prev => {
      const next = new Set(prev);
      if (next.has(agentId)) next.delete(agentId);
      else next.add(agentId);
      return next;
    });
  };

  // Leaderboard
  const ranked = [...agents].filter(a => a.cycles > 0).sort((a, b) => b.totalPnL - a.totalPnL);

  return (
    <div className="space-y-5 pb-20">
      {/* Header */}
      <div className="bg-[#151A25] border border-[#2A303C] rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-purple-500/10">
              <Brain className="text-purple-400" size={28} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Agentes IA — PDCA</h2>
              <p className="text-sm text-gray-400 mt-1">Plan • Do • Check • Act — Ciclo adaptativo de trading</p>
            </div>
          </div>
        </div>

        {/* Explicação simples */}
        <div className="bg-gradient-to-r from-blue-500/5 to-purple-500/5 border border-blue-500/15 rounded-xl p-4 mb-5">
          <div className="flex items-start gap-3">
            <Info size={20} className="text-blue-400 shrink-0 mt-0.5" />
            <div className="text-sm text-gray-300 leading-relaxed">
              <p className="font-bold text-blue-400 mb-2">💡 Como funciona?</p>
              <p className="mb-2">
                Os <strong>Agentes IA</strong> analisam seus trades automaticamente e sugerem melhorias. 
                É como ter um consultor que olha seus resultados e diz: <em>"você está arriscando demais, diminua a alavancagem"</em> 
                ou <em>"suas operações estão boas, continue assim!"</em>.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                <div className="bg-blue-500/10 rounded-lg p-2 text-center">
                  <div className="text-blue-400 font-bold text-sm">📋 Plan</div>
                  <div className="text-xs text-gray-400 mt-1">Analisa o mercado e seus trades</div>
                </div>
                <div className="bg-yellow-500/10 rounded-lg p-2 text-center">
                  <div className="text-yellow-400 font-bold text-sm">⚡ Do</div>
                  <div className="text-xs text-gray-400 mt-1">Aplica os ajustes sugeridos</div>
                </div>
                <div className="bg-purple-500/10 rounded-lg p-2 text-center">
                  <div className="text-purple-400 font-bold text-sm">🔍 Check</div>
                  <div className="text-xs text-gray-400 mt-1">Verifica se melhorou</div>
                </div>
                <div className="bg-green-500/10 rounded-lg p-2 text-center">
                  <div className="text-green-400 font-bold text-sm">✅ Act</div>
                  <div className="text-xs text-gray-400 mt-1">Mantém o que funciona</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trade Data Status */}
        {tradeStats && (
          <div className="bg-[#0B0E14] border border-green-500/15 rounded-lg p-4 mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle size={18} className="text-green-400" />
              <span className="text-sm text-green-400 font-bold">Dados Reais Carregados</span>
            </div>
            <div className="flex items-center gap-5 text-sm text-gray-300">
              <span className="font-medium">{tradeStats.totalTrades} trades (7d)</span>
              <span className={`font-bold ${tradeStats.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>${tradeStats.totalPnL.toFixed(2)} PnL</span>
              <span className="font-bold text-purple-400">{tradeStats.winRate}% WR</span>
            </div>
          </div>
        )}
        {isLoadingTrades && (
          <div className="bg-[#0B0E14] rounded-lg p-4 mb-5 flex items-center gap-2">
            <RefreshCw size={16} className="text-cyan-400 animate-spin" />
            <span className="text-sm text-gray-400">Carregando trades da API...</span>
          </div>
        )}

        {/* Auto-Analysis Controls */}
        <div className="bg-gradient-to-r from-purple-500/5 to-cyan-500/5 border border-purple-500/15 rounded-xl p-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap size={20} className="text-yellow-400" />
              <span className="text-base font-bold text-white">Análise Inteligente</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleToggleAuto}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border transition-all ${
                  autoEnabled
                    ? 'bg-green-500/15 text-green-400 border-green-500/30'
                    : 'bg-gray-500/10 text-gray-500 border-gray-700'
                }`}
                title={autoEnabled ? 'Desativar análise automática' : 'Ativar análise automática a cada 24h'}
              >
                <Power size={14} />
                Auto 24h {autoEnabled ? 'ON' : 'OFF'}
              </button>
              <button
                onClick={handleAnalyzeNow}
                disabled={isAnalyzing}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/25 transition-all disabled:opacity-50"
                title="Buscar trades reais e analisar agora"
              >
                {isAnalyzing ? <RefreshCw size={14} className="animate-spin" /> : <Activity size={14} />}
                {isAnalyzing ? 'Analisando...' : 'Analisar Agora'}
              </button>
            </div>
          </div>
          <div className="text-sm text-gray-400 leading-relaxed">
            {autoEnabled
              ? '🤖 Modo automático LIGADO — A cada 24 horas, o sistema busca seus trades mais recentes, analisa o desempenho de cada agente e aplica os ajustes automaticamente. Você não precisa fazer nada!'
              : '⏸ Modo automático DESLIGADO — Clique em "Analisar Agora" para o sistema avaliar seus trades e sugerir melhorias. Você pode revisar e aplicar os ajustes manualmente.'}
          </div>
        </div>

        {/* All Results (after Analyze Now) — ENHANCED */}
        {allResults && (
          <div className="bg-[#0B0E14] border border-cyan-500/20 rounded-xl p-5 mb-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle size={18} className="text-green-400" />
                <span className="text-base font-bold text-white">Resultado da Análise</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleApplyAll}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-green-500/15 text-green-400 border border-green-500/30 hover:bg-green-500/25 transition-all"
                  title="Aplicar todos os ajustes sugeridos"
                >
                  <Zap size={14} />
                  Aplicar Todos Ajustes
                </button>
                <button onClick={() => setAllResults(null)} className="text-gray-500 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors" title="Fechar">
                  <X size={16} />
                </button>
              </div>
            </div>
            
            <p className="text-sm text-gray-400 mb-4">
              Abaixo estão os ajustes que o sistema sugere para melhorar o desempenho dos seus agentes. 
              Você pode aplicar todos de uma vez ou selecionar apenas os que deseja:
            </p>

            <div className="space-y-4">
              {allResults.map((r, ri) => (
                <div key={ri} className="border border-cyan-500/15 rounded-lg p-4 bg-[#151A25]/50">
                  <div className="text-base font-bold text-cyan-400 mb-3 flex items-center gap-2">
                    <Bot size={16} />
                    {r.agentName}
                  </div>
                  <div className="space-y-2">
                    {r.actions.map((action, ai) => {
                      const key = `${ri}-${ai}`;
                      const isSelected = selectedActions.has(key);
                      // Parse action for better display
                      const isWarning = action.includes('⚠') || action.includes('negativo') || action.includes('reduz');
                      const isPositive = action.includes('✅') || action.includes('ideal') || action.includes('bom');
                      return (
                        <label
                          key={ai}
                          className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all border ${
                            isSelected ? 'bg-cyan-500/10 border-cyan-500/25' : 'bg-black/20 border-transparent hover:bg-white/5'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleActionSelection(key)}
                            className="mt-1 accent-cyan-400 w-4 h-4"
                          />
                          <div className="flex-1">
                            <div className={`text-sm font-medium ${isWarning ? 'text-yellow-400' : isPositive ? 'text-green-400' : 'text-gray-300'}`}>
                              {action}
                            </div>
                            {isWarning && (
                              <div className="text-xs text-gray-500 mt-1">
                                ↳ Este ajuste vai modificar os parâmetros deste agente para reduzir riscos
                              </div>
                            )}
                            {isPositive && (
                              <div className="text-xs text-gray-500 mt-1">
                                ↳ Nenhuma alteração necessária — agente está com bom desempenho
                              </div>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Global Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#0B0E14] rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-cyan-400">{agents.filter(a => a.active).length}</div>
            <div className="text-sm text-gray-400 mt-1">Agentes Ativos</div>
          </div>
          <div className="bg-[#0B0E14] rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-yellow-400">{agents.reduce((s, a) => s + a.cycles, 0)}</div>
            <div className="text-sm text-gray-400 mt-1">Ciclos Total</div>
          </div>
          <div className="bg-[#0B0E14] rounded-xl p-4 text-center">
            <div className={`text-3xl font-bold ${agents.reduce((s, a) => s + a.totalPnL, 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              ${agents.reduce((s, a) => s + a.totalPnL, 0).toFixed(2)}
            </div>
            <div className="text-sm text-gray-400 mt-1">PnL Total</div>
          </div>
          <div className="bg-[#0B0E14] rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-purple-400">
              {agents.reduce((s, a) => s + a.cycles, 0) > 0
                ? ((agents.reduce((s, a) => s + a.wins, 0) / agents.reduce((s, a) => s + a.cycles, 0)) * 100).toFixed(0)
                : 0}%
            </div>
            <div className="text-sm text-gray-400 mt-1">Win Rate Geral</div>
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      {ranked.length > 0 && (
        <div className="bg-[#151A25] border border-[#2A303C] rounded-xl p-5">
          <h3 className="text-base font-bold text-gray-300 uppercase mb-4 flex items-center gap-2">
            <Award size={18} className="text-yellow-400" /> Leaderboard
          </h3>
          <div className="space-y-2">
            {ranked.map((agent, i) => (
              <div key={agent.id} className="flex items-center justify-between bg-[#0B0E14] rounded-lg px-5 py-3">
                <div className="flex items-center gap-3">
                  <span className={`text-xl font-bold ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : 'text-orange-400'}`}>
                    #{i + 1}
                  </span>
                  <div>
                    <span className="text-base text-white font-bold">{agent.name}</span>
                    <span className="text-xs text-gray-500 ml-2">{agent.cycles} ciclos</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-300 font-medium">{agent.winRate.toFixed(0)}% WR</span>
                  <span className={`text-base font-bold ${agent.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ${agent.totalPnL.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Agent Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {agents.map(agent => (
          <div key={agent.id} className="bg-[#151A25] border border-[#2A303C] rounded-xl p-5 hover:border-[#3A404C] transition-all">
            {/* Agent Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Bot size={22} className={agent.active ? 'text-cyan-400' : 'text-gray-600'} />
                <div>
                  <h4 className="text-base font-bold text-white">{agent.name}</h4>
                  <p className="text-xs text-gray-400">{agent.strategy}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase ${PHASE_COLORS[agent.phase]}`}>
                  {agent.phase}
                </span>
                <button
                  onClick={() => toggleAgent(agent.id)}
                  className={`p-2 rounded-lg ${agent.active ? 'text-green-400 hover:bg-green-500/10' : 'text-gray-500 hover:bg-white/5'}`}
                  title={agent.active ? 'Desativar' : 'Ativar'}
                >
                  {agent.active ? <Pause size={16} /> : <Play size={16} />}
                </button>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-4 gap-3 mb-4 bg-[#0B0E14] rounded-xl p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{agent.cycles}</div>
                <div className="text-xs text-gray-400">Ciclos</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${agent.winRate >= 50 ? 'text-green-400' : agent.winRate > 0 ? 'text-red-400' : 'text-gray-500'}`}>
                  {agent.winRate.toFixed(0)}%
                </div>
                <div className="text-xs text-gray-400">Win Rate</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${agent.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  ${agent.totalPnL.toFixed(2)}
                </div>
                <div className="text-xs text-gray-400">PnL</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">{agent.sharpeRatio.toFixed(2)}</div>
                <div className="text-xs text-gray-400">Sharpe</div>
              </div>
            </div>

            {/* Last Analysis & Apply */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Clock size={14} />
                Última análise: {timeAgo(getLastAnalysisTime(agent.id))}
              </div>
              <button
                onClick={() => handleApplySingle(agent.id)}
                className="flex items-center gap-2 text-sm font-bold text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 px-4 py-2 rounded-lg transition-colors"
                title="Aplicar sugestões para este agente"
              >
                <Zap size={14} />
                Aplicar Ajustes
              </button>
            </div>

            {/* Applied Results */}
            {appliedResults[agent.id] && (
              <div className="bg-purple-500/5 border border-purple-500/15 rounded-lg p-3 mb-3">
                <div className="text-xs font-bold text-purple-400 mb-2">✅ Ajustes Aplicados:</div>
                {appliedResults[agent.id].map((r, i) => (
                  <div key={i} className="text-sm text-gray-300 py-0.5">{r}</div>
                ))}
              </div>
            )}

            {/* Expandable Details — MULTIPLE EXPAND */}
            <button
              onClick={() => toggleExpanded(agent.id)}
              className="w-full flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-gray-200 py-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              {expandedAgents.has(agent.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              {expandedAgents.has(agent.id) ? 'Menos' : 'Detalhes'}
            </button>

            {expandedAgents.has(agent.id) && (
              <div className="mt-3 space-y-3 border-t border-[#2A303C]/50 pt-3">
                {/* Threshold */}
                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-300 font-medium">Threshold: {agent.confidenceThreshold}%</label>
                  <input
                    type="range"
                    min={40}
                    max={95}
                    value={agent.confidenceThreshold}
                    onChange={(e) => updateAgentThreshold(agent.id, parseInt(e.target.value))}
                    className="w-28 h-1.5 accent-cyan-400"
                    title="Threshold de confiança"
                  />
                </div>

                {/* Adaptive Params */}
                <div className="text-sm text-gray-400 space-y-1 bg-[#0B0E14] rounded-lg p-3">
                  <div className="text-xs text-gray-500 font-bold mb-2 uppercase">Parâmetros Adaptativos</div>
                  <div>📊 Threshold Inicial: {agent.adaptiveParams.initialThreshold}% → Atual: {agent.adaptiveParams.adjustedThreshold.toFixed(1)}%</div>
                  <div>⏱ Cooldown: {(agent.adaptiveParams.cooldownMs / 1000).toFixed(0)}s</div>
                  <div>📈 Leverage Mult: {agent.adaptiveParams.leverageMultiplier.toFixed(1)}x</div>
                </div>

                {/* Last Cycle */}
                {agent.lastCycle && (
                  <div className="bg-[#0B0E14] rounded-lg p-3">
                    <div className="text-sm text-gray-400 font-bold mb-1">Último Trade</div>
                    <div className="text-sm text-gray-300">
                      {agent.lastCycle.planSymbol} {agent.lastCycle.planSignal} ({agent.lastCycle.planConfidence?.toFixed(0)}%)
                      → {agent.lastCycle.checkResult === 'WIN' ? '✅ WIN' : '❌ LOSS'}
                      {agent.lastCycle.checkPnL !== undefined && ` $${agent.lastCycle.checkPnL.toFixed(2)}`}
                    </div>
                  </div>
                )}

                {/* Sugestões de Melhoria */}
                <div className="bg-gradient-to-r from-purple-500/5 to-cyan-500/5 rounded-xl p-4 border border-purple-500/10">
                  <div className="text-sm text-purple-400 font-bold mb-2 flex items-center gap-2">
                    <Zap size={14} /> SUGESTÕES DE MELHORIA
                  </div>
                  {getAgentSuggestions(agent.id).map((sug, i) => (
                    <div key={i} className="text-sm text-gray-300 py-1">
                      {sug}
                    </div>
                  ))}
                  <button
                    onClick={() => handleApplySingle(agent.id)}
                    className="mt-3 flex items-center gap-2 text-sm font-bold text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 px-4 py-2.5 rounded-lg transition-colors w-full justify-center border border-cyan-500/20"
                    title="Aplicar todas as sugestões"
                  >
                    <CheckCircle size={14} />
                    Aplicar Sugestões Automaticamente
                  </button>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-2">
                  <button
                    onClick={() => resetAgent(agent.id)}
                    className="flex items-center gap-2 text-sm text-red-400 hover:bg-red-500/10 px-3 py-2 rounded-lg transition-colors"
                    title="Resetar dados do agente"
                  >
                    <RotateCcw size={14} /> Resetar
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
