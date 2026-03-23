
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
import RiskManagement, { RiskMode } from './components/RiskManagement';
import DashboardOverview from './components/DashboardOverview';
import StrategyModal from './components/StrategyModal';
import SymbolSelector from './components/SymbolSelector';
import ChatBot from './components/ChatBot';
import AnalysisView from './components/AnalysisView';
import UserProfile from './components/UserProfile';
import InformationTab from './components/InformationTab';
import VPNManager from './components/VPNManager';
import VPNStatus from './components/VPNStatus';
import NotificationCenter from './components/NotificationCenter';
import PDCADashboard from './components/PDCADashboard';
import { initVPNService } from './services/vpnService';
import { initNotificationService, getUnreadCount } from './services/notificationService';
import { recordAgentTrade, initPDCAService } from './services/pdcaAgentService';

import { fetchHistoricalCandles } from './services/marketService';
import { fetchRealAccountData, executeOrder, fetchMarketInfo, callBinanceProxy, fetchSpotBalance } from './services/exchangeService';
import { unifiedTechnicalAnalysis } from './utils/technicalAnalysis';
import { quickTrendCheck } from './services/multiTimeframeService';
import { analyzeVolatility, type RiskProfile } from './utils/volatilityFilter';
import { calculateVPM, type ProfileRisk } from './utils/vpmCalculator';
import { analyzeSentimentThrottled, generateTradingRecommendation } from './services/sentimentService';
import { supabase } from './services/supabaseClient';
import { loadAllUserData, saveExchange, deleteExchange, saveStrategy, saveUserSettings } from './services/syncService';
import { useNotification } from './contexts/NotificationContext';
import { Play, Square, Settings, Loader2, LayoutDashboard, Wallet, History, Menu, Layers, LineChart, FileText, ShieldAlert, Bell } from 'lucide-react';

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
  { id: StrategyType.SAFE, name: 'Seguro', description: 'Baixo Risco', icon: 'shield', color: 'blue', riskLevel: 'Low', confidenceThreshold: 80, leverage: 2, capital: 100.00, currentCapital: 100.00, allocatedCapital: 0, marginPerTrade: 20, pnl: 0, trades: 0, winRate: 0, active: false, stopLoss: 2, takeProfit: 5, maxDrawdown: 5, workflowSteps: ['Trend Check', 'Low Volatility'], indicators: DEFAULT_INDICATORS, useDivergences: false, useCandlePatterns: false, priority: 1 },
  { id: StrategyType.MODERATE, name: 'Moderado', description: 'Médio Risco', icon: 'scale', color: 'yellow', riskLevel: 'Med', confidenceThreshold: 65, leverage: 5, capital: 100.00, currentCapital: 100.00, allocatedCapital: 0, marginPerTrade: 50, pnl: 0, trades: 0, winRate: 0, active: true, stopLoss: 5, takeProfit: 10, maxDrawdown: 10, workflowSteps: ['Trend Follow', 'RSI Check'], indicators: DEFAULT_INDICATORS, useDivergences: true, useCandlePatterns: false, priority: 2 },
  { id: StrategyType.BOLD, name: 'Ousado', description: 'Alto Risco', icon: 'rocket', color: 'orange', riskLevel: 'High', confidenceThreshold: 50, leverage: 10, capital: 100.00, currentCapital: 100.00, allocatedCapital: 0, marginPerTrade: 30, pnl: 0, trades: 0, winRate: 0, active: false, stopLoss: 10, takeProfit: 20, maxDrawdown: 20, workflowSteps: ['Breakout', 'High Volatility'], indicators: DEFAULT_INDICATORS, useDivergences: true, useCandlePatterns: true, priority: 3 },
  { id: StrategyType.SPECIALIST, name: 'Especialista', description: 'Expert', icon: 'target', color: 'purple', riskLevel: 'Expert', confidenceThreshold: 85, leverage: 20, capital: 100.00, currentCapital: 100.00, allocatedCapital: 0, marginPerTrade: 25, pnl: 0, trades: 0, winRate: 0, active: false, stopLoss: 5, takeProfit: 15, maxDrawdown: 15, workflowSteps: ['Fibonacci', 'Order Flow'], indicators: DEFAULT_INDICATORS, useDivergences: true, useCandlePatterns: true, priority: 4 },
  { id: StrategyType.ALPHA, name: 'Alpha Predator', description: 'Extremo', icon: 'zap', color: 'red', riskLevel: 'Extreme', confidenceThreshold: 50, leverage: 50, capital: 100.00, currentCapital: 100.00, allocatedCapital: 0, marginPerTrade: 20, pnl: 0, trades: 0, winRate: 0, active: true, stopLoss: 2, takeProfit: 4, maxDrawdown: 30, workflowSteps: ['HFT Algo', 'Liquidation Hunt'], indicators: DEFAULT_INDICATORS, useDivergences: true, useCandlePatterns: true, priority: 5 },
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

  // Meta diária de ganho
  const [dailyTargetPct, setDailyTargetPct] = useState<number>(() => {
    const saved = localStorage.getItem('cap_daily_target');
    return saved ? parseFloat(saved) : 10;
  });
  const [dailyStartBalance, setDailyStartBalance] = useState<number>(() => {
    // Recuperar saldo do dia atual se existir
    const today = new Date().toDateString();
    const savedDate = localStorage.getItem('cap_trading_date');
    if (savedDate === today) {
      const savedEquity = localStorage.getItem('cap_daily_start_equity');
      return savedEquity ? parseFloat(savedEquity) : 0;
    }
    return 0;
  });
  const [dailyTargetReached, setDailyTargetReached] = useState(false);
  const [showDailyTargetModal, setShowDailyTargetModal] = useState(false);
  const [spotBalance, setSpotBalance] = useState<number>(0);

  // Risk Management
  const [riskMode, setRiskMode] = useState<RiskMode>(() => {
    return (localStorage.getItem('cap_risk_mode') as RiskMode) || 'general';
  });
  const [dailyStopLossPct, setDailyStopLossPct] = useState<number>(() => {
    const saved = localStorage.getItem('cap_daily_stoploss');
    return saved ? parseFloat(saved) : 5;
  });
  const [consecutiveLosses, setConsecutiveLosses] = useState(0);
  const [circuitBreakerActive, setCircuitBreakerActive] = useState(false);

  const [allMarketPairs, setAllMarketPairs] = useState<any[]>([]);
  const [availableQuotes, setAvailableQuotes] = useState<string[]>([]);
  const [selectedPairs, setSelectedPairs] = useState<string[]>(['BTCUSDT']);
  const [showPairSelector, setShowPairSelector] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const [profileIndex, setProfileIndex] = useState(0);
  const [assetBatchIndex, setAssetBatchIndex] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  const scanIntervalRef = useRef<any>(null);
  const dragIdRef = useRef<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // Init services
  useEffect(() => {
    initVPNService();
    initNotificationService();
  }, []);

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

  // Track when initial data load completes to prevent auto-save during load
  const dataLoadedRef = React.useRef(false);
  const isLoadingRef = React.useRef(false);
  const lastUserIdRef = React.useRef<string | null>(null);
  const lastSavedProfilesRef = React.useRef<string>('');
  const lastSavedSettingsRef = React.useRef<string>('');

  // Auto-save profiles to localStorage and Supabase
  useEffect(() => {
    // Always save to localStorage
    localStorage.setItem('cap_profiles', JSON.stringify(profiles));

    // Skip saving to Supabase during initial load
    if (!dataLoadedRef.current || !session?.user?.id || profiles.length === 0) {
      return;
    }

    // Only save if profiles actually changed (prevent loop)
    const profilesJson = JSON.stringify(profiles.map(p => ({ id: p.id, active: p.active, name: p.name })));
    if (profilesJson === lastSavedProfilesRef.current) {
      return;
    }
    lastSavedProfilesRef.current = profilesJson;

    console.log('[SYNC] Saving profiles to Supabase...');
    profiles.forEach(profile => {
      saveStrategy(session.user.id, profile).catch(err =>
        console.error('[SYNC] Save profile error:', err)
      );
    });
  }, [profiles]);

  // Auto-save user settings (selectedPairs + isRunning) to Supabase
  useEffect(() => {
    if (!dataLoadedRef.current || !session?.user?.id) {
      return;
    }

    // Create settings object to check for changes
    const currentSettings = { selectedPairs, isRunning };
    const settingsJson = JSON.stringify(currentSettings);

    if (settingsJson === lastSavedSettingsRef.current) {
      return;
    }
    lastSavedSettingsRef.current = settingsJson;

    console.log('[SYNC] Saving settings to Supabase...', currentSettings);
    saveUserSettings(session.user.id, currentSettings).catch(err =>
      console.error('[SYNC] Save settings error:', err)
    );
  }, [selectedPairs, isRunning]);

  useEffect(() => {
    let mounted = true;
    let abortController: AbortController | null = null;
    let retryCount = 0;
    const MAX_RETRIES = 3;

    // Function to load user data from Supabase
    const loadUserDataAndSetState = async (userSession: any) => {
      if (!mounted || !userSession) return;
      if (isLoadingRef.current) { console.log('[AUTH] Already loading, skipping'); return; }
      isLoadingRef.current = true;

      // Cancel previous request if exists
      if (abortController) abortController.abort();
      abortController = new AbortController();
      const signal = abortController.signal;

      console.log('[AUTH] Loading data for user:', userSession.user.id);
      setSession(userSession);
      setIsAuthenticated(true);
      setLoading(true); // Ensure loading state is shown during fetch

      try {
        const userData = await loadAllUserData(userSession.user.id, signal);

        if (signal.aborted) return;

        if (mounted) {
          console.log('[AUTH] Loaded:', {
            exchanges: userData.exchanges.length,
            strategies: userData.strategies.length
          });

          if (userData.exchanges.length > 0) setExchanges(userData.exchanges);
          if (userData.strategies.length > 0) {
            // Auto-merge: adicionar perfis padrão faltantes
            const loadedIds = new Set(userData.strategies.map((s: any) => s.id));
            const missingDefaults = INITIAL_PROFILES_BASE.filter(dp => !loadedIds.has(dp.id));
            if (missingDefaults.length > 0) {
              console.log('[SYNC] Perfis padrão faltantes restaurados:', missingDefaults.map(d => d.name));
            }
            setProfiles([...userData.strategies, ...missingDefaults]);
          }
          if (userData.trades.length > 0) setTrades(userData.trades);
          if (userData.settings) {
            if (userData.settings.selectedPairs?.length > 0) setSelectedPairs(userData.settings.selectedPairs);
            if (userData.settings.isRunning !== undefined) setIsRunning(userData.settings.isRunning);
          }

          // Initialize lastSaved refs to prevent immediate re-save after load
          lastSavedProfilesRef.current = JSON.stringify(userData.strategies.map((p: any) => ({ id: p.id, active: p.active, name: p.name })));
          lastSavedSettingsRef.current = JSON.stringify({
            selectedPairs: userData.settings?.selectedPairs || ['BTCUSDT'],
            isRunning: userData.settings?.isRunning || false
          });

          // Mark data as loaded - this enables auto-save for future changes
          dataLoadedRef.current = true;
          retryCount = 0; // Reset retry count on success
          console.log('[AUTH] Data loaded, auto-save enabled');
          isLoadingRef.current = false;
          setLoading(false);
        }
      } catch (err: any) {
        if (signal.aborted) {
          console.log('[AUTH] Load aborted (cleanup)');
          return;
        }

        // If it's an AbortError but OUR signal is not aborted, it means external abort (network/system)
        // We SHOULD retry in this case
        const isAbortError = err.name === 'AbortError';

        console.error(`[AUTH] Load error (Abort: ${isAbortError}):`, err);

        // Retry logic
        if (retryCount < MAX_RETRIES && mounted) {
          retryCount++;
          isLoadingRef.current = false; // Allow retry
          console.log(`[AUTH] Retrying load (${retryCount}/${MAX_RETRIES})...`);
          setTimeout(() => loadUserDataAndSetState(userSession), 1500);
        } else if (mounted) {
          isLoadingRef.current = false;
          setLoading(false);
          notify('error', 'Erro de Conexão', 'Falha ao carregar dados. Verifique sua conexão.');
        }
      }
    };

    // Listen for auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AUTH] State change:', event, session?.user?.email);

      if (event === 'SIGNED_IN' && session) {
        // Debounce load to prevent dual-invocation or rapid refreshes
        if (!isAuthenticated || !dataLoadedRef.current || session.user.id !== lastUserIdRef.current) {
          console.log('[AUTH] Session valid. Scheduling data load...');
          lastUserIdRef.current = session.user.id;

          // Clear any pending timeouts if necessary, but here we just call the abortable loader
          loadUserDataAndSetState(session);
        }
      } else if (event === 'SIGNED_OUT') {
        if (abortController) abortController.abort();
        dataLoadedRef.current = false;
        lastUserIdRef.current = null;
        setSession(null);
        setIsAuthenticated(false);
        setExchanges([]);
        setLoading(false);
      }
    });

    // Check session on mount — use ref (not stale state) to avoid duplicate loads
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        if (!dataLoadedRef.current && !isLoadingRef.current) {
          console.log('[AUTH] Initial session check found user. Loading...');
          loadUserDataAndSetState(session);
        }
      } else {
        if (mounted) setLoading(false);
      }
    });

    return () => {
      mounted = false;
      if (abortController) abortController.abort();
      subscription.unsubscribe();
    };
  }, []);

  // Ref to track if we already loaded markets for the current exchange
  const loadedExchangeIdRef = useRef<string | null>(null);

  useEffect(() => {
    const loadMarketInfo = async () => {
      const activeExchange = exchanges.find(e => e.status === 'CONNECTED');

      // If no active exchange, or we already loaded for this specific exchange ID, skip
      if (!activeExchange) return;
      if (loadedExchangeIdRef.current === activeExchange.id && allMarketPairs.length > 0) return;

      console.log('[MARKET] Fetching market pairs for exchange:', activeExchange.name);
      const { pairs, quoteAssets } = await fetchMarketInfo(activeExchange);

      if (pairs.length > 0) {
        setAllMarketPairs(pairs);
        setAvailableQuotes(quoteAssets);
        loadedExchangeIdRef.current = activeExchange.id; // Mark as loaded

        if (selectedPairs.length <= 1) setSelectedPairs(['BTCUSDT']);
      }
    };

    if (isAuthenticated && exchanges.length > 0) {
      loadMarketInfo();
    }
  }, [isAuthenticated, exchanges]);

  // Refs for stable access inside scanMarket
  const profilesRef = useRef(profiles);
  const selectedPairsRef = useRef(selectedPairs);
  const exchangesRef = useRef(exchanges);
  profilesRef.current = profiles;
  selectedPairsRef.current = selectedPairs;
  exchangesRef.current = exchanges;

  const scanIndexRef = useRef({ profileIdx: 0, batchIdx: 0 });
  const openPositionsRef = useRef<Set<string>>(new Set());
  const profileMapRef = useRef<Record<string, string>>(
    (() => { try { return JSON.parse(localStorage.getItem('profileMap') || '{}'); } catch { return {}; } })()
  );

  useEffect(() => {
    if (!isRunning) {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
      return;
    }

    const scanMarket = async () => {
      try {
        const activeExchange = exchangesRef.current.find(e => e.status === 'CONNECTED');
        const pairs = selectedPairsRef.current;
        const allProfiles = [...profilesRef.current].sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));

        if (!activeExchange || pairs.length === 0) {
          console.warn('[MOTOR] Sem exchange conectada ou sem pares selecionados');
          setIsRunning(false);
          return;
        }

        const idx = scanIndexRef.current;

        // Fetch open positions to avoid duplicates
        let availableBalance = 0;
        try {
          const accountData = await callBinanceProxy('/fapi/v2/account', 'GET', {}, activeExchange);
          const positions = (accountData.positions || []).filter((p: any) => Math.abs(parseFloat(p.positionAmt)) > 0);
          openPositionsRef.current = new Set(positions.map((p: any) => p.symbol));
          availableBalance = parseFloat(accountData.availableBalance || '0');
        } catch (e) {
          // Keep previous positions set if fetch fails
        }

        // Reset profile cycle when done
        if (idx.profileIdx >= allProfiles.length) {
          const nextBatch = idx.batchIdx + BATCH_SIZE;
          if (nextBatch >= pairs.length) {
            idx.batchIdx = 0;
            addLog(`CICLO: Varredura concluída (${openPositionsRef.current.size} posições abertas). Reiniciando...`, "SYSTEM");
          } else {
            idx.batchIdx = nextBatch;
          }
          idx.profileIdx = 0;
          return;
        }

        const currentProfile = allProfiles[idx.profileIdx];
        if (!currentProfile || !currentProfile.active) {
          idx.profileIdx++;
          return;
        }

        const currentBatch = pairs.slice(idx.batchIdx, idx.batchIdx + BATCH_SIZE);

        if (currentBatch.length > 0) {
          addLog(`CICLO: Analisando ${currentBatch.length} ativos com perfil ${currentProfile.name}...`, 'INFO');
        }

        for (const symbol of currentBatch) {
          try {
            const candles = await fetchHistoricalCandles(symbol, '15m');
            if (!candles || candles.length < 50) {
              addLog(`AVISO: ${symbol} - Dados insuficientes (${candles?.length || 0} candles)`, 'WARNING');
              continue;
            }

            const analysis = unifiedTechnicalAnalysis(candles, currentProfile);

            if (analysis.signal && analysis.signal !== 'NEUTRAL' && analysis.confidence >= currentProfile.confidenceThreshold) {
              // Check if position already open for this symbol
              if (openPositionsRef.current.has(symbol)) {
                addLog(`SKIP: ${symbol} ${analysis.signal} (${analysis.confidence.toFixed(1)}%) - Já tem posição aberta`, 'WARNING');
                continue;
              }

              // Check if enough margin available (minimum $10 needed)
              if (availableBalance < 10) {
                addLog(`SKIP: Sem margem ($${availableBalance.toFixed(2)} disponível) - aguardando liberar capital`, 'WARNING');
                break;
              }

              // --- FILTRO 1: Quick Trend Check (1h) ---
              const trendOk = await quickTrendCheck(symbol, analysis.signal);
              if (!trendOk) {
                addLog(`SKIP [TREND]: ${symbol} ${analysis.signal} rejeitado — tendência 1h contrária`, 'WARNING');
                continue;
              }

              // --- FILTRO 2: Volatilidade por perfil ---
              const riskMap: Record<string, RiskProfile> = { 'Low': 'conservative', 'Med': 'moderate', 'High': 'aggressive', 'Expert': 'aggressive', 'Extreme': 'aggressive' };
              const riskProfile: RiskProfile = riskMap[currentProfile.riskLevel] || 'moderate';
              const volAnalysis = analyzeVolatility(candles, candles[candles.length - 1].close, riskProfile);
              if (volAnalysis.recommendation === 'SKIP') {
                addLog(`SKIP [VOL]: ${symbol} — ${volAnalysis.reasoning}`, 'WARNING');
                continue;
              }

              // --- ENVELOPE DE CAPITAL: verifica saldo livre do perfil ---
              const profileCurrentCapital = currentProfile.currentCapital ?? currentProfile.capital;
              if (profileCurrentCapital <= 0) {
                addLog(`⚠️ BANCA ZERADA [${currentProfile.name}]: Capital $${profileCurrentCapital.toFixed(2)}. Perfil desativado — adicione capital para reativar.`, 'ERROR');
                // Auto-desativar perfil com capital zerado
                setProfiles(prev => prev.map(p => p.id === currentProfile.id ? { ...p, active: false } : p));
                continue;
              }
              const allocated = currentProfile.allocatedCapital || 0;
              const freeCapital = Math.max(0, profileCurrentCapital - allocated);
              const desiredMargin = currentProfile.marginPerTrade || 20;
              // CRITICAL: nunca alocar mais que o capital livre
              const marginRequired = Math.min(desiredMargin, freeCapital);
              if (marginRequired < 10) {
                addLog(`SKIP [${currentProfile.name}]: Saldo insuficiente. Capital: $${profileCurrentCapital.toFixed(2)} | Alocado: $${allocated.toFixed(2)} | Livre: $${freeCapital.toFixed(2)} (mín $10)`, 'WARNING');
                continue;
              }
              addLog(`CAPITAL [${currentProfile.name}]: Total: $${profileCurrentCapital.toFixed(2)} | Alocado: $${allocated.toFixed(2)} | Livre: $${freeCapital.toFixed(2)} | Margem: $${marginRequired.toFixed(2)}`, 'INFO');

              // Check daily target
              if (dailyTargetReached) {
                addLog(`SKIP: Meta diária de ${dailyTargetPct}% atingida. Motor pausado.`, 'WARNING');
                break;
              }

              // --- VPM Dinâmico: TP/SL adaptativos ---
              const price = candles[candles.length - 1].close;
              const profileRiskVpm: ProfileRisk = riskMap[currentProfile.riskLevel] as ProfileRisk || 'moderate';
              const vpmResult = calculateVPM(candles, price, analysis.signal, profileRiskVpm);

              // Se qualidade POOR e perfil conservador, pula
              if (vpmResult.quality === 'POOR' && currentProfile.riskLevel === 'Low') {
                addLog(`SKIP [VPM]: ${symbol} — qualidade POOR para perfil conservador. R:R ${vpmResult.riskRewardRatio.toFixed(2)}`, 'WARNING');
                continue;
              }

              // Usa VPM dinâmico para TP/SL (com fallback nos valores fixos do perfil)
              const sl = vpmResult.quality !== 'POOR' ? vpmResult.stopLoss
                : (analysis.signal === 'BUY' ? price * (1 - currentProfile.stopLoss / 100) : price * (1 + currentProfile.stopLoss / 100));
              const tp = vpmResult.quality !== 'POOR' ? vpmResult.takeProfit
                : (analysis.signal === 'BUY' ? price * (1 + currentProfile.takeProfit / 100) : price * (1 - currentProfile.takeProfit / 100));

              // --- SENTIMENTO (throttled, não bloqueia) ---
              let sentimentNote = '';
              try {
                const techCtx = `${analysis.signal} conf=${analysis.confidence.toFixed(1)}% | ${analysis.details.join(', ')} | Vol=${volAnalysis.level} ATR=${volAnalysis.atrPercent.toFixed(2)}%`;
                const sentiment = await analyzeSentimentThrottled(symbol, techCtx);
                if (sentiment.confidence > 50) {
                  sentimentNote = ` | Sentimento: ${sentiment.sentiment} (${sentiment.confidence}%)`;
                  // Se sentimento diverge forte, rebaixa para WAIT
                  if ((analysis.signal === 'BUY' && sentiment.sentiment === 'BEARISH' && sentiment.confidence > 70) ||
                      (analysis.signal === 'SELL' && sentiment.sentiment === 'BULLISH' && sentiment.confidence > 70)) {
                    addLog(`WAIT [SENT]: ${symbol} — sentimento ${sentiment.sentiment} (${sentiment.confidence}%) diverge do sinal técnico`, 'WARNING');
                    continue;
                  }
                }
              } catch { /* Não bloqueia trade se sentimento falhar */ }

              const side = analysis.signal;
              const reasons = analysis.details.join(', ');
              const vpmInfo = vpmResult.quality !== 'POOR' ? ` | VPM: R:R ${vpmResult.riskRewardRatio.toFixed(2)} (${vpmResult.quality})` : '';
              addLog(`GATILHO [${currentProfile.name}]: ${symbol} ${side} (${analysis.confidence.toFixed(1)}%) - ${reasons}${vpmInfo}${sentimentNote}`, 'SUCCESS');

              // Add to open positions immediately to prevent duplicates
              openPositionsRef.current.add(symbol);

              // Aloca capital do perfil imediatamente
              const profileId = currentProfile.id;
              setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, allocatedCapital: (p.allocatedCapital || 0) + marginRequired } : p));

              executeOrder({
                symbol, side, type: 'MARKET', quantity: 0, leverage: currentProfile.leverage,
                stopLossPrice: sl, takeProfitPrice: tp,
                marginUSD: marginRequired
              }, activeExchange, currentProfile.name).then(res => {
                if (res.success) {
                  profileMapRef.current[symbol] = currentProfile.name;
                  try { localStorage.setItem('profileMap', JSON.stringify(profileMapRef.current)); } catch { }
                  addLog(`AUTO [${currentProfile.name}]: Ordem ${side} executada em ${symbol} @ $${price.toFixed(2)} | TP: $${tp.toFixed(2)} SL: $${sl.toFixed(2)}`, 'SUCCESS');
                  fetchRealData();
                  // --- Integrar com Agentes PDCA ---
                  const profileAgentMap: Record<string, string> = {
                    'Seguro': 'agent_trend',
                    'Moderado': 'agent_trend',
                    'Ousado': 'agent_reversal',
                    'Especialista': 'agent_reversal',
                    'Alpha Predator': 'agent_scalper',
                  };
                  const agentId = profileAgentMap[currentProfile.name] || 'agent_trend';
                  try {
                    recordAgentTrade(agentId, symbol, side as 'BUY' | 'SELL', analysis.confidence, 0);
                  } catch { /* Non-blocking */ }
                } else {
                  openPositionsRef.current.delete(symbol);
                  // Devolve capital se falhou
                  setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, allocatedCapital: Math.max(0, (p.allocatedCapital || 0) - marginRequired) } : p));
                  addLog(`ERRO [${currentProfile.name}]: Falha ${symbol}: ${res.message}`, 'ERROR');
                }
              });
            } else {
              addLog(`MONITOR: ${symbol} ${analysis.signal} (${analysis.confidence.toFixed(1)}%) - ${analysis.details.join(', ') || 'Sem sinal'}`, 'INFO');
            }
          } catch (symbolError: any) {
            addLog(`ERRO: ${symbol} - ${symbolError.message}`, 'ERROR');
          }
        }
        idx.profileIdx++;
      } catch (error: any) {
        console.error('[MOTOR ERROR]', error);
        addLog(`ERRO MOTOR: ${error.message}`, 'ERROR');
      }
    };

    // Run immediately on start, then every 5s
    scanMarket();
    scanIntervalRef.current = setInterval(scanMarket, 5000);

    return () => { if (scanIntervalRef.current) clearInterval(scanIntervalRef.current); };
  }, [isRunning]);

  const fetchRealData = useCallback(async () => {
    const activeExchange = exchanges.find(e => e.status === 'CONNECTED');
    if (activeExchange) {
      const data = await fetchRealAccountData(activeExchange);

      // Fetch spot balance in parallel
      fetchSpotBalance(activeExchange).then(sb => {
        if (sb > 0) setSpotBalance(sb);
      }).catch(() => {});

      // For positions without a profileMap entry, try to find from Supabase audit
      const unmappedSymbols = data.assets.filter(a => !profileMapRef.current[a.symbol]).map(a => a.symbol);
      if (unmappedSymbols.length > 0) {
        try {
          const { supabase: sb } = await import('./services/supabaseClient');
          const { data: auditLogs } = await sb.from('audit_logs')
            .select('details')
            .eq('action', 'ORDER_PLACED')
            .eq('level', 'SUCCESS')
            .order('created_at', { ascending: false })
            .limit(50);
          if (auditLogs) {
            for (const log of auditLogs) {
              const d = log.details as any;
              if (d?.symbol && d?.profileName && !profileMapRef.current[d.symbol]) {
                profileMapRef.current[d.symbol] = d.profileName;
              }
            }
            try { localStorage.setItem('profileMap', JSON.stringify(profileMapRef.current)); } catch { }
          }
        } catch { }
      }

      // Inject profileName from our local map
      const assetsWithProfile = data.assets.map(a => ({
        ...a,
        strategyName: profileMapRef.current[a.symbol] || a.strategyName
      }));
      setRealPortfolio({ ...data, assets: assetsWithProfile });

      // --- Atualizar currentCapital dos perfis com PnL real ---
      const profilePnLMap: Record<string, number> = {};
      const profileAllocMap: Record<string, number> = {};
      for (const asset of assetsWithProfile) {
        const profName = asset.strategyName;
        if (profName) {
          profilePnLMap[profName] = (profilePnLMap[profName] || 0) + (asset.unrealizedPnL || 0);
          profileAllocMap[profName] = (profileAllocMap[profName] || 0) + Math.abs(asset.initialMargin || 0);
        }
      }
      setProfiles(prev => prev.map(p => {
        const pnl = profilePnLMap[p.name] || 0;
        const realAllocated = profileAllocMap[p.name] || 0;
        const baseCapital = p.capital; // Capital base do perfil (ex: $100)
        const newCurrentCapital = Math.max(0, baseCapital + pnl);
        // CRITICAL: allocatedCapital NUNCA pode exceder currentCapital
        const cappedAllocated = Math.min(realAllocated, newCurrentCapital);
        // Log se capital zerou
        if (newCurrentCapital <= 0 && p.active) {
          console.warn(`[CAPITAL] ⚠️ Perfil "${p.name}" zerou a banca! Capital: $${newCurrentCapital.toFixed(2)}`);
        }
        return {
          ...p,
          currentCapital: newCurrentCapital,
          allocatedCapital: cappedAllocated,
        };
      }));

      // --- Rastrear perdas consecutivas ---
      const previousPositionSymbols = new Set(openPositionsRef.current);
      const currentSymbols = new Set(assetsWithProfile.map(a => a.symbol));
      for (const sym of Array.from(previousPositionSymbols) as string[]) {
        if (!currentSymbols.has(sym as string)) {
          // Posição fechada — verificar se foi perda (baseado no último PnL conhecido)
          openPositionsRef.current.delete(sym);
          // Sem acesso ao PnL final, incrementamos se o trade foi mapeado e aberto durante perda global
          // Mais preciso: buscar income da posição fechada
        }
      }
      // Atualizar openPositions com posições atuais
      for (const sym of currentSymbols) {
        openPositionsRef.current.add(sym);
      }

      // --- Meta diária: persistência por data ---
      const today = new Date().toDateString();
      const savedDate = localStorage.getItem('cap_trading_date');

      if (savedDate !== today && data.totalBalance > 0) {
        localStorage.setItem('cap_trading_date', today);
        localStorage.setItem('cap_daily_start_equity', data.totalBalance.toString());
        setDailyStartBalance(data.totalBalance);
        setDailyTargetReached(false);
        addLog(`📅 Novo dia de trade iniciado. Saldo inicial: $${data.totalBalance.toFixed(2)}`, 'SYSTEM');
      } else if (dailyStartBalance === 0 && data.totalBalance > 0) {
        const savedEquity = localStorage.getItem('cap_daily_start_equity');
        const equity = savedEquity ? parseFloat(savedEquity) : data.totalBalance;
        setDailyStartBalance(equity);
        if (!savedEquity) {
          localStorage.setItem('cap_trading_date', today);
          localStorage.setItem('cap_daily_start_equity', equity.toString());
        }
      }

      // --- Verificação de Meta e Stop Loss (respeitando riskMode) ---
      // Base: capital investido (soma dos perfis) e não saldo total da conta
      const investedCapital = profiles.reduce((sum, p) => sum + (p.active ? p.capital : 0), 0);
      const baseForPct = investedCapital > 0 ? investedCapital : dailyStartBalance;

      if (riskMode !== 'free' && baseForPct > 0 && dailyStartBalance > 0) {
        const currentPnlPct = ((data.totalBalance - dailyStartBalance) / baseForPct) * 100;

        // Meta de ganho (opcional: só se dailyTargetPct > 0)
        if (dailyTargetPct > 0 && !dailyTargetReached && currentPnlPct >= dailyTargetPct) {
          setDailyTargetReached(true);
          setShowDailyTargetModal(true);
          setIsRunning(false);
          addLog(`🎯 META DIÁRIA ATINGIDA! Lucro de ${currentPnlPct.toFixed(2)}% (meta: ${dailyTargetPct}%)`, 'SUCCESS');
        }

        // Stop Loss diário
        if (currentPnlPct <= -dailyStopLossPct) {
          setIsRunning(false);
          addLog(`🚨 STOP LOSS DIÁRIO ATIVADO! Perda de ${currentPnlPct.toFixed(2)}% (limite: -${dailyStopLossPct}%). Motor parado.`, 'ERROR');
        }

        // Circuit Breaker (5 perdas consecutivas = pausa 30min)
        if (consecutiveLosses >= 5 && !circuitBreakerActive) {
          setCircuitBreakerActive(true);
          setIsRunning(false);
          addLog(`⚡ CIRCUIT BREAKER! 5 perdas consecutivas detectadas. Motor pausado por 30 minutos.`, 'ERROR');
          setTimeout(() => {
            setCircuitBreakerActive(false);
            setConsecutiveLosses(0);
            addLog(`✅ Circuit Breaker liberado. Motor pode ser reiniciado.`, 'INFO');
          }, 30 * 60 * 1000);
        }
      }
    }
  }, [exchanges, dailyStartBalance, dailyTargetPct, dailyTargetReached, profiles, riskMode, dailyStopLossPct, consecutiveLosses, circuitBreakerActive]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchRealData();
      const i = setInterval(fetchRealData, 5000); // Poll every 5 seconds
      return () => clearInterval(i);
    }
  }, [isAuthenticated, fetchRealData]);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardOverview
          lang={lang}
          totalBalance={realPortfolio.totalBalance}
          unrealizedPnL={realPortfolio.unrealizedPnL}
          assets={realPortfolio.assets}
          trades={trades}
          profiles={profiles}
          exchanges={exchanges}
          onRefresh={fetchRealData}
          dailyTargetPct={dailyTargetPct}
          setDailyTargetPct={(v: number) => { setDailyTargetPct(v); localStorage.setItem('cap_daily_target', String(v)); }}
          dailyStartBalance={dailyStartBalance}
          dailyTargetReached={dailyTargetReached}
          showDailyTargetModal={showDailyTargetModal}
          setShowDailyTargetModal={setShowDailyTargetModal}
          onContinueDay={() => {
            // Resetar meta: novo baseline = saldo atual (assim precisa +10% sobre o valor ATUAL)
            const currentBalance = realPortfolio.totalBalance;
            setDailyStartBalance(currentBalance);
            localStorage.setItem('cap_daily_start_equity', currentBalance.toString());
            setDailyTargetReached(false);
            setShowDailyTargetModal(false);
            setIsRunning(true); // Reinicia motor automaticamente
            addLog(`🎯 Nova meta: +${dailyTargetPct}% sobre $${currentBalance.toFixed(2)}`, 'SUCCESS');
          }}
          onEndDay={() => { setIsRunning(false); setShowDailyTargetModal(false); }}
          riskMode={riskMode}
          dailyStopLossPct={dailyStopLossPct}
          consecutiveLosses={consecutiveLosses}
          circuitBreakerActive={circuitBreakerActive}
        />;
      case 'settings':
        return <ExchangeManager exchanges={exchanges} setExchanges={setExchanges} lang={lang} addLog={addLog} />;
      case 'strategies':
        // Calculate which profile is top performer based on actual PNL from trades
        const profilePnL = profiles.map(p => {
          const profileTrades = trades.filter(t =>
            t.strategyName?.toLowerCase().includes(p.name.toLowerCase()) || t.strategyName === p.id
          );
          const totalPnL = profileTrades.filter(t => t.status === 'CLOSED').reduce((sum, t) => sum + (t.pnl || 0), 0);
          return { id: p.id, pnl: totalPnL };
        });
        const topPerformerId = profilePnL.length > 0 ? profilePnL.reduce((a, b) => a.pnl > b.pnl ? a : b).id : null;
        const hasPositivePnL = profilePnL.some(p => p.pnl > 0);

        const sortedProfiles = [...profiles].sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));

        const handleMoveUp = (id: string) => {
          setProfiles(prev => {
            const sorted = [...prev].sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));
            const idx = sorted.findIndex(p => p.id === id);
            if (idx <= 0) return prev;
            const currentPriority = sorted[idx].priority ?? 99;
            const abovePriority = sorted[idx - 1].priority ?? 99;
            return prev.map(p => {
              if (p.id === id) return { ...p, priority: abovePriority };
              if (p.id === sorted[idx - 1].id) return { ...p, priority: currentPriority };
              return p;
            });
          });
        };

        const handleMoveDown = (id: string) => {
          setProfiles(prev => {
            const sorted = [...prev].sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));
            const idx = sorted.findIndex(p => p.id === id);
            if (idx < 0 || idx >= sorted.length - 1) return prev;
            const currentPriority = sorted[idx].priority ?? 99;
            const belowPriority = sorted[idx + 1].priority ?? 99;
            return prev.map(p => {
              if (p.id === id) return { ...p, priority: belowPriority };
              if (p.id === sorted[idx + 1].id) return { ...p, priority: currentPriority };
              return p;
            });
          });
        };

        const handleDragDrop = (dropTargetId: string) => {
          const dragId = dragIdRef.current;
          if (!dragId || dragId === dropTargetId) { setDragOverId(null); return; }
          setProfiles(prev => {
            const sorted = [...prev].sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));
            const dragIdx = sorted.findIndex(p => p.id === dragId);
            const dropIdx = sorted.findIndex(p => p.id === dropTargetId);
            if (dragIdx < 0 || dropIdx < 0) return prev;
            // Remove dragged and insert at drop position
            const reordered = [...sorted];
            const [dragged] = reordered.splice(dragIdx, 1);
            reordered.splice(dropIdx, 0, dragged);
            // Reassign priorities sequentially
            const idToPriority: Record<string, number> = {};
            reordered.forEach((p, i) => { idToPriority[p.id] = i + 1; });
            return prev.map(p => ({ ...p, priority: idToPriority[p.id] ?? p.priority }));
          });
          dragIdRef.current = null;
          setDragOverId(null);
        };

        // IDs dos perfis padrão
        const DEFAULT_IDS = new Set(INITIAL_PROFILES_BASE.map(p => p.id));
        const hasMissingDefaults = INITIAL_PROFILES_BASE.some(dp => !profiles.find(p => p.id === dp.id));

        const handleRestoreDefaults = () => {
          if (!window.confirm('Restaurar os 5 perfis padrões (Seguro, Moderado, Ousado, Especialista, Alpha Predator)?\n\nPerfis personalizados serão mantidos.')) return;
          setProfiles(prev => {
            // Manter perfis customizados
            const customProfiles = prev.filter(p => !DEFAULT_IDS.has(p.id));
            // Restaurar todos os padrões com configuração original
            const maxCustomPriority = Math.max(...customProfiles.map(p => p.priority ?? 0), 0);
            const restoredDefaults = INITIAL_PROFILES_BASE.map(dp => ({ ...dp }));
            // Reposicionar customizados após os padrões
            const reindexedCustom = customProfiles.map((p, i) => ({ ...p, priority: 6 + i }));
            return [...restoredDefaults, ...reindexedCustom];
          });
          addLog('🔄 Perfis padrões restaurados com sucesso!', 'SUCCESS');
        };

        return (
          <div>
            {/* Barra de ações */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {hasMissingDefaults && (
                  <button
                    onClick={handleRestoreDefaults}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 text-amber-400 rounded-lg text-xs font-bold transition-colors"
                  >
                    🔄 Restaurar Perfis Padrões
                  </button>
                )}
                <button
                  onClick={handleRestoreDefaults}
                  className="flex items-center gap-2 px-4 py-2 bg-[#1E2433] hover:bg-[#252B3B] border border-[#2A303C] text-gray-400 rounded-lg text-xs transition-colors"
                >
                  ⟲ Resetar Padrões
                </button>
              </div>
              <button
                onClick={() => {
                  const newId = `custom_${Date.now()}`;
                  const maxPriority = Math.max(...profiles.map(p => p.priority ?? 0), 0);
                  setEditingProfile({ ...INITIAL_PROFILES_BASE[0], id: newId, name: 'Novo Perfil', active: false, priority: maxPriority + 1 });
                }}
                className="flex items-center gap-2 px-4 py-2 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-400 rounded-lg text-xs font-bold transition-colors"
              >
                ＋ Adicionar Perfil
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
              {sortedProfiles.map((p, idx) => (
                <StrategyCard
                  key={p.id}
                  profile={p}
                  lang={lang}
                  onEdit={setEditingProfile}
                  onToggle={(id) => setProfiles(prev => prev.map(x => x.id === id ? { ...x, active: !x.active } : x))}
                  onDelete={(id) => {
                    const isDefault = DEFAULT_IDS.has(id);
                    const msg = isDefault
                      ? 'Este é um perfil padrão. Deseja restaurá-lo depois usando "Restaurar Perfis Padrões".\n\nExcluir mesmo assim?'
                      : 'Deseja realmente excluir este perfil?';
                    if (window.confirm(msg)) setProfiles(prev => prev.filter(x => x.id !== id));
                  }}
                  trades={trades}
                  isTopPerformer={hasPositivePnL && p.id === topPerformerId}
                  onMoveUp={handleMoveUp}
                  onMoveDown={handleMoveDown}
                  isFirst={idx === 0}
                  isLast={idx === sortedProfiles.length - 1}
                  onDragStart={(id) => { dragIdRef.current = id; }}
                  onDragOver={(id) => setDragOverId(id)}
                  onDrop={handleDragDrop}
                  isDragOver={dragOverId === p.id}
                />
              ))}
            </div>
          </div>
        );
      case 'analysis':
        return <AnalysisView exchanges={exchanges} realBalance={realPortfolio.totalBalance} availablePairs={allMarketPairs} />;
      case 'logs': return <AuditLog logs={logs} />;
      case 'wallet': return <WalletDashboard lang={lang} realPortfolio={realPortfolio} exchanges={exchanges} onRefresh={fetchRealData} spotBalance={spotBalance} />;
      case 'history': return <TradeHistory trades={trades} lang={lang} exchanges={exchanges} />;
      case 'risk': return <RiskManagement riskMode={riskMode} setRiskMode={setRiskMode} dailyTargetPct={dailyTargetPct} setDailyTargetPct={setDailyTargetPct} dailyStopLossPct={dailyStopLossPct} setDailyStopLossPct={setDailyStopLossPct} profiles={profiles} setProfiles={setProfiles} lang={lang} />;
      case 'vpn': return <VPNManager />;
      case 'agents': return <PDCADashboard />;
      case 'admin': return <AdminPanel lang={lang} />;
      case 'profile': return <UserProfile lang={lang} />;
      case 'info': return <InformationTab lang={lang} />;
      default: return <div className="text-white p-10">Interface {activeTab} em carregamento...</div>;
    }
  };

  if (loading) return <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

  // FIXED: Do not manually set authenticated state here. Let the supabase subscription handle it.
  // This prevents the UI from rendering before data is loaded.
  if (!isAuthenticated) return <LoginScreen onLogin={() => { /* Triggered by auth state change */ }} lang={lang} setLang={setLang} />;

  return (
    <div className="flex h-screen bg-background text-gray-200 overflow-hidden font-sans relative">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} lang={lang} isAdmin={userRole === 'admin'} onLogout={async () => { await supabase.auth.signOut(); dataLoadedRef.current = false; setIsAuthenticated(false); setSession(null); setExchanges([]); }} />
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
            <VPNStatus onClick={() => setActiveTab('vpn')} />
            <button
              onClick={() => setShowNotifications(true)}
              className="relative p-2 rounded-lg bg-[#2A303C] hover:bg-[#353C4B] text-gray-400 transition-all"
              title="Notificações"
            >
              <Bell size={16} />
              {getUnreadCount() > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-cyan-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                  {getUnreadCount() > 9 ? '9+' : getUnreadCount()}
                </span>
              )}
            </button>
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
      {editingProfile && <StrategyModal profile={editingProfile} onClose={() => setEditingProfile(null)} onSave={(newP) => {
        setProfiles(prev => {
          const exists = prev.some(p => p.id === newP.id);
          if (exists) return prev.map(p => p.id === newP.id ? newP : p);
          return [...prev, newP];
        });
        setEditingProfile(null);
      }} />}
      {showPairSelector && <SymbolSelector allPairs={allMarketPairs} availableQuotes={availableQuotes} selectedSymbols={selectedPairs} onClose={() => setShowPairSelector(false)} onSave={(newSelection) => { setSelectedPairs(newSelection); setShowPairSelector(false); addLog(`SISTEMA: Lista de ativos atualizada.`, 'INFO'); }} />}
      <ChatBot lang={lang} marketData={{ price: 0, change24h: 0, rsi: 50, macd: 0, bollingerState: 'Middle', volume: 0, vwap: 0, atr: 0, stochasticK: 50, stochasticD: 50, macdSignal: 0, macdHist: 0 }} symbol="BTC" />
      <NotificationCenter isOpen={showNotifications} onClose={() => setShowNotifications(false)} />

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-bottom-nav">
        <button className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => { setActiveTab('dashboard'); setShowMobileMenu(false); }}>
          <LayoutDashboard size={20} />
          <span>Início</span>
        </button>
        <button className={activeTab === 'strategies' ? 'active' : ''} onClick={() => { setActiveTab('strategies'); setShowMobileMenu(false); }}>
          <Layers size={20} />
          <span>Motor</span>
        </button>
        <button className={activeTab === 'risk' ? 'active' : ''} onClick={() => { setActiveTab('risk'); setShowMobileMenu(false); }}>
          <ShieldAlert size={20} />
          <span>Riscos</span>
        </button>
        <button className={activeTab === 'wallet' ? 'active' : ''} onClick={() => { setActiveTab('wallet'); setShowMobileMenu(false); }}>
          <Wallet size={20} />
          <span>Carteira</span>
        </button>
        <button className={showMobileMenu || ['history', 'analysis', 'logs', 'settings', 'info', 'profile'].includes(activeTab) ? 'active' : ''} onClick={() => setShowMobileMenu(!showMobileMenu)}>
          <Menu size={20} />
          <span>Mais</span>
        </button>
      </nav>

      {/* Mobile "Mais" popup */}
      {showMobileMenu && (
        <>
          <div className="fixed inset-0 z-[99]" onClick={() => setShowMobileMenu(false)} />
          <div className="fixed bottom-[68px] right-2 left-2 z-[101] bg-[#1A1F2E]/95 backdrop-blur-md border border-[#2A303C] rounded-2xl shadow-2xl p-3 grid grid-cols-4 gap-2" style={{ paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))' }}>
            {[
              { id: 'history', icon: History, label: 'Histórico' },
              { id: 'analysis', icon: LineChart, label: 'Análise' },
              { id: 'logs', icon: FileText, label: 'Auditoria' },
              { id: 'agents', icon: Layers, label: 'Agentes IA' },
              { id: 'vpn', icon: ShieldAlert, label: 'VPN' },
              { id: 'settings', icon: Settings, label: 'API' },
              { id: 'info', icon: Bell, label: 'Info' },
              { id: 'profile', icon: Layers, label: 'Perfil' },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setShowMobileMenu(false); }}
                className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl transition-all ${activeTab === item.id ? 'bg-cyan-500/15 text-cyan-400 shadow-sm shadow-cyan-500/10' : 'text-gray-400 hover:bg-white/5 active:bg-white/10'}`}
              >
                <item.icon size={18} />
                <span className="text-[8px] font-bold uppercase leading-tight text-center">{item.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
