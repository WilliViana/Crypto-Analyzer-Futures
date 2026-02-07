
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StrategyType, StrategyProfile, LogEntry, MarketData, Language, Exchange, Trade, RealAccountData, AdvancedIndicators, OrderRequest } from './types';
import Sidebar from './components/Sidebar';
import StrategyCard from './components/StrategyCard';
import AuditLog from './components/AuditLog';
import WalletDashboard from './components/WalletDashboard';
import ExchangeManager from './components/ExchangeManager';
import LoginScreen from './components/LoginScreen';
import AdminPanel from './components/AdminPanel';
import TradeHistory from './components/TradeHistory';
import OrderForm from './components/OrderForm';
import Backtest from './components/Backtest';
import DashboardOverview from './components/DashboardOverview';
import StrategyModal from './components/StrategyModal';
import SymbolSelector from './components/SymbolSelector';
import ChatBot from './components/ChatBot';
import AnalysisView from './components/AnalysisView';

import { fetchHistoricalCandles } from './services/marketService';
import { fetchRealAccountData, executeOrder, fetchMarketInfo } from './services/exchangeService';
import { unifiedTechnicalAnalysis } from './utils/technicalAnalysis';
import { supabase } from './services/supabaseClient';
import { loadAllUserData, saveExchange, deleteExchange, saveStrategy, saveUserSettings } from './services/syncService';
import { useNotification } from './contexts/NotificationContext';
import { Play, Square, Settings, Loader2 } from 'lucide-react';

const BATCH_SIZE = 15;

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

  useEffect(() => {
    const savedProfiles = localStorage.getItem('cap_profiles');
    if (savedProfiles) {
      try { setProfiles(JSON.parse(savedProfiles)); } catch (e) { }
    }
  }, []);

  // Auto-save profiles to localStorage and Supabase
  const initialLoadRef = React.useRef(true);
  useEffect(() => {
    localStorage.setItem('cap_profiles', JSON.stringify(profiles));

    // Skip saving during initial load to avoid overwriting with defaults
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      return;
    }

    // Save to Supabase if authenticated
    if (session?.user?.id && profiles.length > 0) {
      profiles.forEach(profile => {
        saveStrategy(session.user.id, profile).catch(err =>
          console.error('[SYNC] Save profile error:', err)
        );
      });
    }
  }, [profiles, session]);

  // Auto-save selectedPairs to Supabase
  useEffect(() => {
    if (session?.user?.id && selectedPairs.length > 0 && !initialLoadRef.current) {
      saveUserSettings(session.user.id, { selectedPairs }).catch(err =>
        console.error('[SYNC] Save settings error:', err)
      );
    }
  }, [selectedPairs, session]);

  useEffect(() => {
    let mounted = true;
    let dataLoaded = false; // Prevent duplicate loading

    // Function to load user data from Supabase
    const loadUserDataAndSetState = async (userSession: any) => {
      if (!mounted || !userSession || dataLoaded) return;
      dataLoaded = true; // Mark as loading

      console.log('[AUTH] Loading data for user:', userSession.user.id);
      setSession(userSession);
      setIsAuthenticated(true);

      try {
        const userData = await loadAllUserData(userSession.user.id);
        console.log('[AUTH] Loaded:', {
          exchanges: userData.exchanges.length,
          strategies: userData.strategies.length
        });

        if (mounted) {
          if (userData.exchanges.length > 0) setExchanges(userData.exchanges);
          if (userData.strategies.length > 0) setProfiles(userData.strategies);
          if (userData.trades.length > 0) setTrades(userData.trades);
          if (userData.settings?.selectedPairs?.length > 0) setSelectedPairs(userData.settings.selectedPairs);
          setLoading(false);
        }
      } catch (err) {
        console.error('[AUTH] Load error:', err);
        if (mounted) setLoading(false);
      }
    };

    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          if (session) {
            await loadUserDataAndSetState(session);
          } else {
            setLoading(false);
          }
        }
      } catch (error) {
        console.error('[AUTH] Init error:', error);
        if (mounted) setLoading(false);
      }
    };

    initSession();

    // Listen for auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AUTH] State change:', event, session?.user?.email);

      if (event === 'SIGNED_IN' && session && !dataLoaded) {
        await loadUserDataAndSetState(session);
      } else if (event === 'SIGNED_OUT') {
        dataLoaded = false;
        setSession(null);
        setIsAuthenticated(false);
        setExchanges([]);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const loadMarketInfo = async () => {
      const activeExchange = exchanges.find(e => e.status === 'CONNECTED');
      if (activeExchange) {
        const { pairs, quoteAssets } = await fetchMarketInfo(activeExchange);
        if (pairs.length > 0) {
          setAllMarketPairs(pairs);
          setAvailableQuotes(quoteAssets);
          if (selectedPairs.length <= 1) setSelectedPairs(['BTCUSDT']);
        }
      }
    };
    if (isAuthenticated) loadMarketInfo();
  }, [isAuthenticated, exchanges]);

  useEffect(() => {
    if (isRunning) {
      const scanMarket = async () => {
        try {
          const activeExchange = exchanges.find(e => e.status === 'CONNECTED');
          if (!activeExchange || selectedPairs.length === 0) {
            setIsRunning(false);
            return;
          }

          if (profileIndex >= profiles.length) {
            const nextBatch = assetBatchIndex + BATCH_SIZE;
            if (nextBatch >= selectedPairs.length) {
              setAssetBatchIndex(0);
              addLog("CICLO: Varredura concluída.", "SYSTEM");
            } else {
              setAssetBatchIndex(nextBatch);
            }
            setProfileIndex(0);
            return;
          }

          const currentProfile = profiles[profileIndex];
          if (!currentProfile.active) { setProfileIndex(p => p + 1); return; }

          const currentBatch = selectedPairs.slice(assetBatchIndex, assetBatchIndex + BATCH_SIZE);
          for (const symbol of currentBatch) {
            const candles = await fetchHistoricalCandles(symbol, '15m');
            if (!candles || candles.length < 50) continue;

            const analysis = unifiedTechnicalAnalysis(candles, currentProfile);

            if (analysis.signal && analysis.signal !== 'NEUTRAL' && analysis.confidence >= currentProfile.confidenceThreshold) {
              const side = analysis.signal;
              addLog(`GATILHO: ${symbol} ${side} (${analysis.confidence.toFixed(1)}%)`, 'SUCCESS');

              const price = candles[candles.length - 1].close;
              const sl = side === 'BUY' ? price * (1 - currentProfile.stopLoss / 100) : price * (1 + currentProfile.stopLoss / 100);
              const tp = side === 'BUY' ? price * (1 + currentProfile.takeProfit / 100) : price * (1 - currentProfile.takeProfit / 100);

              executeOrder({
                symbol, side, type: 'MARKET', quantity: 0, leverage: currentProfile.leverage,
                stopLossPrice: sl, takeProfitPrice: tp
              }, activeExchange, currentProfile.name).then(res => {
                if (res.success) {
                  addLog(`AUTO: Ordem executada em ${symbol}.`, 'SUCCESS');
                  fetchRealData();
                }
              });
            }
          }
          setProfileIndex(p => p + 1);
        } catch (error: any) { }
      };
      scanIntervalRef.current = setInterval(scanMarket, 8000);
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
    if (isAuthenticated) {
      fetchRealData();
      const i = setInterval(fetchRealData, 15000); // Poll every 15 seconds
      return () => clearInterval(i);
    }
  }, [isAuthenticated, fetchRealData]);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardOverview lang={lang} totalBalance={realPortfolio.totalBalance} unrealizedPnL={realPortfolio.unrealizedPnL} assets={realPortfolio.assets} trades={trades} profiles={profiles} exchanges={exchanges} onRefresh={fetchRealData} />;
      case 'settings':
        return <ExchangeManager exchanges={exchanges} setExchanges={setExchanges} lang={lang} addLog={addLog} />;
      case 'strategies':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
            {profiles.map(p => (
              <StrategyCard
                key={p.id}
                profile={p}
                lang={lang}
                onEdit={setEditingProfile}
                onToggle={(id) => setProfiles(prev => prev.map(x => x.id === id ? { ...x, active: !x.active } : x))}
                onDelete={(id) => { if (window.confirm('Deseja realmente excluir este perfil?')) setProfiles(prev => prev.filter(x => x.id !== id)); }}
                trades={trades}
              />
            ))}
            <StrategyCard isAddButton={true} onAdd={() => setEditingProfile(INITIAL_PROFILES_BASE[0])} lang={lang} profile={profiles[0]} onEdit={() => { }} onToggle={() => { }} />
          </div>
        );
      case 'analysis':
        return <AnalysisView exchanges={exchanges} realBalance={realPortfolio.totalBalance} availablePairs={allMarketPairs} />;
      case 'logs': return <AuditLog logs={logs} />;
      case 'wallet': return <WalletDashboard lang={lang} realPortfolio={realPortfolio} exchanges={exchanges} onRefresh={fetchRealData} />;
      case 'history': return <TradeHistory trades={trades} lang={lang} />;
      case 'backtest': return <Backtest profiles={profiles} lang={lang} />;
      case 'admin': return <AdminPanel lang={lang} />;
      default: return <div className="text-white p-10">Interface {activeTab} em carregamento...</div>;
    }
  };

  if (loading) return <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  if (!isAuthenticated) return <LoginScreen onLogin={() => setIsAuthenticated(true)} lang={lang} setLang={setLang} />;

  return (
    <div className="flex h-screen bg-background text-gray-200 overflow-hidden font-sans relative">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} lang={lang} isAdmin={userRole === 'admin'} onLogout={() => setIsAuthenticated(false)} />
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="h-16 border-b border-card-border bg-[#151A25]/80 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-10">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-white hidden md:block uppercase tracking-tighter">CAP.PRO Terminal</h1>
            <button onClick={() => setShowPairSelector(true)} className="p-2 bg-[#2A303C] hover:bg-[#353C4B] text-gray-300 rounded-lg flex items-center gap-2">
              <Settings size={18} />
              <span className="hidden md:inline text-xs font-bold uppercase">ATIVOS ({selectedPairs.length})</span>
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-gray-500 font-mono hidden md:block">
              Motor: {isRunning ? 'EXECUTANDO' : 'PAUSADO'}
            </div>
            <button onClick={() => setIsRunning(!isRunning)} className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${isRunning ? 'bg-red-500/10 text-red-500 border border-red-500/50' : 'bg-green-500 text-white'}`}>
              {isRunning ? <Square size={14} /> : <Play size={14} />}
              <span>{isRunning ? 'PARAR' : 'INICIAR'}</span>
            </button>
          </div>
        </header>

        <div className="flex-1 flex flex-col overflow-y-auto p-4 lg:p-6 scrollbar-hide">
          {renderContent()}
        </div>
      </main>
      {editingProfile && <StrategyModal profile={editingProfile} onClose={() => setEditingProfile(null)} onSave={(newP) => { setProfiles(prev => prev.map(p => p.id === newP.id ? newP : p)); setEditingProfile(null); }} />}
      {showPairSelector && <SymbolSelector allPairs={allMarketPairs} availableQuotes={availableQuotes} selectedSymbols={selectedPairs} onClose={() => setShowPairSelector(false)} onSave={(newSelection) => { setSelectedPairs(newSelection); setShowPairSelector(false); addLog(`SISTEMA: Lista de ativos atualizada.`, 'INFO'); }} />}
      <ChatBot lang={lang} marketData={{ price: 0, change24h: 0, rsi: 50, macd: 0, bollingerState: 'Middle', volume: 0, vwap: 0, atr: 0, stochasticK: 50, stochasticD: 50, macdSignal: 0, macdHist: 0 }} symbol="BTC" />
    </div>
  );
}
