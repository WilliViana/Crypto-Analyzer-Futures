/**
 * PDCA Dashboard — Painel visual dos Agentes de IA integrado com Perfis do Motor
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bot, TrendingUp, TrendingDown, Award, Zap, Brain, Target, Activity, ChevronDown, ChevronUp, Clock, CheckCircle, RefreshCw, Power, Info, Check, X, Shield, Rocket, Crown, Settings, ArrowRight, Trophy, RotateCcw } from 'lucide-react';
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
  getLastAnalysisTime,
  isAutoAnalysisEnabled,
  setAutoAnalysis,
  feedRealTrades,
  hasRealTradeData,
  getRealTradeStats,
  getRealTrades,
  analyzeAllProfiles,
  applyProfileChanges,
  ProfileAnalysisResult,
  ProfileChange,
} from '../services/pdcaAgentService';
import { fetchTradeHistory } from '../services/exchangeService';
import { Exchange, StrategyProfile } from '../types';

const PHASE_COLORS: Record<string, string> = {
  PLAN: 'text-blue-400 bg-blue-500/10',
  DO: 'text-yellow-400 bg-yellow-500/10',
  CHECK: 'text-purple-400 bg-purple-500/10',
  ACT: 'text-green-400 bg-green-500/10',
  IDLE: 'text-gray-400 bg-gray-500/10',
};

const PROFILE_ICONS: Record<string, React.ReactNode> = {
  safe: <Shield size={20} className="text-blue-400" />,
  moderate: <Target size={20} className="text-yellow-400" />,
  bold: <Rocket size={20} className="text-orange-400" />,
  specialist: <Brain size={20} className="text-purple-400" />,
  alpha: <Zap size={20} className="text-red-400" />,
};

const PROFILE_COLORS: Record<string, string> = {
  safe: 'border-blue-500/30 bg-blue-500/5',
  moderate: 'border-yellow-500/30 bg-yellow-500/5',
  bold: 'border-orange-500/30 bg-orange-500/5',
  specialist: 'border-purple-500/30 bg-purple-500/5',
  alpha: 'border-red-500/30 bg-red-500/5',
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
  profiles?: StrategyProfile[];
  setProfiles?: (fn: (prev: StrategyProfile[]) => StrategyProfile[]) => void;
}

export default function PDCADashboard({ exchanges = [], assets = [], profiles = [], setProfiles }: PDCADashboardProps) {
  const [agents, setAgents] = useState<AIAgent[]>(() => {
    initPDCAService();
    return getAgents();
  });
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set());
  const [autoEnabled, setAutoEnabled] = useState(isAutoAnalysisEnabled());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoadingTrades, setIsLoadingTrades] = useState(false);
  const [tradeStats, setTradeStats] = useState<{ totalTrades: number; totalPnL: number; winRate: number } | null>(null);
  const autoTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Profile analysis state
  const [profileResults, setProfileResults] = useState<ProfileAnalysisResult[] | null>(null);
  const [expandedProfiles, setExpandedProfiles] = useState<Set<string>>(new Set());

  useEffect(() => {
    const unsub = onAgentsChange(setAgents);
    return unsub;
  }, []);

  const exchangesRef = useRef(exchanges);
  const assetsRef = useRef(assets);
  const hasLoadedRef = useRef(false);
  exchangesRef.current = exchanges;
  assetsRef.current = assets;

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
    } finally {
      setIsLoadingTrades(false);
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadRealTrades(true);
    }
    const interval = setInterval(() => loadRealTrades(false), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadRealTrades]);

  // Auto-análise: quando ativado, roda imediato e atualiza a cada 5 min
  const profilesRef = useRef(profiles);
  profilesRef.current = profiles;
  const setProfilesRef = useRef(setProfiles);
  setProfilesRef.current = setProfiles;

  useEffect(() => {
    if (!autoEnabled || !setProfilesRef.current || profilesRef.current.length === 0) {
      if (autoTimerRef.current) clearInterval(autoTimerRef.current);
      return;
    }

    const runAutoAnalysis = async () => {
      const currentProfiles = profilesRef.current;
      // Carregar trades reais
      const activeExchange = exchanges.find(e => e.status === 'CONNECTED');
      if (activeExchange) {
        try {
          const trades = await fetchTradeHistory(activeExchange);
          if (trades.length > 0) feedRealTrades(trades);
        } catch {}
      }

      // Analisar todos os perfis
      const realTrades = getRealTrades();
      const tradesByProfile: Record<string, any[]> = {};
      const activeProfiles = currentProfiles.filter(p => p.active);

      if (realTrades.length > 0 && activeProfiles.length > 0) {
        const tradesPerProfile = Math.ceil(realTrades.length / activeProfiles.length);
        activeProfiles.forEach((profile, idx) => {
          tradesByProfile[profile.id] = realTrades
            .slice(idx * tradesPerProfile, (idx + 1) * tradesPerProfile)
            .map(t => ({ pnl: t.realizedPnl, symbol: t.symbol, side: t.side, time: t.time }));
        });
      }

      const results = analyzeAllProfiles(currentProfiles, tradesByProfile);
      
      // Mostrar resultados na tela (sem forçar expansão)
      setProfileResults(results);

      // Aplicar TODOS ajustes automaticamente
      const setProfilesFn = setProfilesRef.current;
      if (setProfilesFn) {
        for (const result of results) {
          if (result.suggestedChanges.length > 0) {
            const { updatedProfile } = applyProfileChanges(
              currentProfiles.find(p => p.id === result.profileId)!,
              result.suggestedChanges
            );
            setProfilesFn(prev => prev.map(p => p.id === result.profileId ? { ...p, ...updatedProfile } : p));
          }
        }
      }

      localStorage.setItem('pdca_last_auto_run', Date.now().toString());
    };

    // Rodar imediatamente ao ativar
    runAutoAnalysis();
    // Atualizar a cada 5 minutos
    autoTimerRef.current = setInterval(runAutoAnalysis, 5 * 60 * 1000);
    return () => { if (autoTimerRef.current) clearInterval(autoTimerRef.current); };
  }, [autoEnabled, exchanges]);

  const handleToggleAuto = () => {
    const next = !autoEnabled;
    setAutoEnabled(next);
    setAutoAnalysis(next);
    // Se desligou, limpar resultados auto
    if (!next) {
      setProfileResults(null);
    }
  };

  const handleAnalyzeNow = async () => {
    setIsAnalyzing(true);
    try {
      await loadRealTrades(false);

      const realTrades = getRealTrades();
      const tradesByProfile: Record<string, any[]> = {};
      const activeProfiles = profiles.filter(p => p.active);

      if (realTrades.length > 0 && activeProfiles.length > 0) {
        const tradesPerProfile = Math.ceil(realTrades.length / activeProfiles.length);
        activeProfiles.forEach((profile, idx) => {
          tradesByProfile[profile.id] = realTrades
            .slice(idx * tradesPerProfile, (idx + 1) * tradesPerProfile)
            .map(t => ({ pnl: t.realizedPnl, symbol: t.symbol, side: t.side, time: t.time }));
        });
      } else if (assets.length > 0 && activeProfiles.length > 0) {
        const assetTrades = assets.filter(a => a.unrealizedPnL !== 0).map(a => ({
          pnl: a.unrealizedPnL, symbol: a.symbol, side: a.amount > 0 ? 'BUY' : 'SELL', time: Date.now(),
        }));
        const tradesPerProfile = Math.ceil(assetTrades.length / activeProfiles.length);
        activeProfiles.forEach((profile, idx) => {
          tradesByProfile[profile.id] = assetTrades.slice(idx * tradesPerProfile, (idx + 1) * tradesPerProfile);
        });
      }

      const results = analyzeAllProfiles(profiles, tradesByProfile);
      setProfileResults(results);
      setExpandedProfiles(new Set(results.map(r => r.profileId)));
    } catch (err) {
      console.error('[PDCA] Erro na análise:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplyProfileChanges = (result: ProfileAnalysisResult) => {
    if (!setProfiles) return;
    const profile = profiles.find(p => p.id === result.profileId);
    if (!profile) return;

    const { updatedProfile, appliedChanges } = applyProfileChanges(profile, result.suggestedChanges);
    setProfiles(prev => prev.map(p => p.id === result.profileId ? { ...p, ...updatedProfile } : p));
    
    // Atualizar resultado para marcar como aplicado
    setProfileResults(prev => prev?.map(r => r.profileId === result.profileId
      ? { ...r, suggestedChanges: r.suggestedChanges.map(c => ({ ...c, selected: false })), reasoning: [...r.reasoning, '✅ Ajustes aplicados com sucesso!'] }
      : r
    ) || null);
  };

  const handleApplyAll = () => {
    if (!setProfiles || !profileResults) return;
    for (const result of profileResults) {
      if (result.suggestedChanges.length > 0) {
        const profile = profiles.find(p => p.id === result.profileId);
        if (!profile) continue;
        const { updatedProfile } = applyProfileChanges(profile, result.suggestedChanges);
        setProfiles(prev => prev.map(p => p.id === result.profileId ? { ...p, ...updatedProfile } : p));
      }
    }
    setProfileResults(prev => prev?.map(r => ({
      ...r,
      suggestedChanges: r.suggestedChanges.map(c => ({ ...c, selected: false })),
      reasoning: [...r.reasoning, '✅ Todos os ajustes aplicados!'],
    })) || null);
  };

  const toggleProfileChange = (profileId: string, field: string) => {
    setProfileResults(prev => prev?.map(r => r.profileId === profileId
      ? { ...r, suggestedChanges: r.suggestedChanges.map(c => c.field === field ? { ...c, selected: !c.selected } : c) }
      : r
    ) || null);
  };

  const toggleExpandProfile = (id: string) => {
    setExpandedProfiles(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const activeProfilesCount = profiles.filter(p => p.active).length;
  const totalChanges = profileResults?.reduce((s, r) => s + r.suggestedChanges.filter(c => c.selected).length, 0) || 0;

  return (
    <div className="space-y-6 pb-16 max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-black text-white flex items-center justify-center gap-3">
          <Brain className="text-primary" size={32} /> Agentes IA — PDCA
        </h2>
        <p className="text-gray-400 mt-1">Plan • Do • Check • Act — Otimização inteligente dos perfis de investimento</p>
      </div>

      {/* Explicação */}
      <div className="bg-surface rounded-2xl border border-card-border p-5">
        <div className="flex items-start gap-3">
          <Info className="text-yellow-400 mt-1 shrink-0" size={22} />
          <div>
            <h3 className="text-yellow-400 font-bold text-lg mb-2">💡 Como funciona?</h3>
            <p className="text-gray-300 text-base leading-relaxed">
              Os <strong>Agentes IA</strong> analisam o desempenho de cada <strong>perfil de investimento</strong> (Seguro, Moderado, Ousado, Especialista, Alpha Predator) 
              e sugerem ajustes específicos para cada um. Cada perfil tem uma <strong>personalidade única</strong> — como investidores diferentes competindo para gerar mais lucro.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              <div className="bg-blue-500/10 p-3 rounded-xl text-center border border-blue-500/20">
                <div className="text-blue-400 font-bold">📋 Plan</div>
                <div className="text-xs text-gray-400 mt-1">Analisa trades reais de cada perfil</div>
              </div>
              <div className="bg-yellow-500/10 p-3 rounded-xl text-center border border-yellow-500/20">
                <div className="text-yellow-400 font-bold">⚡ Do</div>
                <div className="text-xs text-gray-400 mt-1">Sugere ajustes em leverage, SL, TP</div>
              </div>
              <div className="bg-purple-500/10 p-3 rounded-xl text-center border border-purple-500/20">
                <div className="text-purple-400 font-bold">🔍 Check</div>
                <div className="text-xs text-gray-400 mt-1">Compara com os concorrentes</div>
              </div>
              <div className="bg-green-500/10 p-3 rounded-xl text-center border border-green-500/20">
                <div className="text-green-400 font-bold">✅ Act</div>
                <div className="text-xs text-gray-400 mt-1">Aplica mudanças no Motor</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trade Stats + Controls */}
      <div className="bg-surface rounded-2xl border border-card-border p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {tradeStats ? (
              <>
                <span className="text-green-400 text-sm font-medium">✓ Dados Reais Carregados</span>
                <span className="text-gray-400 text-sm">{tradeStats.totalTrades} trades (7d)</span>
                <span className={`text-sm font-bold ${tradeStats.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  ${tradeStats.totalPnL.toFixed(2)} PnL
                </span>
                <span className="text-gray-400 text-sm">{tradeStats.winRate}% WR</span>
              </>
            ) : isLoadingTrades ? (
              <span className="text-yellow-400 text-sm animate-pulse">Carregando trades...</span>
            ) : (
              <span className="text-gray-500 text-sm">Sem dados de trades</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button onClick={handleToggleAuto}
              className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${autoEnabled ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-gray-700/50 text-gray-400 border border-gray-600/30'}`}>
              <Clock size={16} />
              Auto 24h {autoEnabled ? 'ON' : 'OFF'}
            </button>
            <button onClick={handleAnalyzeNow} disabled={isAnalyzing}
              className="px-5 py-2 rounded-xl bg-primary/20 text-primary border border-primary/30 text-sm font-bold flex items-center gap-2 hover:bg-primary/30 disabled:opacity-50 transition-all">
              {isAnalyzing ? <RefreshCw size={16} className="animate-spin" /> : <Zap size={16} />}
              {isAnalyzing ? 'Analisando...' : 'Analisar Agora'}
            </button>
          </div>
        </div>

        {autoEnabled && (
          <div className="mt-3 p-3 bg-green-500/10 rounded-xl border border-green-500/20">
            <p className="text-green-300 text-sm">
              ⏰ <strong>Modo Automático Ativo</strong> — A cada 24h o sistema analisa todos os perfis, calcula ajustes e aplica automaticamente.
              Cada perfil compete para maximizar lucros conforme sua personalidade de investidor.
            </p>
          </div>
        )}
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface rounded-2xl border border-card-border p-5 text-center">
          <div className="text-3xl font-black text-white">{activeProfilesCount}</div>
          <div className="text-sm text-gray-400 mt-1">Perfis Ativos</div>
        </div>
        <div className="bg-surface rounded-2xl border border-card-border p-5 text-center">
          <div className="text-3xl font-black text-white">{agents.filter(a => a.active).length}</div>
          <div className="text-sm text-gray-400 mt-1">Agentes IA</div>
        </div>
        <div className="bg-surface rounded-2xl border border-card-border p-5 text-center">
          <div className={`text-3xl font-black ${(profiles.reduce((s, p) => s + p.pnl, 0)) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            ${profiles.reduce((s, p) => s + p.pnl, 0).toFixed(2)}
          </div>
          <div className="text-sm text-gray-400 mt-1">PnL Total Perfis</div>
        </div>
        <div className="bg-surface rounded-2xl border border-card-border p-5 text-center">
          <div className="text-3xl font-black text-cyan-400">{totalChanges}</div>
          <div className="text-sm text-gray-400 mt-1">Ajustes Pendentes</div>
        </div>
      </div>

      {/* Profile Analysis Results */}
      {profileResults && profileResults.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Activity size={22} className="text-primary" /> Resultado da Análise por Perfil
            </h3>
            {totalChanges > 0 && (
              <button onClick={handleApplyAll}
                className="px-5 py-2 rounded-xl bg-green-500/20 text-green-400 border border-green-500/30 font-bold text-sm flex items-center gap-2 hover:bg-green-500/30">
                <CheckCircle size={16} /> Aplicar Todos ({totalChanges} ajustes)
              </button>
            )}
          </div>

          {/* Leaderboard */}
          <div className="bg-surface rounded-2xl border border-card-border p-5">
            <h4 className="text-lg font-bold text-yellow-400 flex items-center gap-2 mb-4">
              <Trophy size={20} /> Ranking de Competição — Quem lucra mais?
            </h4>
            {/* Header */}
            <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[11px] text-gray-500 uppercase font-bold border-b border-white/5 mb-2">
              <div className="col-span-3">Perfil</div>
              <div className="col-span-2 text-center">Capital Atual</div>
              <div className="col-span-2 text-center">Lucro / Perda</div>
              <div className="col-span-1 text-center">WR%</div>
              <div className="col-span-1 text-center">Melhor</div>
              <div className="col-span-1 text-center">Pior</div>
              <div className="col-span-2 text-center">Score</div>
            </div>
            <div className="space-y-1">
              {[...profileResults].sort((a, b) => b.currentMetrics.realPnL - a.currentMetrics.realPnL).map((r, idx) => (
                <div key={r.profileId} className={`grid grid-cols-12 gap-2 items-center p-3 rounded-xl transition-colors ${idx === 0 ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-black/20 hover:bg-white/5'}`}>
                  {/* Perfil */}
                  <div className="col-span-3 flex items-center gap-2">
                    <span className={`text-lg font-black ${idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-gray-300' : idx === 2 ? 'text-orange-400' : 'text-gray-500'}`}>
                      #{idx + 1}
                    </span>
                    {PROFILE_ICONS[r.profileId] || <Target size={18} />}
                    <div>
                      <span className="text-white font-bold text-sm">{r.profileName}</span>
                      {idx === 0 && <span className="ml-2 text-[10px] bg-yellow-500/30 text-yellow-300 px-1.5 py-0.5 rounded-full font-bold">🥇 TOP</span>}
                    </div>
                  </div>
                  {/* Capital Atual */}
                  <div className="col-span-2 text-center">
                    <span className="text-white font-bold text-sm">${r.currentMetrics.currentCapital.toFixed(2)}</span>
                  </div>
                  {/* Lucro / Perda */}
                  <div className="col-span-2 text-center">
                    <div className={`font-bold text-sm ${r.currentMetrics.realPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {r.currentMetrics.realPnL >= 0 ? '+' : ''}${r.currentMetrics.realPnL.toFixed(2)}
                    </div>
                    <div className={`text-[10px] ${r.currentMetrics.pnlPct >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {r.currentMetrics.pnlPct >= 0 ? '+' : ''}{r.currentMetrics.pnlPct.toFixed(1)}%
                    </div>
                  </div>
                  {/* Win Rate */}
                  <div className="col-span-1 text-center">
                    <span className={`font-bold text-sm ${r.currentMetrics.winRate >= 50 ? 'text-green-400' : r.currentMetrics.winRate > 0 ? 'text-red-400' : 'text-gray-500'}`}>
                      {r.currentMetrics.winRate.toFixed(0)}%
                    </span>
                  </div>
                  {/* Melhor Trade */}
                  <div className="col-span-1 text-center">
                    <span className="text-green-400 font-bold text-xs">
                      {r.currentMetrics.bestTrade > 0 ? `+$${r.currentMetrics.bestTrade.toFixed(1)}` : '-'}
                    </span>
                  </div>
                  {/* Pior Trade */}
                  <div className="col-span-1 text-center">
                    <span className="text-red-400 font-bold text-xs">
                      {r.currentMetrics.worstTrade < 0 ? `-$${Math.abs(r.currentMetrics.worstTrade).toFixed(1)}` : '-'}
                    </span>
                  </div>
                  {/* Score + Ajustes */}
                  <div className="col-span-2 flex items-center justify-center gap-2">
                    <div className={`px-2.5 py-1 rounded-full text-xs font-bold ${r.overallScore >= 65 ? 'bg-green-500/20 text-green-400' : r.overallScore >= 40 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                      {r.overallScore}
                    </div>
                    <span className="text-gray-500 text-[11px]">{r.suggestedChanges.length} ajustes</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Per-Profile Detail Cards */}
          {profileResults.map(result => (
            <div key={result.profileId}
              className={`rounded-2xl border ${PROFILE_COLORS[result.profileId] || 'border-gray-500/30 bg-gray-500/5'} overflow-hidden`}>
              {/* Profile Header */}
              <button onClick={() => toggleExpandProfile(result.profileId)}
                className="w-full flex items-center justify-between p-5 hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-xl bg-black/30">
                    {PROFILE_ICONS[result.profileId] || <Target size={20} />}
                  </div>
                  <div className="text-left">
                    <h4 className="text-xl font-bold text-white">{result.profileName}</h4>
                    <p className="text-sm text-gray-400">{result.riskLevel} • {result.suggestedChanges.length} ajustes sugeridos</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className={`text-lg font-bold ${result.currentMetrics.realPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {result.currentMetrics.realPnL >= 0 ? '+' : ''}${result.currentMetrics.realPnL.toFixed(2)}
                    </div>
                    <div className={`text-xs ${result.currentMetrics.pnlPct >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {result.currentMetrics.pnlPct >= 0 ? '+' : ''}{result.currentMetrics.pnlPct.toFixed(1)}% • Capital: ${result.currentMetrics.currentCapital.toFixed(2)}
                    </div>
                  </div>
                  <div className={`px-3 py-1.5 rounded-full text-sm font-bold ${result.overallScore >= 65 ? 'bg-green-500/20 text-green-400' : result.overallScore >= 40 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                    {result.overallScore}
                  </div>
                  {expandedProfiles.has(result.profileId) ? <ChevronUp className="text-gray-400" /> : <ChevronDown className="text-gray-400" />}
                </div>
              </button>

              {/* Expanded Content */}
              {expandedProfiles.has(result.profileId) && (
                <div className="p-5 border-t border-white/10 space-y-4">
                  {/* Current Metrics */}
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                    <div className="bg-black/30 p-3 rounded-xl text-center">
                      <div className="text-lg font-bold text-white">{result.currentMetrics.leverage}x</div>
                      <div className="text-xs text-gray-400">Leverage</div>
                    </div>
                    <div className="bg-black/30 p-3 rounded-xl text-center">
                      <div className="text-lg font-bold text-white">${result.currentMetrics.marginPerTrade}</div>
                      <div className="text-xs text-gray-400">Margem/Trade</div>
                    </div>
                    <div className="bg-black/30 p-3 rounded-xl text-center">
                      <div className="text-lg font-bold text-red-400">{result.currentMetrics.stopLoss}%</div>
                      <div className="text-xs text-gray-400">Stop Loss</div>
                    </div>
                    <div className="bg-black/30 p-3 rounded-xl text-center">
                      <div className="text-lg font-bold text-green-400">{result.currentMetrics.takeProfit}%</div>
                      <div className="text-xs text-gray-400">Take Profit</div>
                    </div>
                    <div className="bg-black/30 p-3 rounded-xl text-center">
                      <div className="text-lg font-bold text-cyan-400">{result.currentMetrics.confidenceThreshold}%</div>
                      <div className="text-xs text-gray-400">Threshold</div>
                    </div>
                  </div>

                  {/* Reasoning */}
                  {result.reasoning.length > 0 && (
                    <div className="bg-black/20 rounded-xl p-4">
                      <h5 className="text-sm font-bold text-gray-300 mb-2">📝 Análise do Agente IA:</h5>
                      <div className="space-y-1">
                        {result.reasoning.map((r, i) => (
                          <p key={i} className="text-sm text-gray-400">{r}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suggested Changes */}
                  {result.suggestedChanges.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="text-sm font-bold text-white flex items-center gap-2">
                        <Settings size={16} className="text-primary" /> Ajustes Sugeridos para {result.profileName}:
                      </h5>
                      {result.suggestedChanges.map((change, i) => (
                        <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border ${change.impact === 'positive' ? 'bg-green-500/5 border-green-500/20' : change.impact === 'warning' ? 'bg-yellow-500/5 border-yellow-500/20' : 'bg-gray-500/5 border-gray-500/20'}`}>
                          <button onClick={() => toggleProfileChange(result.profileId, change.field)}
                            className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all shrink-0 ${change.selected ? 'bg-primary border-primary' : 'bg-transparent border-gray-600'}`}>
                            {change.selected && <Check size={14} className="text-white" />}
                          </button>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-white font-bold text-sm">{change.fieldLabel}:</span>
                              <span className="text-red-400 text-sm line-through">{change.currentValue}{change.field === 'leverage' ? 'x' : change.field.includes('Loss') || change.field.includes('Profit') || change.field.includes('confidence') ? '%' : ''}</span>
                              <ArrowRight size={14} className="text-gray-500" />
                              <span className="text-green-400 font-bold text-sm">{change.newValue}{change.field === 'leverage' ? 'x' : change.field.includes('Loss') || change.field.includes('Profit') || change.field.includes('confidence') ? '%' : ''}</span>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">{change.reason}</p>
                          </div>
                        </div>
                      ))}

                      <button onClick={() => handleApplyProfileChanges(result)}
                        disabled={result.suggestedChanges.filter(c => c.selected).length === 0}
                        className="mt-2 w-full py-3 rounded-xl bg-primary/20 text-primary font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary/30 disabled:opacity-30 transition-all">
                        <CheckCircle size={16} /> Aplicar Ajustes Selecionados em {result.profileName}
                      </button>
                    </div>
                  )}

                  {result.suggestedChanges.length === 0 && (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center">
                      <p className="text-green-400 font-bold">✅ Perfil otimizado! Nenhum ajuste necessário.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {(!profileResults || profileResults.length === 0) && !isAnalyzing && (
        <div className="bg-surface rounded-2xl border border-card-border p-10 text-center">
          <Brain size={48} className="text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-400 mb-2">Pronto para Analisar</h3>
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            Clique em <strong>"Analisar Agora"</strong> para que os agentes IA analisem cada perfil de investimento e sugiram ajustes específicos.
            Cada perfil compete como um investidor diferente para maximizar lucros.
          </p>
        </div>
      )}

      {/* Legacy Agents Section (collapsed) */}
      <details className="bg-surface rounded-2xl border border-card-border overflow-hidden">
        <summary className="p-4 cursor-pointer hover:bg-white/5 flex items-center gap-3 text-gray-400">
          <Bot size={20} />
          <span className="font-bold">Agentes Internos (Motor PDCA)</span>
          <span className="text-xs text-gray-500 ml-auto">{agents.filter(a => a.active).length} ativos</span>
        </summary>
        <div className="p-4 border-t border-card-border grid grid-cols-1 md:grid-cols-2 gap-4">
          {agents.map(agent => (
            <div key={agent.id} className={`bg-black/20 rounded-xl p-4 border ${agent.active ? 'border-green-500/20' : 'border-white/5 opacity-60'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Bot size={18} className={agent.active ? 'text-green-400' : 'text-gray-600'} />
                  <span className="text-white font-bold">{agent.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${PHASE_COLORS[agent.phase]}`}>{agent.phase}</span>
                  <button onClick={() => { resetAgent(agent.id); }} title="Resetar agente"
                    className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-yellow-400 transition-colors">
                    <RotateCcw size={14} />
                  </button>
                  <button onClick={() => { toggleAgent(agent.id); }} title={agent.active ? 'Desativar agente' : 'Ativar agente'}
                    className={`p-1.5 rounded-lg transition-colors ${agent.active ? 'bg-green-500/20 text-green-400 hover:bg-red-500/20 hover:text-red-400' : 'bg-gray-700/50 text-gray-500 hover:bg-green-500/20 hover:text-green-400'}`}>
                    <Power size={14} />
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-2">{agent.strategy}</p>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                  <div className="text-sm font-bold text-white">{agent.cycles}</div>
                  <div className="text-[10px] text-gray-500">Ciclos</div>
                </div>
                <div>
                  <div className={`text-sm font-bold ${agent.winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>{agent.winRate.toFixed(0)}%</div>
                  <div className="text-[10px] text-gray-500">Win Rate</div>
                </div>
                <div>
                  <div className={`text-sm font-bold ${agent.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>${agent.totalPnL.toFixed(2)}</div>
                  <div className="text-[10px] text-gray-500">PnL</div>
                </div>
                <div>
                  <div className="text-sm font-bold text-cyan-400">{agent.sharpeRatio.toFixed(2)}</div>
                  <div className="text-[10px] text-gray-500">Sharpe</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
