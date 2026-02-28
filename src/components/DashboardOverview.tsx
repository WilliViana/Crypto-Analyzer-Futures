import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Language, Trade, StrategyProfile, Exchange } from '../types';
import { TrendingUp, TrendingDown, Activity, DollarSign, PieChart, Layers, Clock, Target, BarChart2, EyeOff, X, Shield, ExternalLink, ArrowUpRight, ArrowDownRight, Percent, LineChart, Scale, Rocket, Zap, XCircle, CheckSquare, Square, RefreshCw } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, Tooltip, XAxis, YAxis, PieChart as RechartsPC, Pie, Cell } from 'recharts';
import TradingViewWidget from './TradingViewWidget';
import { closePosition, closeMultiplePositions, fetchTradeHistory, fetchIncomeHistory } from '../services/exchangeService';

interface DashboardOverviewProps {
    lang: Language;
    totalBalance: number;
    unrealizedPnL: number;
    assets: { symbol: string; amount: number; price: number; value: number; unrealizedPnL: number; initialMargin?: number; strategyName?: string }[];
    trades: Trade[];
    profiles?: StrategyProfile[];
    exchanges?: Exchange[];
    onRefresh?: () => void;
}

const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const DashboardOverview: React.FC<DashboardOverviewProps> = ({
    lang, totalBalance, unrealizedPnL, assets, trades, profiles = [], exchanges = [], onRefresh
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
    const [apiStats, setApiStats] = useState<{ bestTrade: number; worstTrade: number; winRate: number; totalTrades: number; equityCurve: { time: string; value: number }[] }>({ bestTrade: 0, worstTrade: 0, winRate: 0, totalTrades: 0, equityCurve: [] });

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
            // Group trades by orderId proximity (within 1s) for PnL calc
            const tradePnls = tradeHistory.filter(t => t.realizedPnl !== 0).map(t => t.realizedPnl);
            const best = tradePnls.length > 0 ? Math.max(...tradePnls) : 0;
            const worst = tradePnls.length > 0 ? Math.min(...tradePnls) : 0;
            const wins = tradePnls.filter(p => p > 0).length;
            const wr = tradePnls.length > 0 ? Math.round((wins / tradePnls.length) * 100) : 0;

            // Build equity curve from income history
            let cumulative = totalBalance;
            const sortedIncome = [...incomeHistory].sort((a, b) => a.time - b.time);
            const curve = sortedIncome.map(i => {
                cumulative += i.income;
                return { time: new Date(i.time).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), value: cumulative };
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

    // Filter trades by selected period
    const filteredTrades = useMemo(() => {
        if (timeRange === 'ALL') return trades;
        const now = new Date();
        const cutoff = new Date();
        if (timeRange === '1H') cutoff.setHours(now.getHours() - 1);
        if (timeRange === '1D') cutoff.setDate(now.getDate() - 1);
        if (timeRange === '1W') cutoff.setDate(now.getDate() - 7);
        if (timeRange === '1M') cutoff.setMonth(now.getMonth() - 1);
        return trades.filter(t => new Date(t.timestamp) >= cutoff);
    }, [trades, timeRange]);

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
            {selectedOrder && <OrderModal asset={selectedOrder} onClose={() => setSelectedOrder(null)} />}

            {/* TradingView Chart (Optional) */}
            <div className="w-full bg-[#151A25] rounded-xl border border-[#2A303C] shadow-2xl overflow-hidden relative">
                <div className="p-4 border-b border-[#2A303C] flex justify-between items-center bg-[#1A1F2E]">
                    <div className="text-white font-bold text-sm">Visão Geral: {selectedSymbol}</div>
                    <button
                        onClick={() => setShowChart(!showChart)}
                        className="flex items-center gap-2 px-3 py-1 bg-[#2A303C] hover:bg-[#353C4B] rounded text-xs font-bold text-gray-300 border border-gray-600 transition-colors"
                    >
                        {showChart ? <EyeOff size={14} /> : <BarChart2 size={14} />}
                        {showChart ? 'Ocultar Gráfico' : 'Ver Gráfico'}
                    </button>
                </div>
                {showChart && (
                    <div className="h-[500px] w-full">
                        <TradingViewWidget symbol={selectedSymbol} />
                    </div>
                )}
            </div>

            {/* Main Metrics - Row 1 */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                <div className="bg-surface border border-card-border rounded-xl p-4 shadow-lg relative overflow-hidden">
                    <div className="text-[10px] uppercase font-bold text-gray-500 mb-1">Saldo Total</div>
                    <div className="text-2xl font-mono font-bold text-white">${totalBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                    <div className="absolute top-3 right-3 p-2 bg-primary/10 rounded-lg text-primary"><DollarSign size={14} /></div>
                </div>

                <div className="bg-surface border border-card-border rounded-xl p-4 shadow-lg relative overflow-hidden">
                    <div className="text-[10px] uppercase font-bold text-gray-500 mb-1">PnL Não Realizado</div>
                    <div className={`text-2xl font-mono font-bold ${unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {unrealizedPnL >= 0 ? '+' : ''}${unrealizedPnL.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </div>
                    <div className="absolute top-3 right-3 p-2 bg-blue-500/10 rounded-lg text-blue-500"><Activity size={14} /></div>
                </div>

                <div className="bg-surface border border-card-border rounded-xl p-4 shadow-lg relative overflow-hidden">
                    <div className="text-[10px] uppercase font-bold text-gray-500 mb-1">Posições</div>
                    <div className="text-2xl font-mono font-bold text-white">{assets.length}</div>
                    <div className="absolute top-3 right-3 p-2 bg-yellow-500/10 rounded-lg text-yellow-500"><Layers size={14} /></div>
                </div>

                <div className="bg-surface border border-card-border rounded-xl p-4 shadow-lg relative overflow-hidden">
                    <div className="text-[10px] uppercase font-bold text-gray-500 mb-1">Win Rate</div>
                    <div className="text-2xl font-mono font-bold text-white">{winRate}%</div>
                    <div className="absolute top-3 right-3 p-2 bg-purple-500/10 rounded-lg text-purple-500"><PieChart size={14} /></div>
                </div>

                <div className="bg-surface border border-card-border rounded-xl p-4 shadow-lg relative overflow-hidden">
                    <div className="text-[10px] uppercase font-bold text-gray-500 mb-1">Melhor Trade <span className="text-[8px] text-gray-600 normal-case">({apiStats.totalTrades > 0 ? `${apiStats.totalTrades} trades` : 'últimos 500'})</span></div>
                    <div className="text-2xl font-mono font-bold text-green-400">+${bestTrade.toFixed(2)}</div>
                    <div className="absolute top-3 right-3 p-2 bg-green-500/10 rounded-lg text-green-500"><TrendingUp size={14} /></div>
                </div>

                <div className="bg-surface border border-card-border rounded-xl p-4 shadow-lg relative overflow-hidden">
                    <div className="text-[10px] uppercase font-bold text-gray-500 mb-1">Pior Trade <span className="text-[8px] text-gray-600 normal-case">({apiStats.totalTrades > 0 ? `${apiStats.totalTrades} trades` : 'últimos 500'})</span></div>
                    <div className="text-2xl font-mono font-bold text-red-400">${worstTrade.toFixed(2)}</div>
                    <div className="absolute top-3 right-3 p-2 bg-red-500/10 rounded-lg text-red-500"><TrendingDown size={14} /></div>
                </div>
            </div>

            {/* Active Profiles Indicator */}
            <div className="bg-surface border border-card-border rounded-xl p-4 shadow-lg">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2">
                        <Activity size={14} className="text-green-400" />
                        Perfis Ativos em Execução
                    </h3>
                    <span className="text-[10px] text-gray-500">{activeProfiles.length} de {profiles.length} ativos</span>
                </div>
                <div className="flex flex-wrap gap-2">
                    {profiles.map(profile => (
                        <div
                            key={profile.id}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold transition-all ${profile.active
                                ? 'bg-green-500/10 border-green-500/30 text-green-400'
                                : 'bg-black/20 border-gray-700 text-gray-600'
                                }`}
                        >
                            <div className={`w-2 h-2 rounded-full ${profile.active ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`} />
                            {profile.name}
                        </div>
                    ))}
                </div>
            </div>

            {/* Charts + Orders */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Equity Curve */}
                <div className="lg:col-span-2 bg-surface border border-card-border rounded-xl p-6 shadow-lg flex flex-col h-[350px]">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase"><TrendingUp size={16} className="text-primary" /> Curva de Patrimônio</h3>
                        <div className="flex gap-1 bg-black/20 p-1 rounded-lg">
                            {['1H', '1D', '1W', '1M', 'ALL'].map((range) => (
                                <button
                                    key={range}
                                    onClick={() => setTimeRange(range as any)}
                                    className={`px-3 py-1 text-[10px] font-bold rounded transition-colors ${timeRange === range ? 'bg-primary text-white' : 'text-gray-500 hover:text-gray-300'}`}
                                >
                                    {range}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 min-h-0 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={apiStats.equityCurve.length > 0 ? apiStats.equityCurve : historyData.length > 0 ? historyData : sessionHistory}>
                                <defs>
                                    <linearGradient id="colorEq" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#2A303C" vertical={false} />
                                <XAxis dataKey="time" tick={{ fill: '#6B7280', fontSize: 10 }} minTickGap={30} />
                                <YAxis domain={['auto', 'auto']} tick={{ fill: '#6B7280', fontSize: 10 }} width={40} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#151A25', borderColor: '#2A303C', fontSize: '12px' }}
                                    labelStyle={{ color: '#9CA3AF' }}
                                    formatter={(value: any) => [`$${value.toLocaleString()}`, 'Saldo']}
                                />
                                <Area type="monotone" dataKey="value" stroke="#6366F1" strokeWidth={2} fill="url(#colorEq)" animationDuration={500} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Orders Panel */}
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
            </div>

            {/* Trade History */}
            <div className="bg-surface border border-card-border rounded-xl shadow-lg overflow-hidden">
                <div className="p-4 border-b border-card-border flex justify-between items-center bg-black/20">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase">
                        <Clock size={16} className="text-primary" /> Histórico de Trades
                    </h3>
                    <span className="text-[10px] text-gray-500 font-bold">{filteredTrades.length} trades ({timeRange})</span>
                </div>
                <div className="overflow-auto max-h-[450px] scrollbar-hide">
                    {filteredTrades.length > 0 ? (
                        <table className="w-full text-xs">
                            <thead className="sticky top-0 bg-surface">
                                <tr className="text-gray-500 uppercase text-[9px] border-b border-card-border">
                                    <th className="text-left p-3">Par</th>
                                    <th className="text-left p-3">Lado</th>
                                    <th className="text-right p-3">Qtd</th>
                                    <th className="text-right p-3">Entrada</th>
                                    <th className="text-right p-3">PnL</th>
                                    <th className="text-right p-3">Status</th>
                                    <th className="text-right p-3">Data</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTrades.slice(0, 50).map((trade, i) => (
                                    <tr key={trade.id || i} className="border-b border-card-border/30 hover:bg-white/5 transition-colors">
                                        <td className="p-3 font-bold text-white">{trade.symbol}</td>
                                        <td className="p-3">
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${trade.side === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                                {trade.side}
                                            </span>
                                        </td>
                                        <td className="p-3 text-right font-mono text-gray-300">{trade.amount}</td>
                                        <td className="p-3 text-right font-mono text-gray-300">${trade.entryPrice?.toFixed(2)}</td>
                                        <td className={`p-3 text-right font-mono font-bold ${trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                                        </td>
                                        <td className="p-3 text-right">
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${trade.status === 'OPEN' ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'}`}>
                                                {trade.status || 'OPEN'}
                                            </span>
                                        </td>
                                        <td className="p-3 text-right text-gray-500 text-[10px]">
                                            {trade.timestamp ? new Date(trade.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-10 opacity-40">
                            <Clock size={28} className="mb-2" />
                            <span className="text-xs font-bold uppercase">Nenhum trade registrado</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DashboardOverview;