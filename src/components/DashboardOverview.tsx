import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Language, Trade, StrategyProfile, Exchange } from '../types';
import { TrendingUp, TrendingDown, Activity, DollarSign, PieChart, Layers, Clock, Target, BarChart2, EyeOff, Eye, X, Shield, ExternalLink, ArrowUpRight, ArrowDownRight, Percent, LineChart, Scale, Rocket, Zap, XCircle, CheckSquare, Square, RefreshCw, Crosshair, Trophy, StopCircle, PlayCircle, ShieldAlert, Globe2, Unlock, Settings2, ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, Tooltip, XAxis, YAxis, PieChart as RechartsPC, Pie, Cell } from 'recharts';
import TradingViewWidget from './TradingViewWidget';
import { closePosition, closeMultiplePositions, fetchTradeHistory, fetchIncomeHistory, callBinanceProxy } from '../services/exchangeService';

interface DashboardOverviewProps {
    lang: Language;
    totalBalance: number;
    unrealizedPnL: number;
    assets: { symbol: string; amount: number; price: number; value: number; unrealizedPnL: number; initialMargin?: number; strategyName?: string }[];
    trades: Trade[];
    profiles?: StrategyProfile[];
    exchanges?: Exchange[];
    onRefresh?: () => void;
    dailyTargetPct?: number;
    setDailyTargetPct?: (v: number) => void;
    dailyStartBalance?: number;
    dailyTargetReached?: boolean;
    showDailyTargetModal?: boolean;
    setShowDailyTargetModal?: (v: boolean) => void;
    onContinueDay?: () => void;
    onEndDay?: () => void;
    riskMode?: string;
    dailyStopLossPct?: number;
    consecutiveLosses?: number;
    circuitBreakerActive?: boolean;
}

const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const DashboardOverview: React.FC<DashboardOverviewProps> = ({
    lang, totalBalance, unrealizedPnL, assets, trades, profiles = [], exchanges = [], onRefresh,
    dailyTargetPct = 10, setDailyTargetPct, dailyStartBalance = 0, dailyTargetReached = false,
    showDailyTargetModal = false, setShowDailyTargetModal, onContinueDay, onEndDay,
    riskMode = 'general', dailyStopLossPct = 5, consecutiveLosses = 0, circuitBreakerActive = false
}) => {
    const [sessionHistory, setSessionHistory] = useState<{ time: string, value: number }[]>([]);
    const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT');
    const [showChart, setShowChart] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
    const [orderTab, setOrderTab] = useState<'positive' | 'negative'>('positive');
    const [isClosing, setIsClosing] = useState(false);
    const [isClosingAll, setIsClosingAll] = useState(false);
    const [selectedPositions, setSelectedPositions] = useState<Set<string>>(new Set());
    const [isClosingSelected, setIsClosingSelected] = useState(false);
    const [apiStats, setApiStats] = useState<{ bestTrade: number; worstTrade: number; winRate: number; totalTrades: number; equityCurve: { time: string; value: number; original_ts: number }[]; bestTradeSymbol?: string; worstTradeSymbol?: string }>({ bestTrade: 0, worstTrade: 0, winRate: 0, totalTrades: 0, equityCurve: [] });
    const [apiTrades, setApiTrades] = useState<{ symbol: string; side: string; pnl: number; time: number; realizedPnl: number }[]>([]);
    const [metricTooltip, setMetricTooltip] = useState<string | null>(null);
    const [tradeDetailModal, setTradeDetailModal] = useState<'best' | 'worst' | null>(null);
    const [livePrice, setLivePrice] = useState<number | null>(null);
    const [hideBalance, setHideBalance] = useState(() => localStorage.getItem('hideBalance') === 'true');
    const [showWidgetConfig, setShowWidgetConfig] = useState(false);
    const [widgetConfig, setWidgetConfig] = useState<Record<string, boolean>>(() => {
        try { return JSON.parse(localStorage.getItem('dashWidgets') || '{}'); } catch { return {}; }
    });

    const isWidgetVisible = (key: string) => widgetConfig[key] !== false; // default visible
    const toggleWidget = (key: string) => {
        setWidgetConfig(prev => {
            const next = { ...prev, [key]: !isWidgetVisible(key) };
            localStorage.setItem('dashWidgets', JSON.stringify(next));
            return next;
        });
    };

    const defaultWidgetOrder = ['visaoGeral', 'saldoTotal', 'pnl', 'positions', 'winrate', 'bestTrade', 'worstTrade', 'dailyTarget', 'dailyBalance', 'riskMode', 'activeProfiles', 'equityCurve', 'ordersPanel'];

    const widgetList: { key: string; label: string }[] = [
        { key: 'visaoGeral', label: 'Visão Geral / Gráfico' },
        { key: 'saldoTotal', label: 'Saldo Total' },
        { key: 'pnl', label: 'PnL Não Realizado' },
        { key: 'positions', label: 'Posições' },
        { key: 'winrate', label: 'Win Rate' },
        { key: 'bestTrade', label: 'Melhor Trade' },
        { key: 'worstTrade', label: 'Pior Trade' },
        { key: 'dailyTarget', label: 'Meta Diária' },
        { key: 'dailyBalance', label: 'Saldo do Dia' },
        { key: 'riskMode', label: 'Modo de Risco' },
        { key: 'activeProfiles', label: 'Perfis Ativos' },
        { key: 'equityCurve', label: 'Curva de Patrimônio' },
        { key: 'ordersPanel', label: 'Painel de Ordens' },
    ];

    const [widgetOrder, setWidgetOrder] = useState<string[]>(() => {
        try {
            const saved = JSON.parse(localStorage.getItem('dashWidgetOrder') || '[]');
            if (saved.length > 0) return saved;
        } catch { }
        return defaultWidgetOrder;
    });

    // Ensure new widgets are picked up
    const orderedWidgets = useMemo(() => {
        const all = defaultWidgetOrder;
        const ordered = widgetOrder.filter(k => all.includes(k));
        all.forEach(k => { if (!ordered.includes(k)) ordered.push(k); });
        return ordered;
    }, [widgetOrder]);

    const moveWidget = (key: string, dir: -1 | 1) => {
        setWidgetOrder(prev => {
            const list = [...orderedWidgets];
            const idx = list.indexOf(key);
            if (idx < 0) return prev;
            const newIdx = idx + dir;
            if (newIdx < 0 || newIdx >= list.length) return prev;
            [list[idx], list[newIdx]] = [list[newIdx], list[idx]];
            localStorage.setItem('dashWidgetOrder', JSON.stringify(list));
            return list;
        });
    };

    const toggleHideBalance = () => {
        setHideBalance(prev => {
            localStorage.setItem('hideBalance', String(!prev));
            return !prev;
        });
    };
    const maskedValue = '••••••';
    const livePriceSymbolRef = useRef<string | null>(null);

    // Stable REST polling for live price (every 3s) — no flicker
    useEffect(() => {
        const symbol = selectedOrder?.symbol;
        if (!symbol) {
            if (livePriceSymbolRef.current) {
                livePriceSymbolRef.current = null;
                setLivePrice(null);
            }
            return;
        }
        // Only reset if symbol changed
        if (livePriceSymbolRef.current !== symbol) {
            livePriceSymbolRef.current = symbol;
            setLivePrice(null); // Reset only on symbol change
        }

        const activeExchange = exchanges?.find((e: any) => e.status === 'CONNECTED');
        if (!activeExchange) return;

        const fetchPrice = async () => {
            try {
                const ticker = await callBinanceProxy('/fapi/v1/ticker/price', 'GET', { symbol }, activeExchange);
                if (ticker?.price && livePriceSymbolRef.current === symbol) {
                    setLivePrice(parseFloat(ticker.price));
                }
            } catch { }
        };

        fetchPrice(); // Immediate first fetch
        const interval = setInterval(fetchPrice, 3000);
        return () => clearInterval(interval);
    }, [selectedOrder?.symbol, exchanges]);

    useEffect(() => {
        if (totalBalance > 0) {
            const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            setSessionHistory(prev => {
                const last = prev[prev.length - 1];
                if (last?.value === totalBalance) return prev;
                return [...prev.slice(-29), { time: now, value: totalBalance }];
            });
        }
    }, [totalBalance]);

    // Separate orders by PnL
    const positiveOrders = useMemo(() => assets.filter(a => a.unrealizedPnL >= 0), [assets]);
    const negativeOrders = useMemo(() => assets.filter(a => a.unrealizedPnL < 0), [assets]);
    // const displayedOrders... (keeping this part for context if needed, but the replace checks lines)

    // FETCH HISTORY FROM SUPABASE
    const [historyData, setHistoryData] = useState<{ time: string, value: number, original_ts: string }[]>([]);
    const [timeRange, setTimeRange] = useState<'1H' | '1D' | '1W' | '1M' | 'ALL'>('1D');

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const { supabase } = await import('../services/supabaseClient');

                // Get current user for explicit filtering (defense in depth)
                const { data: { session } } = await supabase.auth.getSession();
                const userId = session?.user?.id;

                let query = supabase.from('balance_history').select('balance, recorded_at').order('recorded_at', { ascending: true });

                // Filter by user_id explicitly (don't rely only on RLS)
                if (userId) {
                    query = query.eq('user_id', userId);
                }

                // Time Filters
                const now = new Date();
                if (timeRange === '1H') now.setHours(now.getHours() - 1);
                if (timeRange === '1D') now.setDate(now.getDate() - 1);
                if (timeRange === '1W') now.setDate(now.getDate() - 7);
                if (timeRange === '1M') now.setMonth(now.getMonth() - 1);

                if (timeRange !== 'ALL') {
                    query = query.gte('recorded_at', now.toISOString());
                }

                const { data, error } = await query;

                if (error) {
                    console.warn('[DASH] balance_history query error:', error.message);
                }

                if (data && data.length > 0) {
                    const formatted = data.map((d: any) => ({
                        time: new Date(d.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        value: parseFloat(d.balance),
                        original_ts: d.recorded_at
                    }));
                    setHistoryData(formatted);
                } else {
                    if (sessionHistory.length > 0) setHistoryData(sessionHistory as any);
                }
            } catch (err) {
                console.warn('[DASH] fetchHistory failed:', err);
                if (sessionHistory.length > 0) setHistoryData(sessionHistory as any);
            }
        };
        fetchHistory();
    }, [timeRange, sessionHistory]);

    // Auto-refresh positions every 15s when motor is active
    useEffect(() => {
        const interval = setInterval(() => { onRefresh?.(); }, 15000);
        return () => clearInterval(interval);
    }, [onRefresh]);

    // Fetch stats from Binance API
    const fetchApiStats = useCallback(async () => {
        const activeExchange = exchanges.find(e => e.status === 'CONNECTED');
        if (!activeExchange) return;
        try {
            const [tradeHistory, incomeHistory] = await Promise.all([
                fetchTradeHistory(activeExchange),
                fetchIncomeHistory(activeExchange),
            ]);
            // Save raw trades for history display
            setApiTrades(tradeHistory.filter(t => t.realizedPnl !== 0).map(t => ({
                symbol: t.symbol, side: t.side, pnl: t.realizedPnl, time: t.time, realizedPnl: t.realizedPnl
            })));

            // Group trades by orderId proximity (within 1s) for PnL calc
            const tradePnls = tradeHistory.filter(t => t.realizedPnl !== 0).map(t => t.realizedPnl);
            const best = tradePnls.length > 0 ? Math.max(...tradePnls) : 0;
            const worst = tradePnls.length > 0 ? Math.min(...tradePnls) : 0;
            const wins = tradePnls.filter(p => p > 0).length;
            const wr = tradePnls.length > 0 ? Math.round((wins / tradePnls.length) * 100) : 0;

            // Build equity curve from income history with original timestamps
            let cumulative = totalBalance;
            const sortedIncome = [...incomeHistory].sort((a, b) => a.time - b.time);
            const curve = sortedIncome.map(i => {
                cumulative += i.income;
                return { time: new Date(i.time).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), value: cumulative, original_ts: i.time };
            });

            setApiStats({ bestTrade: best, worstTrade: worst, winRate: wr, totalTrades: tradePnls.length, equityCurve: curve });
        } catch (e) { console.warn('[API STATS]', e); }
    }, [exchanges, totalBalance]);

    useEffect(() => {
        fetchApiStats();
    }, [fetchApiStats]);

    const displayedOrders = orderTab === 'positive' ? positiveOrders : negativeOrders;

    // Calculate stats
    const activeProfiles = useMemo(() => profiles.filter(p => p.active), [profiles]);
    const winRate = useMemo(() => {
        const closedTrades = trades.filter(t => t.status === 'CLOSED');
        if (closedTrades.length === 0) return 0;
        const wins = closedTrades.filter(t => t.pnl > 0).length;
        return Math.round((wins / closedTrades.length) * 100);
    }, [trades]);

    const totalPnL = useMemo(() => trades.reduce((acc, t) => acc + t.pnl, 0), [trades]);
    // Use API stats if available, fallback to local trades
    const bestTrade = apiStats.bestTrade !== 0 ? apiStats.bestTrade : Math.max(0, ...trades.map(t => t.pnl));
    const worstTrade = apiStats.worstTrade !== 0 ? apiStats.worstTrade : Math.min(0, ...trades.map(t => t.pnl));

    // Filter trades by selected period — use API trades if available, fallback to local
    const filteredTrades = useMemo(() => {
        // Merge API trades into displayable format
        const displayTrades = apiTrades.length > 0
            ? apiTrades.map((t, i) => ({
                id: `api_${i}`,
                symbol: t.symbol,
                side: t.pnl >= 0 ? 'SELL' as const : 'BUY' as const,
                entryPrice: 0,
                amount: 0,
                pnl: t.pnl,
                status: 'CLOSED' as const,
                timestamp: new Date(t.time).toISOString(),
                strategyName: '-',
            }))
            : trades;

        if (timeRange === 'ALL') return displayTrades;
        const now = new Date();
        const cutoff = new Date();
        if (timeRange === '1H') cutoff.setHours(now.getHours() - 1);
        if (timeRange === '1D') cutoff.setDate(now.getDate() - 1);
        if (timeRange === '1W') cutoff.setDate(now.getDate() - 7);
        if (timeRange === '1M') cutoff.setMonth(now.getMonth() - 1);
        return displayTrades.filter(t => new Date(t.timestamp) >= cutoff);
    }, [trades, apiTrades, timeRange]);

    // Filter equity curve by selected period
    const filteredEquityCurve = useMemo(() => {
        const curve = apiStats.equityCurve;
        if (curve.length === 0) return historyData.length > 0 ? historyData : sessionHistory;
        if (timeRange === 'ALL') return curve;
        const now = Date.now();
        let cutoffMs = 0;
        if (timeRange === '1H') cutoffMs = now - 60 * 60 * 1000;
        if (timeRange === '1D') cutoffMs = now - 24 * 60 * 60 * 1000;
        if (timeRange === '1W') cutoffMs = now - 7 * 24 * 60 * 60 * 1000;
        if (timeRange === '1M') cutoffMs = now - 30 * 24 * 60 * 60 * 1000;
        const filtered = curve.filter(p => p.original_ts >= cutoffMs);
        return filtered.length > 0 ? filtered : curve.slice(-5);
    }, [apiStats.equityCurve, historyData, sessionHistory, timeRange]);

    // Get profile for an asset - improved lookup
    const getProfileForAsset = (symbol: string) => {
        // 1. Check if asset has strategyName directly
        const assetData = assets.find(a => a.symbol === symbol);
        if (assetData?.strategyName) return assetData.strategyName;

        // 2. Check localStorage profileMap
        try {
            const savedMap = JSON.parse(localStorage.getItem('profileMap') || '{}');
            if (savedMap[symbol]) return savedMap[symbol];
        } catch { }

        // 3. Look in trades
        const trade = [...trades].reverse().find(t =>
            (t.symbol === symbol || t.symbol.includes(symbol.replace('USDT', ''))) &&
            (t.status === 'OPEN' || !t.status)
        );
        return trade?.strategyName || 'Manual';
    };

    const getProfileColor = (name: string) => {
        const colorMap: Record<string, string> = {
            'Seguro': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
            'Moderado': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
            'Ousado': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
            'Especialista': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
            'Alpha Predator': 'bg-red-500/20 text-red-400 border-red-500/30',
        };
        return colorMap[name] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    };

    const getProfileIcon = (name: string) => {
        switch (name) {
            case 'Seguro': return <Shield size={12} />;
            case 'Moderado': return <Scale size={12} />;
            case 'Ousado': return <Rocket size={12} />;
            case 'Alpha Predator': return <Zap size={12} />;
            default: return <Target size={12} />;
        }
    };

    const handleClosePosition = async (asset: any) => {
        const activeExchange = exchanges.find(e => e.status === 'CONNECTED');
        if (!activeExchange) return;

        setIsClosing(true);
        try {
            const side = asset.amount > 0 ? 'SELL' : 'BUY';
            await closePosition(asset.symbol, Math.abs(asset.amount), side, activeExchange);
            setSelectedOrder(null);
            onRefresh?.();
        } catch (error: any) {
            console.error('Close position error:', error);
        } finally {
            setIsClosing(false);
        }
    };

    // Close all in current tab (positive or negative)
    const handleCloseByTab = async (tab: 'positive' | 'negative') => {
        const activeExchange = exchanges.find(e => e.status === 'CONNECTED');
        if (!activeExchange) return;
        const targets = tab === 'positive' ? positiveOrders : negativeOrders;
        if (targets.length === 0) return;

        setIsClosingAll(true);
        try {
            await closeMultiplePositions(targets, activeExchange);
            onRefresh?.();
        } catch (error: any) {
            console.error('Close tab error:', error);
        } finally {
            setIsClosingAll(false);
        }
    };

    // Close only selected positions
    const handleCloseSelected = async () => {
        const activeExchange = exchanges.find(e => e.status === 'CONNECTED');
        if (!activeExchange || selectedPositions.size === 0) return;

        setIsClosingSelected(true);
        try {
            const targets = assets.filter(a => selectedPositions.has(a.symbol));
            const result = await closeMultiplePositions(targets, activeExchange);
            console.log(`[CLOSE SELECTED] ${result.success} closed, ${result.failed} failed`);
            setSelectedPositions(new Set());
            onRefresh?.();
        } catch (error: any) {
            console.error('Close selected error:', error);
        } finally {
            setIsClosingSelected(false);
        }
    };

    const toggleSelection = (symbol: string) => {
        setSelectedPositions(prev => {
            const next = new Set(prev);
            if (next.has(symbol)) next.delete(symbol); else next.add(symbol);
            return next;
        });
    };

    const toggleSelectAll = () => {
        const currentOrders = orderTab === 'positive' ? positiveOrders : negativeOrders;
        const allSelected = currentOrders.every(a => selectedPositions.has(a.symbol));
        if (allSelected) {
            setSelectedPositions(new Set());
        } else {
            setSelectedPositions(new Set(currentOrders.map(a => a.symbol)));
        }
    };

    // Order Detail Modal
    const OrderModal = ({ asset, onClose }: { asset: any; onClose: () => void }) => {
        const profileName = getProfileForAsset(asset.symbol);
        const side = asset.amount > 0 ? 'LONG' : 'SHORT';
        const pnlPercent = asset.initialMargin ? ((asset.unrealizedPnL / asset.initialMargin) * 100).toFixed(2) : '0';
        const isPositive = asset.unrealizedPnL >= 0;

        // Find profile config for TP/SL values
        const matchedProfile = profiles.find(p => p.name === profileName);
        const slPct = matchedProfile?.stopLoss || 5;
        const tpPct = matchedProfile?.takeProfit || 10;
        const entryPrice = asset.price;
        const tpPrice = side === 'LONG' ? entryPrice * (1 + tpPct / 100) : entryPrice * (1 - tpPct / 100);
        const slPrice = side === 'LONG' ? entryPrice * (1 - slPct / 100) : entryPrice * (1 + slPct / 100);

        // Fetch live price with fallback URLs
        useEffect(() => {
            setLivePrice(null);
            const activeExchange = exchanges.find(e => e.status === 'CONNECTED');
            const isTestnet = activeExchange?.isTestnet;
            const urls = isTestnet
                ? ['https://testnet.binancefuture.com/fapi/v1/ticker/price']
                : [
                    'https://fapi.binance.com/fapi/v1/ticker/price',
                    'https://fapi1.binance.com/fapi/v1/ticker/price',
                    'https://fapi2.binance.com/fapi/v1/ticker/price',
                    'https://fapi3.binance.com/fapi/v1/ticker/price',
                ];
            let workingUrl = urls[0];

            const fetchLive = async () => {
                for (const url of [workingUrl, ...urls.filter(u => u !== workingUrl)]) {
                    try {
                        const res = await fetch(`${url}?symbol=${asset.symbol}`);
                        if (!res.ok) continue;
                        const data = await res.json();
                        if (data.price) {
                            setLivePrice(parseFloat(data.price));
                            workingUrl = url; // cache working URL
                            return;
                        }
                    } catch { /* try next */ }
                }
            };
            fetchLive();
            const iv = setInterval(fetchLive, 4000);
            return () => clearInterval(iv);
        }, [asset.symbol, exchanges]);

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
                <div className="bg-[#151A25] border border-[#2A303C] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
                    <div className={`p-6 border-b border-[#2A303C] ${isPositive ? 'bg-gradient-to-r from-green-900/30 to-emerald-900/20' : 'bg-gradient-to-r from-red-900/30 to-rose-900/20'}`}>
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${asset.amount > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{side}</span>
                                    <h3 className="text-xl font-bold text-white">{asset.symbol}</h3>
                                </div>
                                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-bold ${getProfileColor(profileName)}`}>
                                    {getProfileIcon(profileName)}
                                    {profileName}
                                </div>
                            </div>
                            <button onClick={onClose} aria-label="Close" className="bg-black/20 hover:bg-white/10 p-2 rounded-full text-gray-400 hover:text-white transition-colors"><X size={20} /></button>
                        </div>
                    </div>

                    <div className="p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                                <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Preço de Entrada</div>
                                <div className="text-white font-mono font-bold text-lg">${entryPrice.toLocaleString()}</div>
                            </div>
                            <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                                <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Valor em USD</div>
                                <div className="text-white font-mono font-bold text-lg">${asset.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                            </div>
                            <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                                <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Quantidade</div>
                                <div className="text-white font-mono font-bold text-lg">{Math.abs(asset.amount).toFixed(4)}</div>
                            </div>
                            <div className={`bg-black/30 p-4 rounded-xl border ${isPositive ? 'border-green-500/30' : 'border-red-500/30'}`}>
                                <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">PnL (% Lucro/Perda)</div>
                                <div className={`font-mono font-bold text-lg flex items-center gap-2 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                                    {isPositive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                                    {isPositive ? '+' : ''}{asset.unrealizedPnL.toFixed(2)} ({pnlPercent}%)
                                </div>
                            </div>
                        </div>

                        {/* Live Price */}
                        <div className="bg-blue-900/10 p-3 rounded-lg border border-blue-500/20 flex justify-between items-center">
                            <span className="text-[10px] text-blue-400 uppercase font-bold flex items-center gap-1"><Activity size={10} className="animate-pulse" /> Preço Atual (Real-Time)</span>
                            <span className="text-blue-400 font-mono font-bold text-lg">{livePrice ? `$${livePrice.toLocaleString(undefined, { maximumFractionDigits: 4 })}` : '...'}</span>
                        </div>

                        {/* TP/SL Values */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-green-900/10 p-4 rounded-xl border border-green-500/20">
                                <div className="text-[10px] text-green-400 uppercase font-bold mb-1 flex items-center gap-1">
                                    <TrendingUp size={10} /> Take Profit
                                </div>
                                <div className="text-green-400 font-mono font-bold text-lg">${tpPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                                <div className="text-[9px] text-green-400/60 mt-1">+{tpPct}% do entry</div>
                            </div>
                            <div className="bg-red-900/10 p-4 rounded-xl border border-red-500/20">
                                <div className="text-[10px] text-red-400 uppercase font-bold mb-1 flex items-center gap-1">
                                    <TrendingDown size={10} /> Stop Loss
                                </div>
                                <div className="text-red-400 font-mono font-bold text-lg">${slPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                                <div className="text-[9px] text-red-400/60 mt-1">-{slPct}% do entry</div>
                            </div>
                        </div>

                        {asset.initialMargin && (
                            <div className="bg-black/20 p-3 rounded-lg border border-white/5 flex justify-between text-xs">
                                <span className="text-gray-500">Margem Inicial:</span>
                                <span className="text-white font-mono font-bold">${asset.initialMargin.toFixed(2)}</span>
                            </div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => handleClosePosition(asset)}
                                disabled={isClosing}
                                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                            >
                                <XCircle size={18} />
                                {isClosing ? 'Fechando...' : 'FECHAR POSIÇÃO'}
                            </button>
                            <button className="px-4 py-3 bg-[#2A303C] hover:bg-[#353C4B] text-gray-300 rounded-xl font-bold text-xs flex items-center gap-2 transition-colors">
                                <ExternalLink size={14} /> Ver na Corretora
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-6 animate-fade-in pb-10">
            {/* Metric Tooltip */}
            {metricTooltip && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setMetricTooltip(null)}>
                    <div className="bg-[#151A25] border border-[#2A303C] rounded-xl p-6 max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="text-white font-bold">O que é?</h4>
                            <button onClick={() => setMetricTooltip(null)} className="text-gray-400 hover:text-white"><X size={16} /></button>
                        </div>
                        <p className="text-gray-400 text-sm leading-relaxed">{metricTooltip}</p>
                    </div>
                </div>
            )}

            {/* Trade Detail Mini Modal */}
            {tradeDetailModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setTradeDetailModal(null)}>
                    <div className={`bg-[#151A25] border rounded-xl p-6 max-w-sm shadow-2xl ${tradeDetailModal === 'best' ? 'border-green-500/30' : 'border-red-500/30'}`} onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h4 className={`font-bold flex items-center gap-2 ${tradeDetailModal === 'best' ? 'text-green-400' : 'text-red-400'}`}>
                                {tradeDetailModal === 'best' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                {tradeDetailModal === 'best' ? 'Melhor Trade' : 'Pior Trade'}
                            </h4>
                            <button onClick={() => setTradeDetailModal(null)} className="text-gray-400 hover:text-white"><X size={16} /></button>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm"><span className="text-gray-500">Resultado</span><span className={`font-mono font-bold ${tradeDetailModal === 'best' ? 'text-green-400' : 'text-red-400'}`}>{tradeDetailModal === 'best' ? `+$${bestTrade.toFixed(2)}` : `$${worstTrade.toFixed(2)}`}</span></div>
                            <div className="flex justify-between text-sm"><span className="text-gray-500">Período</span><span className="text-white font-mono">{apiStats.totalTrades > 0 ? `Últimos ${apiStats.totalTrades} trades` : 'Últimos 500 trades'}</span></div>
                            <div className="flex justify-between text-sm"><span className="text-gray-500">Fonte</span><span className="text-white font-mono text-[11px]">Binance Futures API</span></div>
                        </div>
                    </div>
                </div>
            )}

            {/* Daily Target Reached Modal */}
            {showDailyTargetModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-[#151A25] border border-green-500/30 rounded-2xl p-8 max-w-md shadow-2xl text-center">
                        <div className="w-16 h-16 mx-auto mb-4 bg-green-500/20 rounded-full flex items-center justify-center">
                            <Trophy size={32} className="text-green-400" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">🎯 Meta Diária Atingida!</h3>
                        <p className="text-gray-400 mb-2">Lucro de <span className="text-green-400 font-bold">{dailyTargetPct}%</span> alcançado.</p>
                        <p className="text-gray-500 text-sm mb-6">Saldo inicial: ${dailyStartBalance.toFixed(2)} → Atual: ${totalBalance.toFixed(2)}</p>
                        <div className="flex gap-3">
                            <button
                                onClick={onContinueDay}
                                className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                            >
                                <PlayCircle size={18} />
                                Buscar mais {dailyTargetPct}%
                            </button>
                            <button
                                onClick={onEndDay}
                                className="flex-1 py-3 bg-red-600/80 hover:bg-red-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                            >
                                <StopCircle size={18} />
                                Finalizar o Dia
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {selectedOrder && <OrderModal asset={selectedOrder} onClose={() => setSelectedOrder(null)} />}

            {/* Dashboard Header - ALWAYS VISIBLE */}
            <div className="w-full bg-[#151A25] rounded-xl border border-[#2A303C] shadow-2xl overflow-hidden">
                <div className="p-4 flex justify-between items-center bg-[#1A1F2E]">
                    <div className="flex items-center gap-3">
                        <div className="text-white font-bold text-sm">Dashboard</div>
                        <button onClick={toggleHideBalance} className="text-gray-500 hover:text-white transition-colors p-1 rounded" title={hideBalance ? 'Mostrar valores' : 'Ocultar valores'}>
                            {hideBalance ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                    <button
                        onClick={() => setShowWidgetConfig(!showWidgetConfig)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold border transition-colors ${
                            showWidgetConfig 
                                ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' 
                                : 'bg-[#2A303C] hover:bg-[#353C4B] text-gray-400 border-gray-600'
                        }`}
                        title="Configurar widgets"
                    >
                        <Settings2 size={14} />
                        <span className="hidden sm:inline">Personalizar</span>
                    </button>
                </div>

                {/* Widget Config Panel - ALWAYS ACCESSIBLE */}
                {showWidgetConfig && (
                    <div className="p-4 border-t border-[#2A303C] bg-[#12161F] max-h-[60vh] overflow-auto">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-xs font-bold text-gray-400 uppercase">Arraste para reordenar • Clique para ocultar/mostrar</h4>
                            <button onClick={() => setShowWidgetConfig(false)} className="text-gray-500 hover:text-white" title="Fechar"><X size={14} /></button>
                        </div>
                        <div className="space-y-1">
                            {orderedWidgets.map((key, idx) => {
                                const w = widgetList.find(w => w.key === key);
                                if (!w) return null;
                                return (
                                    <div
                                        key={w.key}
                                        draggable
                                        onDragStart={(e) => { e.dataTransfer.setData('text/plain', w.key); e.currentTarget.classList.add('opacity-40'); }}
                                        onDragEnd={(e) => { e.currentTarget.classList.remove('opacity-40'); }}
                                        onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-cyan-400'); }}
                                        onDragLeave={(e) => { e.currentTarget.classList.remove('border-cyan-400'); }}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            e.currentTarget.classList.remove('border-cyan-400');
                                            const fromKey = e.dataTransfer.getData('text/plain');
                                            if (fromKey === w.key) return;
                                            setWidgetOrder(prev => {
                                                const list = [...orderedWidgets];
                                                const fromIdx = list.indexOf(fromKey);
                                                const toIdx = list.indexOf(w.key);
                                                if (fromIdx < 0 || toIdx < 0) return prev;
                                                list.splice(fromIdx, 1);
                                                list.splice(toIdx, 0, fromKey);
                                                localStorage.setItem('dashWidgetOrder', JSON.stringify(list));
                                                return list;
                                            });
                                        }}
                                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold transition-all cursor-grab active:cursor-grabbing ${
                                            isWidgetVisible(w.key)
                                                ? 'bg-cyan-500/10 border border-cyan-500/20'
                                                : 'bg-black/20 border border-gray-700/50'
                                        }`}
                                    >
                                        <GripVertical size={14} className="text-gray-600 flex-shrink-0" />
                                        <span className="text-[10px] text-gray-600 font-mono w-4">{idx + 1}</span>
                                        <button
                                            onClick={() => toggleWidget(w.key)}
                                            className="flex items-center gap-2 flex-1 text-left"
                                        >
                                            {isWidgetVisible(w.key) ? <Eye size={12} className="text-cyan-400" /> : <EyeOff size={12} className="text-gray-500" />}
                                            <span className={isWidgetVisible(w.key) ? 'text-cyan-400' : 'text-gray-500'}>{w.label}</span>
                                        </button>
                                        <div className="flex flex-col gap-0">
                                            <button onClick={() => moveWidget(w.key, -1)} disabled={idx === 0} className="text-gray-500 hover:text-white disabled:opacity-20 transition-colors p-0.5" title="Mover para cima">
                                                <ChevronUp size={10} />
                                            </button>
                                            <button onClick={() => moveWidget(w.key, 1)} disabled={idx === orderedWidgets.length - 1} className="text-gray-500 hover:text-white disabled:opacity-20 transition-colors p-0.5" title="Mover para baixo">
                                                <ChevronDown size={10} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* TradingView Chart (Optional) */}
            {isWidgetVisible('visaoGeral') && (
            <div className="w-full bg-[#151A25] rounded-xl border border-[#2A303C] shadow-2xl overflow-hidden relative">
                <div className="p-3 border-b border-[#2A303C] flex justify-between items-center bg-[#1A1F2E]">
                    <div className="text-gray-400 font-bold text-xs">Visão Geral: {selectedSymbol}</div>
                    <button
                        onClick={() => setShowChart(!showChart)}
                        className="flex items-center gap-2 px-3 py-1 bg-[#2A303C] hover:bg-[#353C4B] rounded text-xs font-bold text-gray-300 border border-gray-600 transition-colors"
                    >
                        {showChart ? <EyeOff size={14} /> : <BarChart2 size={14} />}
                        {showChart ? 'Ocultar' : 'Gráfico'}
                    </button>
                </div>
                {/* Mini CoinGecko-style static chart */}
                {!showChart && filteredEquityCurve.length > 1 && (
                    <div className="h-[80px] w-full px-4 py-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={filteredEquityCurve}>
                                <defs>
                                    <linearGradient id="miniGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={filteredEquityCurve[filteredEquityCurve.length - 1]?.value >= filteredEquityCurve[0]?.value ? '#10B981' : '#EF4444'} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={filteredEquityCurve[filteredEquityCurve.length - 1]?.value >= filteredEquityCurve[0]?.value ? '#10B981' : '#EF4444'} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <Area type="monotone" dataKey="value" stroke={filteredEquityCurve[filteredEquityCurve.length - 1]?.value >= filteredEquityCurve[0]?.value ? '#10B981' : '#EF4444'} strokeWidth={1.5} fill="url(#miniGrad)" dot={false} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                )}
                {showChart && (
                    <div className="h-[500px] w-full">
                        <TradingViewWidget symbol={selectedSymbol} />
                    </div>
                )}
            </div>
            )}

            {/* Main Metrics - Row 1 */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {isWidgetVisible('saldoTotal') && (
                <div className="bg-surface border border-card-border rounded-xl p-4 shadow-lg relative overflow-hidden">
                    <div className="text-[10px] uppercase font-bold text-gray-500 mb-1">Saldo Total</div>
                    <div className="text-2xl font-mono font-bold text-white">{hideBalance ? maskedValue : `$${totalBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}</div>
                    <div className="absolute top-3 right-3 p-2 bg-primary/10 rounded-lg text-primary"><DollarSign size={14} /></div>
                </div>
                )}

                {isWidgetVisible('pnl') && (
                <div className="bg-surface border border-card-border rounded-xl p-4 shadow-lg relative overflow-hidden cursor-pointer hover:border-blue-500/30 transition-colors" onClick={() => setMetricTooltip('PnL Não Realizado é o lucro ou prejuízo das suas posições abertas. Ele muda em tempo real conforme o preço dos ativos. Só se torna "realizado" quando você fecha a posição.')}>
                    <div className="text-[10px] uppercase font-bold text-gray-500 mb-1">PnL Não Realizado ⓘ</div>
                    <div className={`text-2xl font-mono font-bold ${unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {hideBalance ? maskedValue : `${unrealizedPnL >= 0 ? '+' : ''}$${unrealizedPnL.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
                    </div>
                    <div className="absolute top-3 right-3 p-2 bg-blue-500/10 rounded-lg text-blue-500"><Activity size={14} /></div>
                </div>
                )}

                {isWidgetVisible('positions') && (
                <div className="bg-surface border border-card-border rounded-xl p-4 shadow-lg relative overflow-hidden cursor-pointer hover:border-yellow-500/30 transition-colors" onClick={() => setMetricTooltip('Posições são os trades (ordens) atualmente abertos na sua conta. Cada posição representa um ativo sendo negociado com alavancagem.')}>
                    <div className="text-[10px] uppercase font-bold text-gray-500 mb-1">Posições ⓘ</div>
                    <div className="text-2xl font-mono font-bold text-white">{assets.length}</div>
                    <div className="absolute top-3 right-3 p-2 bg-yellow-500/10 rounded-lg text-yellow-500"><Layers size={14} /></div>
                </div>
                )}

                {isWidgetVisible('winrate') && (
                <div className="bg-surface border border-card-border rounded-xl p-4 shadow-lg relative overflow-hidden cursor-pointer hover:border-purple-500/30 transition-colors" onClick={() => setMetricTooltip('Win Rate é a porcentagem de trades lucrativos em relação ao total de trades realizados. Ex: 60% significa que de cada 10 trades, 6 foram positivos.')}>
                    <div className="text-[10px] uppercase font-bold text-gray-500 mb-1">Win Rate ⓘ</div>
                    <div className="text-2xl font-mono font-bold text-white">{winRate}%</div>
                    <div className="absolute top-3 right-3 p-2 bg-purple-500/10 rounded-lg text-purple-500"><PieChart size={14} /></div>
                </div>
                )}

                {isWidgetVisible('bestTrade') && (
                <div className="bg-surface border border-card-border rounded-xl p-4 shadow-lg relative overflow-hidden cursor-pointer hover:border-green-500/30 transition-colors" onClick={() => setTradeDetailModal('best')}>
                    <div className="text-[10px] uppercase font-bold text-gray-500 mb-1">Melhor Trade <span className="text-[8px] text-gray-600 normal-case">({apiStats.totalTrades > 0 ? `${apiStats.totalTrades} trades` : 'últimos 500'})</span></div>
                    <div className="text-2xl font-mono font-bold text-green-400">+${bestTrade.toFixed(2)}</div>
                    <div className="absolute top-3 right-3 p-2 bg-green-500/10 rounded-lg text-green-500"><TrendingUp size={14} /></div>
                </div>
                )}

                {isWidgetVisible('worstTrade') && (
                <div className="bg-surface border border-card-border rounded-xl p-4 shadow-lg relative overflow-hidden cursor-pointer hover:border-red-500/30 transition-colors" onClick={() => setTradeDetailModal('worst')}>
                    <div className="text-[10px] uppercase font-bold text-gray-500 mb-1">Pior Trade <span className="text-[8px] text-gray-600 normal-case">({apiStats.totalTrades > 0 ? `${apiStats.totalTrades} trades` : 'últimos 500'})</span></div>
                    <div className="text-2xl font-mono font-bold text-red-400">${worstTrade.toFixed(2)}</div>
                    <div className="absolute top-3 right-3 p-2 bg-red-500/10 rounded-lg text-red-500"><TrendingDown size={14} /></div>
                </div>
                )}
            </div>

            {/* Meta Diária + Capital por Perfil */}
            {(isWidgetVisible('dailyTarget') || isWidgetVisible('dailyBalance')) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Meta Diária Card */}
                {isWidgetVisible('dailyTarget') && (
                <div className="bg-surface border border-card-border rounded-xl p-4 shadow-lg">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2">
                            <Crosshair size={14} className="text-yellow-400" />
                            Meta Diária de Ganho
                        </h3>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                min="1"
                                max="100"
                                value={dailyTargetPct}
                                onChange={e => setDailyTargetPct?.(Math.max(1, Math.min(100, Number(e.target.value))))}
                                aria-label="Meta diária de ganho em porcentagem"
                                className="w-16 bg-black/30 border border-gray-600 rounded px-2 py-1 text-white text-xs font-mono text-center"
                            />
                            <span className="text-gray-500 text-xs">%</span>
                        </div>
                    </div>
                    {(() => {
                        const currentPnlPct = dailyStartBalance > 0 ? ((totalBalance - dailyStartBalance) / dailyStartBalance) * 100 : 0;
                        const progressPct = Math.min((currentPnlPct / dailyTargetPct) * 100, 100);
                        const pnlAmount = totalBalance - dailyStartBalance;
                        const isPos = pnlAmount >= 0;
                        return (
                            <div>
                                <div className="flex justify-between text-xs mb-2">
                                    <span className="text-gray-500">Progresso: <span className={isPos ? 'text-green-400' : 'text-red-400'}>{currentPnlPct.toFixed(2)}%</span> / {dailyTargetPct}%</span>
                                    <span className={`font-mono font-bold ${isPos ? 'text-green-400' : 'text-red-400'}`}>{isPos ? '+' : ''}${pnlAmount.toFixed(2)}</span>
                                </div>
                                <div className="w-full bg-black/30 rounded-full h-3 overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${dailyTargetReached ? 'bg-gradient-to-r from-green-500 to-emerald-400' : isPos ? 'bg-gradient-to-r from-primary to-cyan_brand' : 'bg-red-500'}`}
                                        style={{ width: `${Math.max(0, Math.min(progressPct, 100))}%` }}
                                    />
                                </div>
                                {dailyTargetReached && (
                                    <div className="mt-2 text-xs text-green-400 font-bold flex items-center gap-1">
                                        <Trophy size={12} /> Meta atingida!
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </div>
                )}

                {/* Saldo Inicial do Dia */}
                {isWidgetVisible('dailyBalance') && (
                <div className="bg-surface border border-card-border rounded-xl p-4 shadow-lg">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2">
                            <DollarSign size={14} className="text-cyan-400" />
                            Saldo do Dia
                        </h3>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div>
                            <div className="text-[10px] text-gray-500 uppercase mb-1">Início</div>
                            <div className="text-lg font-mono font-bold text-white">${dailyStartBalance.toFixed(2)}</div>
                        </div>
                        <div>
                            <div className="text-[10px] text-gray-500 uppercase mb-1">Atual</div>
                            <div className="text-lg font-mono font-bold text-white">${totalBalance.toFixed(2)}</div>
                        </div>
                        <div>
                            <div className="text-[10px] text-gray-500 uppercase mb-1">Ganhos</div>
                            <div className="text-lg font-mono font-bold text-green-400">
                                ${(() => {
                                    const gains = assets.filter(a => a.unrealizedPnL > 0).reduce((s, a) => s + a.unrealizedPnL, 0);
                                    return gains.toFixed(2);
                                })()}
                            </div>
                        </div>
                        <div>
                            <div className="text-[10px] text-gray-500 uppercase mb-1">Perdas</div>
                            <div className="text-lg font-mono font-bold text-red-400">
                                ${(() => {
                                    const losses = assets.filter(a => a.unrealizedPnL < 0).reduce((s, a) => s + a.unrealizedPnL, 0);
                                    return losses.toFixed(2);
                                })()}
                            </div>
                        </div>
                    </div>
                </div>
                )}
            </div>
            )}

            {/* Risk Mode Card */}
            {isWidgetVisible('riskMode') && (
            <div className="bg-surface border border-card-border rounded-xl p-4 shadow-lg">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2">
                        <ShieldAlert size={14} className="text-amber-400" />
                        Modo de Risco Ativo
                    </h3>
                    {circuitBreakerActive && (
                        <span className="text-[8px] bg-red-500 text-white px-2 py-0.5 rounded-full font-bold animate-pulse">CIRCUIT BREAKER</span>
                    )}
                </div>
                <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2.5 rounded-lg ${riskMode === 'general' ? 'bg-indigo-500/20' :
                        riskMode === 'profile' ? 'bg-purple-500/20' :
                            'bg-red-500/20'
                        }`}>
                        {riskMode === 'general' ? <Globe2 size={20} className="text-indigo-400" /> :
                            riskMode === 'profile' ? <Layers size={20} className="text-purple-400" /> :
                                <Unlock size={20} className="text-red-400" />}
                    </div>
                    <div>
                        <div className="text-sm font-bold text-white">
                            {riskMode === 'general' ? 'Geral' : riskMode === 'profile' ? 'Por Perfil' : 'Livre'}
                        </div>
                        <div className="text-[10px] text-gray-500">
                            {riskMode === 'free' ? 'Sem limites' : `Meta: +${dailyTargetPct}% | Stop: -${dailyStopLossPct}%`}
                        </div>
                    </div>
                </div>
                {riskMode !== 'free' && (
                    <div className="grid grid-cols-3 gap-2">
                        <div className="bg-green-500/10 rounded-lg p-2 text-center">
                            <div className="text-[8px] text-gray-500 uppercase">Meta</div>
                            <div className="text-xs font-bold text-green-400">+{dailyTargetPct}%</div>
                        </div>
                        <div className="bg-red-500/10 rounded-lg p-2 text-center">
                            <div className="text-[8px] text-gray-500 uppercase">Stop</div>
                            <div className="text-xs font-bold text-red-400">-{dailyStopLossPct}%</div>
                        </div>
                        <div className={`rounded-lg p-2 text-center ${consecutiveLosses >= 3 ? 'bg-orange-500/10' : 'bg-white/5'}`}>
                            <div className="text-[8px] text-gray-500 uppercase">Perdas</div>
                            <div className={`text-xs font-bold ${consecutiveLosses >= 5 ? 'text-red-400' : consecutiveLosses >= 3 ? 'text-orange-400' : 'text-gray-400'}`}>{consecutiveLosses}/5</div>
                        </div>
                    </div>
                )}
            </div>
            )}

            {/* Active Profiles with Capital */}
            {isWidgetVisible('activeProfiles') && (
            <div className="bg-surface border border-card-border rounded-xl p-4 shadow-lg">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2">
                        <Activity size={14} className="text-green-400" />
                        Perfis Ativos em Execução
                    </h3>
                    <span className="text-[10px] text-gray-500">{activeProfiles.length} de {profiles.length} ativos</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {(() => {
                        // Calculate top performer
                        const topProfile = profiles
                            .filter(p => p.active)
                            .reduce((best, p) => {
                                const diff = (p.currentCapital ?? p.capital) - p.capital;
                                const bestDiff = best ? ((best.currentCapital ?? best.capital) - best.capital) : -Infinity;
                                return diff > bestDiff ? p : best;
                            }, null as typeof profiles[0] | null);
                        const topId = topProfile?.id;

                        return [...profiles].sort((a, b) => (a.priority || 99) - (b.priority || 99)).map(profile => {
                            const currentCap = profile.currentCapital ?? profile.capital;
                            const capitalDiff = currentCap - profile.capital;
                            const capitalPct = profile.capital > 0 ? ((capitalDiff / profile.capital) * 100) : 0;
                            const isUp = capitalDiff >= 0;
                            const isTop = profile.id === topId && profile.active && capitalDiff > 0;

                            return (
                                <div
                                    key={profile.id}
                                    className={`p-3 rounded-xl border transition-all relative ${isTop
                                        ? 'bg-yellow-500/10 border-yellow-500/50 shadow-lg shadow-yellow-500/10'
                                        : profile.active
                                            ? 'bg-green-500/5 border-green-500/20'
                                            : 'bg-black/20 border-gray-700/50 opacity-60'
                                        }`}
                                >
                                    {isTop && (
                                        <div className="absolute -top-2 -right-2 bg-yellow-500 text-black text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-lg">
                                            🏆 Top
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${profile.active ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`} />
                                            <span className={`text-xs font-bold ${isTop ? 'text-yellow-300' : profile.active ? 'text-white' : 'text-gray-500'}`}>{profile.name}</span>
                                        </div>
                                        <span className="text-[9px] text-gray-500 bg-black/30 px-2 py-0.5 rounded">{profile.leverage}x</span>
                                    </div>
                                    <div className="flex items-end justify-between">
                                        <div>
                                            <div className="text-[9px] text-gray-500 uppercase">Capital</div>
                                            <div className={`text-sm font-mono font-bold ${isTop ? 'text-yellow-300' : 'text-white'}`}>${currentCap.toFixed(2)}</div>
                                        </div>
                                        <div className="text-right">
                                            <span className={`text-[10px] font-mono font-bold ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                                                {isUp ? '+' : ''}{capitalPct.toFixed(1)}%
                                            </span>
                                            {(profile.allocatedCapital || 0) > 0 && (
                                                <div className="text-[8px] text-amber-400 mt-0.5">Em uso: ${(profile.allocatedCapital || 0).toFixed(0)}</div>
                                            )}
                                        </div>
                                    </div>
                                    {/* Mini progress bar */}
                                    <div className="w-full bg-black/30 rounded-full h-1 mt-2 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${isTop ? 'bg-yellow-500' : isUp ? 'bg-green-500' : 'bg-red-500'}`}
                                            style={{ width: `${Math.min(100, Math.max(5, (currentCap / Math.max(profile.capital, 1)) * 50))}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        });
                    })()}
                </div>
            </div>
            )}

            {/* Charts + Orders */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Equity Curve - CoinGecko Style */}
                {isWidgetVisible('equityCurve') && (
                <div className="lg:col-span-2 bg-surface border border-card-border rounded-xl shadow-lg flex flex-col overflow-hidden">
                    {/* CoinGecko-style header with price + change */}
                    <div className="p-4 pb-2">
                        <div className="text-[10px] uppercase font-bold text-gray-500 mb-1">Patrimônio</div>
                        <div className="flex items-end gap-3 mb-2">
                            <span className="text-2xl font-mono font-bold text-white">
                                {hideBalance ? maskedValue : `$${totalBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
                            </span>
                            {filteredEquityCurve.length > 1 && (() => {
                                const first = filteredEquityCurve[0]?.value || 0;
                                const last = filteredEquityCurve[filteredEquityCurve.length - 1]?.value || 0;
                                const diff = last - first;
                                const pct = first > 0 ? ((diff / first) * 100) : 0;
                                const isUp = diff >= 0;
                                return (
                                    <span className={`text-sm font-bold flex items-center gap-0.5 ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                                        {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                        {isUp ? '+' : ''}{pct.toFixed(2)}%
                                    </span>
                                );
                            })()}
                        </div>
                        {/* Period buttons */}
                        <div className="flex gap-1 bg-black/20 p-1 rounded-lg w-fit">
                            {['1H', '1D', '1W', '1M', 'ALL'].map((range) => (
                                <button
                                    key={range}
                                    onClick={() => setTimeRange(range as any)}
                                    className={`px-3 py-1.5 text-[10px] font-bold rounded transition-colors ${timeRange === range ? 'bg-primary text-white' : 'text-gray-500 hover:text-gray-300'}`}
                                >
                                    {range === '1H' ? '1h' : range === '1D' ? '24h' : range === '1W' ? '7d' : range === '1M' ? '1M' : 'Máx'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Chart */}
                    <div className="flex-1 min-h-0 w-full h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={filteredEquityCurve} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                                <defs>
                                    <linearGradient id="colorEqCg" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={filteredEquityCurve.length > 1 && filteredEquityCurve[filteredEquityCurve.length - 1]?.value >= filteredEquityCurve[0]?.value ? '#10B981' : '#EF4444'} stopOpacity={0.15} />
                                        <stop offset="95%" stopColor={filteredEquityCurve.length > 1 && filteredEquityCurve[filteredEquityCurve.length - 1]?.value >= filteredEquityCurve[0]?.value ? '#10B981' : '#EF4444'} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="time" tick={{ fill: '#6B7280', fontSize: 9 }} minTickGap={50} axisLine={false} tickLine={false} />
                                <YAxis domain={['dataMin', 'dataMax']} tick={{ fill: '#6B7280', fontSize: 9 }} width={50} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${v.toLocaleString()}`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#151A25', borderColor: '#2A303C', fontSize: '12px', borderRadius: '8px' }}
                                    labelStyle={{ color: '#9CA3AF' }}
                                    formatter={(value: any) => [`$${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`, 'Saldo']}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke={filteredEquityCurve.length > 1 && filteredEquityCurve[filteredEquityCurve.length - 1]?.value >= filteredEquityCurve[0]?.value ? '#10B981' : '#EF4444'}
                                    strokeWidth={2}
                                    fill="url(#colorEqCg)"
                                    dot={false}
                                    animationDuration={500}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    {/* CoinGecko-style stats below chart */}
                    {filteredEquityCurve.length > 1 && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 pt-2 border-t border-[#2A303C]">
                            <div>
                                <div className="text-[9px] text-gray-500 uppercase">Mínimo ({timeRange === '1H' ? '1h' : timeRange === '1D' ? '24h' : timeRange === '1W' ? '7d' : timeRange === '1M' ? '1M' : 'Total'})</div>
                                <div className="text-xs font-mono font-bold text-white">${Math.min(...filteredEquityCurve.map(p => p.value)).toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                            </div>
                            <div>
                                <div className="text-[9px] text-gray-500 uppercase">Máximo</div>
                                <div className="text-xs font-mono font-bold text-white">${Math.max(...filteredEquityCurve.map(p => p.value)).toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                            </div>
                            <div>
                                <div className="text-[9px] text-gray-500 uppercase">Variação</div>
                                {(() => {
                                    const diff = (filteredEquityCurve[filteredEquityCurve.length - 1]?.value || 0) - (filteredEquityCurve[0]?.value || 0);
                                    return <div className={`text-xs font-mono font-bold ${diff >= 0 ? 'text-green-400' : 'text-red-400'}`}>{diff >= 0 ? '+' : ''}${diff.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>;
                                })()}
                            </div>
                            <div>
                                <div className="text-[9px] text-gray-500 uppercase">Pontos</div>
                                <div className="text-xs font-mono font-bold text-white">{filteredEquityCurve.length}</div>
                            </div>
                        </div>
                    )}
                </div>
                )}

                {/* Orders Panel */}
                {isWidgetVisible('ordersPanel') && (
                <div className="bg-surface border border-card-border rounded-xl shadow-lg flex flex-col h-[350px] overflow-hidden">
                    {/* Tabs */}
                    <div className="flex border-b border-[#2A303C]">
                        <button
                            onClick={() => setOrderTab('positive')}
                            className={`flex-1 py-3 text-xs font-bold uppercase flex items-center justify-center gap-2 transition-colors ${orderTab === 'positive'
                                ? 'bg-green-500/10 text-green-400 border-b-2 border-green-500'
                                : 'text-gray-500 hover:text-gray-300'
                                }`}
                        >
                            <TrendingUp size={14} />
                            Positivas ({positiveOrders.length})
                        </button>
                        <button
                            onClick={() => setOrderTab('negative')}
                            className={`flex-1 py-3 text-xs font-bold uppercase flex items-center justify-center gap-2 transition-colors ${orderTab === 'negative'
                                ? 'bg-red-500/10 text-red-400 border-b-2 border-red-500'
                                : 'text-gray-500 hover:text-gray-300'
                                }`}
                        >
                            <TrendingDown size={14} />
                            Negativas ({negativeOrders.length})
                        </button>
                    </div>

                    {/* Select All + Actions Bar */}
                    {displayedOrders.length > 0 && (
                        <div className="flex items-center justify-between px-3 py-2 border-b border-[#2A303C] bg-black/10">
                            <button
                                onClick={toggleSelectAll}
                                className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 hover:text-white transition-colors"
                            >
                                {displayedOrders.every(a => selectedPositions.has(a.symbol))
                                    ? <CheckSquare size={12} className="text-primary" />
                                    : <Square size={12} />
                                }
                                {displayedOrders.every(a => selectedPositions.has(a.symbol)) ? 'Desmarcar' : 'Selecionar Todas'}
                            </button>
                            <button onClick={() => { onRefresh?.(); fetchApiStats(); }} className="text-gray-500 hover:text-white transition-colors" title="Atualizar">
                                <RefreshCw size={12} />
                            </button>
                        </div>
                    )}

                    {/* Order List */}
                    <div className="flex-1 overflow-auto p-3 space-y-2 scrollbar-hide">
                        {displayedOrders.length > 0 ? displayedOrders.map(asset => {
                            const profileName = getProfileForAsset(asset.symbol);
                            const isSelected = selectedPositions.has(asset.symbol);
                            return (
                                <div
                                    key={asset.symbol}
                                    className={`flex flex-col gap-2 p-3 bg-black/20 rounded-lg border cursor-pointer group transition-all ${isSelected ? 'border-primary/60 bg-primary/5' : 'border-white/5 hover:border-primary/50'}`}
                                >
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); toggleSelection(asset.symbol); }}
                                                className="text-gray-500 hover:text-primary transition-colors flex-shrink-0"
                                            >
                                                {isSelected ? <CheckSquare size={16} className="text-primary" /> : <Square size={16} />}
                                            </button>
                                            <div onClick={() => setSelectedOrder(asset)}>
                                                <span className="font-bold text-white text-sm block">{asset.symbol}</span>
                                                <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${getProfileColor(profileName)}`}>
                                                    {profileName}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${asset.amount > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                                {asset.amount > 0 ? 'LONG' : 'SHORT'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-[10px] mt-1 border-t border-white/5 pt-2" onClick={() => setSelectedOrder(asset)}>
                                        <div className="text-gray-400 uppercase">Investido: <span className="text-yellow-400 font-mono font-bold">${asset.initialMargin?.toFixed(2) || '—'}</span></div>
                                        <div className="text-gray-400 uppercase text-right">PnL: <span className={`font-mono font-bold ${asset.unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>{asset.unrealizedPnL >= 0 ? '+' : ''}{asset.unrealizedPnL.toFixed(2)}</span></div>
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className="flex flex-col items-center justify-center py-10 opacity-50 h-full">
                                <Clock size={32} className="mb-2" />
                                <span className="text-xs uppercase font-bold text-center">
                                    Nenhuma ordem {orderTab === 'positive' ? 'positiva' : 'negativa'}.
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    {displayedOrders.length > 0 && (
                        <div className="p-3 border-t border-[#2A303C] space-y-2">
                            {selectedPositions.size > 0 && (
                                <button
                                    onClick={handleCloseSelected}
                                    disabled={isClosingSelected}
                                    className="w-full py-2 bg-orange-600/20 hover:bg-orange-600/40 text-orange-400 border border-orange-500/30 rounded-lg text-xs font-bold uppercase flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                                >
                                    <XCircle size={14} />
                                    {isClosingSelected ? 'Fechando...' : `Fechar Selecionadas (${selectedPositions.size})`}
                                </button>
                            )}
                            <button
                                onClick={() => handleCloseByTab(orderTab)}
                                disabled={isClosingAll}
                                className={`w-full py-2 ${orderTab === 'positive' ? 'bg-green-600/20 hover:bg-green-600/40 text-green-400 border-green-500/30' : 'bg-red-600/20 hover:bg-red-600/40 text-red-400 border-red-500/30'} border rounded-lg text-xs font-bold uppercase flex items-center justify-center gap-2 transition-colors disabled:opacity-50`}
                            >
                                <XCircle size={14} />
                                {isClosingAll ? 'Fechando...' : `Fechar ${orderTab === 'positive' ? 'Positivas' : 'Negativas'} (${displayedOrders.length})`}
                            </button>
                        </div>
                    )}
                </div>
                )}
            </div>

            {/* Trade History moved to dedicated History tab */}
        </div>
    );
};

export default DashboardOverview;