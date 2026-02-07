import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StrategyType, StrategyProfile, LogEntry, MarketData, Language, Exchange, Trade, RealAccountData, AdvancedIndicators } from './types';
import Sidebar from './components/Sidebar';
import StrategyCard from './components/StrategyCard';
import AuditLog from './components/AuditLog';
import WalletDashboard from './components/WalletDashboard';
import ExchangeManager from './components/ExchangeManager';
import LoginScreen from './components/LoginScreen';
import AdminPanel from './components/AdminPanel';
import TradeHistory from './components/TradeHistory';
import Backtest from './components/Backtest';
import DashboardOverview from './components/DashboardOverview';
import StrategyModal from './components/StrategyModal';
import SymbolSelector from './components/SymbolSelector';
import AnalysisView from './components/AnalysisView';

import { fetchHistoricalCandles } from './services/marketService';
import { fetchRealAccountData, executeOrder, fetchMarketInfo } from './services/exchangeService';
import { unifiedTechnicalAnalysis } from './utils/technicalAnalysis';
import { supabase } from './services/supabaseClient';
import { loadAllUserData, saveStrategy, saveExchange, saveTrade, saveUserSettings } from './services/syncService';
import { useNotification } from './contexts/NotificationContext';
import { Play, Square, Settings, Loader2 } from 'lucide-react';

const BATCH_SIZE = 20;

// ... (MANTENHA OS CONSTS DEFAULT_INDICATORS E INITIAL_PROFILES_BASE IGUAIS) ...
const DEFAULT_INDICATORS: AdvancedIndicators = {
  rsi: { enabled: true, period: 14, thresholdLow: 30, thresholdHigh: 70, weight: 20 },
  macd: { enabled: true, weight: 15 },
  stochastic: { enabled: false, weight: 10 },
  bollinger: { enabled: true, weight: 15 },
  ichimoku: { enabled: false, weight: 20 },
  sar: { enabled: false, weight: 10 },
  cci: { enabled: false, weight: 10 },
  volume: { enabled: true, weight: 10 }
};

const INITIAL_PROFILES_BASE: StrategyProfile[] = [
  { id: StrategyType.SAFE, name: 'Seguro', description: 'Baixo Risco', icon: 'shield', color: 'blue', riskLevel: 'Low', confidenceThreshold: 80, leverage: 2, capital: 100.00, pnl: 0, trades: 0, winRate: 0, active: false, stopLoss: 2, takeProfit: 5, maxDrawdown: 5, workflowSteps: ['Trend Check', 'Low Volatility'], indicators: DEFAULT_INDICATORS, useDivergences: false, useCandlePatterns: false },
  { id: StrategyType.MODERATE, name: 'Moderado', description: 'Médio Risco', icon: 'scale', color: 'yellow', riskLevel: 'Med', confidenceThreshold: 65, leverage: 5, capital: 100.00, pnl: 0, trades: 0, winRate: 0, active: true, stopLoss: 5, takeProfit: 10, maxDrawdown: 10, workflowSteps: ['Trend Follow', 'RSI Check'], indicators: DEFAULT_INDICATORS, useDivergences: true, useCandlePatterns: false },
  { id: StrategyType.BOLD, name: 'Ousado', description: 'Alto Risco', icon: 'rocket', color: 'orange', riskLevel: 'High', confidenceThreshold: 50, leverage: 10, capital: 100.00, pnl: 0, trades: 0, winRate: 0, active: false, stopLoss: 10, takeProfit: 20, maxDrawdown: 20, workflowSteps: ['Breakout', 'High Volatility'], indicators: DEFAULT_INDICATORS, useDivergences: true, useCandlePatterns: true },
  { id: StrategyType.SPECIALIST, name: 'Especialista', description: 'Expert', icon: 'target', color: 'purple', riskLevel: 'Expert', confidenceThreshold: 85, leverage: 20, capital: 100.00, pnl: 0, trades: 0, winRate: 0, active: false, stopLoss: 5, takeProfit: 15, maxDrawdown: 15, workflowSteps: ['Fibonacci', 'Order Flow'], indicators: DEFAULT_INDICATORS, useDivergences: true, useCandlePatterns: true },
  { id: StrategyType.ALPHA, name: 'Alpha Predator', description: 'Extremo', icon: 'zap', color: 'red', riskLevel: 'Extreme', confidenceThreshold: 50, leverage: 50, capital: 100.00, pnl: 0, trades: 0, winRate: 0, active: true, stopLoss: 2, takeProfit: 4, maxDrawdown: 30, workflowSteps: ['HFT Algo', 'Liquidation Hunt'], indicators: DEFAULT_INDICATORS, useDivergences: true, useCandlePatterns: true },
  { id: 'NEW_STRAT', name: 'Nova Estrategia', description: 'Customizada', icon: 'sparkles', color: 'cyan', riskLevel: 'Custom', confidenceThreshold: 60, leverage: 10, capital: 100.00, pnl: 0, trades: 0, winRate: 0, active: false, stopLoss: 3, takeProfit: 6, maxDrawdown: 10, workflowSteps: ['Custom'], indicators: DEFAULT_INDICATORS, useDivergences: true, useCandlePatterns: true },
];

export default function App() {
  const { notify } = useNotification();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isRunning, setIsRunning] = useState(false);
  const [lang, setLang] = useState<Language>('pt');

  const [session, setSession] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'admin' | 'user'>('user');

  const [profiles, setProfiles] = useState<StrategyProfile[]>(INITIAL_PROFILES_BASE);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [realPortfolio, setRealPortfolio] = useState<RealAccountData>({ totalBalance: 0, unrealizedPnL: 0, assets: [], isSimulated: false });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [editingProfile, setEditingProfile] = useState<StrategyProfile | null>(null);

  const [allMarketPairs, setAllMarketPairs] = useState<any[]>([]);
  const [availableQuotes, setAvailableQuotes] = useState<string[]>([]);
  const [selectedPairs, setSelectedPairs] = useState<string[]>(['BTCUSDT']);
  const [showPairSelector, setShowPairSelector] = useState(false);

  const [profileIndex, setProfileIndex] = useState(0);
  const [assetBatchIndex, setAssetBatchIndex] = useState(0);

  const scanIntervalRef = useRef<any>(null);

  const addLog = useCallback((message: string, level: LogEntry['level'] = 'INFO') => {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString('pt-BR'),
      level,
      message
    };
    setLogs(prev => [...prev.slice(-99), newLog]);
  }, []);

  // --- PERSISTÊNCIA ---
  useEffect(() => {
    const saved = localStorage.getItem('botState');
    if (saved) {
      try { const p = JSON.parse(saved); setProfileIndex(p.pIndex || 0); setAssetBatchIndex(p.aIndex || 0); }
      catch (e) { }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('botState', JSON.stringify({ pIndex: profileIndex, aIndex: assetBatchIndex }));
  }, [profileIndex, assetBatchIndex]);

  // --- AUTH ---
  useEffect(() => {
    let mounted = true;
    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted && session) {
          setSession(session);
          setIsAuthenticated(true);
          // SYNC: Load all data from Supabase
          const userData = await loadAllUserData(session.user.id);
          if (userData.exchanges.length > 0) setExchanges(userData.exchanges);
          if (userData.strategies.length > 0) setProfiles(userData.strategies);
          if (userData.trades.length > 0) setTrades(userData.trades);
          if (userData.settings.selectedPairs.length > 0) setSelectedPairs(userData.settings.selectedPairs);
          addLog('[SYNC] Dados carregados do servidor.', 'INFO');
        }
        if (mounted) setLoading(false);
      } catch (error) { setLoading(false); }
    };
    initSession();
    return () => { mounted = false; };
  }, []);

  // --- LOAD MARKET ---
  useEffect(() => {
    const loadMarketInfo = async () => {
      const activeExchange = exchanges.find(e => e.status === 'CONNECTED');
      if (activeExchange) {
        const { pairs, quoteAssets } = await fetchMarketInfo(activeExchange);
        if (pairs.length > 0) {
          setAllMarketPairs(pairs);
          setAvailableQuotes(quoteAssets);
          if (selectedPairs.length <= 1) setSelectedPairs(['BTCUSDT']);
          addLog(`Mercado carregado: ${pairs.length} ativos.`, 'INFO');
        }
      }
    };
    if (isAuthenticated) loadMarketInfo();
  }, [isAuthenticated, exchanges]);

  // --- SCANNER AUTOMÁTICO (CORRIGIDO) ---
  useEffect(() => {
    if (isRunning) {
      const scanMarket = async () => {
        try {
          if (selectedPairs.length === 0 || !exchanges.some(e => e.status === 'CONNECTED')) {
            addLog("AVISO: Sistema pausado. Sem pares ou corretora.", "WARN");
            setIsRunning(false); return;
          }
          const activeExchange = exchanges.find(e => e.status === 'CONNECTED');

          // 1. Controle de Ciclos (Perfil -> Lote)
          if (profileIndex >= profiles.length) {
            const nextBatch = assetBatchIndex + BATCH_SIZE;
            if (nextBatch >= selectedPairs.length) {
              setAssetBatchIndex(0); // Reinicia
              addLog("CICLO COMPLETO: Reiniciando varredura.", "SYSTEM");
            } else {
              setAssetBatchIndex(nextBatch);
            }
            setProfileIndex(0);
            return; // Aguarda próximo tick
          }

          const currentProfile = profiles[profileIndex];
          // Sempre incrementa o index no final, mesmo se inativo, para não travar

          if (!currentProfile.active) {
            setProfileIndex(p => p + 1);
            return;
          }

          const currentBatch = selectedPairs.slice(assetBatchIndex, assetBatchIndex + BATCH_SIZE);
          if (currentBatch.length === 0) {
            setProfileIndex(p => p + 1);
            return;
          }

          // --- LOG DE AUDITORIA EXPLÍCITO ---
          const profileEmoji = currentProfile.riskLevel === 'Low' ? '🛡️' :
            currentProfile.riskLevel === 'Med' ? '⚖️' :
              currentProfile.riskLevel === 'High' ? '🚀' :
                currentProfile.riskLevel === 'Expert' ? '🎯' :
                  currentProfile.riskLevel === 'Extreme' ? '⚡' : '📊';

          const batchStart = assetBatchIndex;
          const batchEnd = assetBatchIndex + currentBatch.length;
          const totalAssets = selectedPairs.length;

          addLog(`${profileEmoji} ${currentProfile.name.toUpperCase()} - Analisando ${batchStart} a ${batchEnd} de ${totalAssets} ativos (Limiar: ${currentProfile.confidenceThreshold}%)`, 'SYSTEM');

          // 2. Análise Técnica
          let opportunities = 0;
          let analyzed = 0;

          for (const symbol of currentBatch) {
            const candles = await fetchHistoricalCandles(symbol, '15m');
            if (!candles || candles.length < 50) {
              addLog(`⚠️ ${symbol}: Dados insuficientes - Ignorado`, 'WARN');
              continue;
            }

            analyzed++;
            const analysis = unifiedTechnicalAnalysis(candles, currentProfile);
            const currentPrice = candles[candles.length - 1].close;

            // Log detalhado mostrando estado claro
            const confidenceStr = analysis.confidence.toFixed(0);
            const thresholdStr = currentProfile.confidenceThreshold.toString();
            const isOpportunity = analysis.signal && analysis.signal !== 'NEUTRAL' && analysis.confidence >= currentProfile.confidenceThreshold;

            if (isOpportunity) {
              opportunities++;
              const side = analysis.signal.includes('BUY') || analysis.signal === 'LONG' ? 'BUY' : 'SELL';
              const sideEmoji = side === 'BUY' ? '🟢 LONG' : '🔴 SHORT';

              addLog(`✅ IDENTIFICADO - ${symbol} ${sideEmoji} | Confiança: ${confidenceStr}% | Preço: $${currentPrice.toFixed(2)}`, 'SUCCESS');
              addLog(`   📋 Razões: ${analysis.reasons.join(', ')}`, 'INFO');

              if (activeExchange) {
                const price = currentPrice;
                const sl = side === 'BUY' ? price * (1 - currentProfile.stopLoss / 100) : price * (1 + currentProfile.stopLoss / 100);
                const tp = side === 'BUY' ? price * (1 + currentProfile.takeProfit / 100) : price * (1 - currentProfile.takeProfit / 100);
                const positionValue = 10; // Default $10 position

                addLog(`🚀 ABRINDO ORDEM: ${symbol} @ $${price.toFixed(2)} | Valor: $${positionValue} | Alav: ${currentProfile.leverage}x`, 'SYSTEM');
                addLog(`   📍 SL: $${sl.toFixed(2)} | TP: $${tp.toFixed(2)}`, 'INFO');

                executeOrder({
                  symbol, side, type: 'MARKET', quantity: 0, leverage: currentProfile.leverage,
                  stopLossPrice: sl, takeProfitPrice: tp
                }, activeExchange, currentProfile.name).then(res => {
                  if (res.success) {
                    addLog(`✅ ORDEM EXECUTADA: ${symbol} ${side} | ID: ${res.orderId} | Entry: $${price.toFixed(2)}`, 'SUCCESS');
                    notify('success', 'Ordem Automática', `${side} ${symbol} @ $${price.toFixed(2)}`);
                    fetchRealData();
                  } else {
                    addLog(`❌ ORDEM FALHOU: ${symbol} | Erro: ${res.message}`, 'ERROR');
                  }
                });
              }
            } else {
              // Log resumido para ativos sem oportunidade
              const signalIcon = analysis.signal === 'LONG' ? '↗️' : analysis.signal === 'SHORT' ? '↘️' : '➖';
              addLog(`${signalIcon} ${symbol}: ${analysis.signal || 'NEUTRAL'} (${confidenceStr}%/${thresholdStr}%) - Não atingiu limiar`, 'INFO');
            }
          }

          // Resumo do lote
          if (opportunities === 0) {
            addLog(`📊 ${currentProfile.name}: ${analyzed} ativos analisados - Nenhuma oportunidade identificada`, 'INFO');
          } else {
            addLog(`🎯 ${currentProfile.name}: ${opportunities} oportunidade(s) em ${analyzed} ativos analisados`, 'SUCCESS');
          }
          setProfileIndex(p => p + 1);
        } catch (error: any) {
          console.error("Scanner:", error);
          addLog(`Erro no Scanner: ${error.message}`, 'ERROR');
        }
      };
      scanIntervalRef.current = setInterval(scanMarket, 6000);
    } else {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    }
    return () => { if (scanIntervalRef.current) clearInterval(scanIntervalRef.current); };
  }, [isRunning, profileIndex, assetBatchIndex, profiles, selectedPairs, exchanges]);

  const fetchRealData = useCallback(async () => {
    const activeExchange = exchanges.find(e => e.status === 'CONNECTED');
    if (activeExchange) {
      const data = await fetchRealAccountData(activeExchange);
      setRealPortfolio(data);
    }
  }, [exchanges]);

  useEffect(() => {
    if (isAuthenticated) { fetchRealData(); const i = setInterval(fetchRealData, 10000); return () => clearInterval(i); }
  }, [isAuthenticated, fetchRealData]);

  const handleTestOrder = async () => {
    const activeExchange = exchanges.find(e => e.status === 'CONNECTED');
    if (!activeExchange) { notify('error', 'Erro', 'Conecte a Binance.'); return; }
    if (!confirm("Teste BTCUSDT agora?")) return;

    const res = await executeOrder({ symbol: 'BTCUSDT', side: 'BUY', type: 'MARKET', quantity: 0, leverage: 10 }, activeExchange, 'Manual');
    if (res.success) { notify('success', 'Sucesso', 'Ordem enviada'); addLog(`TESTE OK: ${res.orderId}`, 'SUCCESS'); }
    else { notify('error', 'Erro', res.message); addLog(`TESTE FALHA: ${res.message}`, 'ERROR'); }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardOverview lang={lang} totalBalance={realPortfolio.totalBalance} unrealizedPnL={realPortfolio.unrealizedPnL} assets={realPortfolio.assets} trades={trades} profiles={profiles} exchanges={exchanges} />;
      case 'settings': return <ExchangeManager exchanges={exchanges} setExchanges={setExchanges} lang={lang} addLog={addLog} />;
      case 'strategies': return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">{profiles.map(p => <StrategyCard key={p.id} profile={p} lang={lang} onEdit={setEditingProfile} onToggle={(id) => setProfiles(prev => prev.map(x => x.id === id ? { ...x, active: !x.active } : x))} trades={trades} />)}</div>;
      case 'logs': return <AuditLog logs={logs} />;
      case 'wallet': return <WalletDashboard lang={lang} realPortfolio={realPortfolio} trades={trades} exchanges={exchanges} />;
      case 'history': return <TradeHistory trades={trades} lang={lang} />;
      case 'backtest': return <Backtest profiles={profiles} lang={lang} />;
      case 'analysis':
        // PASSAGEM DE DADOS CORRETA
        return <AnalysisView exchanges={exchanges} realBalance={realPortfolio.totalBalance} availablePairs={allMarketPairs} />;
      case 'admin': return userRole === 'admin' ? <AdminPanel lang={lang} /> : <div className="text-white">Acesso Negado</div>;
      default: return <div className="text-white p-10">Em breve...</div>;
    }
  };

  const toggleRun = () => setIsRunning(!isRunning);
  const handleLogin = (email: string) => { setIsAuthenticated(true); setSession({ user: { email } }); };
  const handleLogout = () => { setIsAuthenticated(false); setSession(null); };

  if (loading) return <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  if (!isAuthenticated) return <LoginScreen onLogin={handleLogin} lang={lang} setLang={setLang} />;

  return (
    <div className="flex h-screen bg-background text-gray-200 overflow-hidden font-sans relative">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} lang={lang} isAdmin={userRole === 'admin'} onLogout={handleLogout} />
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="h-16 border-b border-card-border bg-[#151A25]/80 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-10">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-white hidden md:block uppercase tracking-tighter">Gemini Trader</h1>
            <button onClick={() => setShowPairSelector(true)} className="p-2 bg-[#2A303C] hover:bg-[#353C4B] text-gray-300 rounded-lg flex items-center gap-2">
              <Settings size={18} />
              <span className="hidden md:inline text-xs font-bold">ATIVOS ({selectedPairs.length})</span>
            </button>
            <button onClick={handleTestOrder} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-bold animate-pulse">TESTE ORDEM</button>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-gray-400 font-mono hidden md:block">Status: {isRunning ? `ON [${profiles[profileIndex]?.name}]` : 'OFF'}</div>
            <button onClick={toggleRun} className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all shadow-lg ${isRunning ? 'bg-red-500/10 text-red-500 border border-red-500/50' : 'bg-green-500 text-white hover:bg-green-400'}`}>
              {isRunning ? <Square size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
              <span>{isRunning ? 'PARAR' : 'INICIAR'}</span>
            </button>
          </div>
        </header>
        <div className="flex-1 flex flex-col overflow-y-auto p-4 lg:p-6 scrollbar-hide">
          {renderContent()}
        </div>
      </main>
      {editingProfile && <StrategyModal profile={editingProfile} onClose={() => setEditingProfile(null)} onSave={(newP) => { setProfiles(prev => prev.map(p => p.id === newP.id ? newP : p)); setEditingProfile(null); }} />}
      {showPairSelector && <SymbolSelector allPairs={allMarketPairs} availableQuotes={availableQuotes} selectedSymbols={selectedPairs} onClose={() => setShowPairSelector(false)} onSave={(newSelection) => { setSelectedPairs(newSelection); setShowPairSelector(false); addLog(`Ativos: ${newSelection.length}`, 'INFO'); }} />}
    </div>
  );
}