
import React, { useState, useMemo, useEffect } from 'react';
import { Trade, Language, Exchange, StrategyProfile } from '../types';
import { translations } from '../utils/translations';
import { ArrowUp, ArrowDown, History, Search, Filter, Target, DollarSign, Activity, ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import { fetchTradeHistory } from '../services/exchangeService';
import { supabase } from '../services/supabaseClient';

interface TradeHistoryProps {
    trades: Trade[];
    lang: Language;
    exchanges?: Exchange[];
    profiles?: StrategyProfile[];
}

const PAGE_SIZES = [10, 50, 100];

const TradeHistory: React.FC<TradeHistoryProps> = ({ trades: localTrades, lang, exchanges = [], profiles = [] }) => {
    const t = translations[lang].trade_history;
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'time', direction: 'desc' });
    const [apiTrades, setApiTrades] = useState<any[]>([]);
    const [dbTrades, setDbTrades] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [profileFilter, setProfileFilter] = useState('all');
    const [pageSize, setPageSize] = useState(50);
    const [currentPage, setCurrentPage] = useState(1);

    // Fetch trades from Binance API
    useEffect(() => {
        const fetchTrades = async () => {
            const activeExchange = exchanges.find(e => e.status === 'CONNECTED');
            if (!activeExchange) return;
            setIsLoading(true);
            try {
                const data = await fetchTradeHistory(activeExchange);
                setApiTrades(data || []);
            } catch (e) {
                console.error('Failed to fetch trade history:', e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchTrades();
    }, [exchanges]);

    // Fetch trade_logs from Supabase (com strategy_name)
    useEffect(() => {
        const fetchDbTrades = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user?.id) return;
            const { data, error } = await supabase
                .from('trade_logs')
                .select('*')
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: false })
                .limit(500);
            if (!error && data) {
                setDbTrades(data);
            }
        };
        fetchDbTrades();
    }, []);

    // Build profile map from trade_logs (client_order_id -> strategy_name)
    const profileMap = useMemo(() => {
        const map: Record<string, string> = {};
        dbTrades.forEach((t: any) => {
            if (t.client_order_id) map[t.client_order_id] = t.strategy_name || '-';
            if (t.symbol) {
                // Also map by symbol for matching
                if (!map[`sym_${t.symbol}`]) map[`sym_${t.symbol}`] = t.strategy_name || '-';
            }
        });
        // Also try localStorage profileMap
        try {
            const stored = JSON.parse(localStorage.getItem('profileMap') || '{}');
            Object.entries(stored).forEach(([sym, name]) => {
                if (!map[`sym_${sym}`]) map[`sym_${sym}`] = name as string;
            });
        } catch { }
        return map;
    }, [dbTrades]);

    // Merge API trades with local trades + profile info
    const allTrades = useMemo(() => {
        const fromApi = apiTrades.map((t: any) => {
            const orderId = t.orderId?.toString() || t.id?.toString() || '';
            const symbol = t.symbol || '';
            const stratName = profileMap[orderId] || profileMap[`sym_${symbol}`] || '-';
            return {
                id: orderId || Math.random().toString(),
                symbol,
                side: t.side === 'BUY' ? 'LONG' : 'SHORT',
                entryPrice: parseFloat(t.price) || 0,
                amount: parseFloat(t.qty) || 0,
                pnl: parseFloat(t.realizedPnl) || 0,
                status: 'CLOSED',
                timestamp: t.time ? new Date(t.time).toLocaleString('pt-BR') : '',
                rawTime: t.time || 0,
                strategyName: stratName,
                commission: parseFloat(t.commission) || 0,
            };
        });

        // Also add trades from trade_logs that might not be in API
        const apiIds = new Set(fromApi.map(t => t.id));
        const fromDb = dbTrades
            .filter((t: any) => !apiIds.has(t.client_order_id))
            .map((t: any) => ({
                id: t.id,
                symbol: t.symbol || '',
                side: t.side || 'BUY',
                entryPrice: parseFloat(t.entry_price) || 0,
                amount: parseFloat(t.amount) || 0,
                pnl: parseFloat(t.pnl) || 0,
                status: t.status || 'OPEN',
                timestamp: t.created_at ? new Date(t.created_at).toLocaleString('pt-BR') : '',
                rawTime: t.created_at ? new Date(t.created_at).getTime() : 0,
                strategyName: t.strategy_name || '-',
                commission: 0,
            }));

        const merged = [...fromApi, ...fromDb];
        return merged.length > 0 ? merged : localTrades.map(t => ({ ...t, commission: 0, strategyName: '-', rawTime: 0 }));
    }, [apiTrades, dbTrades, localTrades, profileMap]);

    // Filter + sort + paginate
    const filteredTrades = useMemo(() => {
        let sortable = [...allTrades];
        // Profile filter
        if (profileFilter !== 'all') {
            sortable = sortable.filter((trade: any) => trade.strategyName === profileFilter);
        }
        // Search filter
        if (searchTerm) {
            sortable = sortable.filter((trade: any) =>
                trade.symbol?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                trade.side?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                trade.strategyName?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        // Sort
        if (sortConfig) {
            sortable.sort((a: any, b: any) => {
                const aVal = a[sortConfig.key] ?? '';
                const bVal = b[sortConfig.key] ?? '';
                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortable;
    }, [allTrades, sortConfig, searchTerm, profileFilter]);

    // Pagination
    const totalPages = Math.max(1, Math.ceil(filteredTrades.length / pageSize));
    const paginatedTrades = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredTrades.slice(start, start + pageSize);
    }, [filteredTrades, currentPage, pageSize]);

    // Reset page when filters change
    useEffect(() => { setCurrentPage(1); }, [profileFilter, searchTerm, pageSize]);

    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };

    const totalPnl = filteredTrades.reduce((a: number, b: any) => a + (b.pnl || 0), 0);
    const winCount = filteredTrades.filter((t: any) => t.pnl > 0).length;
    const winRate = filteredTrades.length > 0 ? Math.round((winCount / filteredTrades.length) * 100) : 0;
    const bestTrade = filteredTrades.length > 0 ? Math.max(...filteredTrades.map((t: any) => t.pnl || 0)) : 0;

    // Unique profile names for filter dropdown
    const profileNames = useMemo(() => {
        const names = new Set(allTrades.map((t: any) => t.strategyName).filter((n: string) => n && n !== '-'));
        // Also add from profiles prop
        profiles.forEach(p => names.add(p.name));
        return Array.from(names).sort();
    }, [allTrades, profiles]);

    return (
        <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto w-full animate-fade-in text-gray-200 h-full flex flex-col overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20 shadow-lg">
                        <History className="text-purple-400" size={28} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white tracking-tighter uppercase">{t.title}</h2>
                        <p className="text-xs text-gray-500 uppercase font-mono tracking-widest">{t.desc}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isLoading && <Activity size={14} className="text-primary animate-spin" />}
                    <span className="text-[10px] text-gray-500 font-mono">{allTrades.length} trades | {filteredTrades.length} filtrados</span>
                </div>
            </div>

            {/* SUMMARY STATS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
                <div className="bg-surface border border-card-border rounded-xl p-4 shadow-lg flex items-center justify-between">
                    <div>
                        <p className="text-[10px] uppercase font-bold text-gray-500">PnL Total</p>
                        <p className={`text-xl font-mono font-bold ${totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            ${totalPnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                    <div className="p-2 bg-green-500/10 rounded-lg text-green-500"><DollarSign size={18} /></div>
                </div>
                <div className="bg-surface border border-card-border rounded-xl p-4 shadow-lg flex items-center justify-between">
                    <div>
                        <p className="text-[10px] uppercase font-bold text-gray-500">Win Rate</p>
                        <p className="text-xl font-mono font-bold text-purple-400">{winRate}%</p>
                    </div>
                    <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500"><Target size={18} /></div>
                </div>
                <div className="bg-surface border border-card-border rounded-xl p-4 shadow-lg flex items-center justify-between">
                    <div>
                        <p className="text-[10px] uppercase font-bold text-gray-500">Melhor Trade</p>
                        <p className="text-xl font-mono font-bold text-green-400">+${bestTrade.toFixed(2)}</p>
                    </div>
                    <div className="p-2 bg-green-500/10 rounded-lg text-green-500"><ArrowUp size={18} /></div>
                </div>
                <div className="bg-surface border border-card-border rounded-xl p-4 shadow-lg flex items-center justify-between">
                    <div>
                        <p className="text-[10px] uppercase font-bold text-gray-500">Trades Realizados</p>
                        <p className="text-xl font-mono font-bold text-white">{filteredTrades.length}</p>
                    </div>
                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500"><History size={18} /></div>
                </div>
            </div>

            {/* FILTERS BAR */}
            <div className="bg-surface border border-card-border rounded-xl p-4 flex flex-wrap gap-4 items-center shadow-lg shrink-0">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                    <input
                        type="text"
                        placeholder={t.search_placeholder}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-black/40 border border-card-border rounded-lg pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-primary transition-colors"
                    />
                </div>
                {/* Profile Filter */}
                <div className="flex items-center gap-2">
                    <Layers size={14} className="text-gray-500" />
                    <select
                        value={profileFilter}
                        onChange={(e) => setProfileFilter(e.target.value)}
                        className="bg-black/40 border border-card-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary cursor-pointer"
                        aria-label="Filtrar por perfil"
                    >
                        <option value="all">Todos os Perfis</option>
                        {profileNames.map(name => (
                            <option key={name} value={name}>{name}</option>
                        ))}
                    </select>
                </div>
                {/* Page Size */}
                <div className="flex items-center gap-2">
                    <Filter size={14} className="text-gray-500" />
                    <select
                        value={pageSize}
                        onChange={(e) => setPageSize(Number(e.target.value))}
                        className="bg-black/40 border border-card-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary cursor-pointer"
                        aria-label="Registros por página"
                    >
                        {PAGE_SIZES.map(s => (
                            <option key={s} value={s}>{s} registros</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="bg-surface border border-card-border rounded-xl shadow-lg flex-1 overflow-hidden flex flex-col min-h-0">
                <div className="overflow-auto flex-1 scrollbar-hide">
                    <table className="w-full text-left text-[11px] md:text-xs text-gray-400 border-collapse">
                        <thead className="bg-black/40 sticky top-0 z-10 text-[10px] uppercase font-bold text-gray-500 border-b border-card-border">
                            <tr>
                                {[
                                    { key: 'symbol', label: 'Par' },
                                    { key: 'side', label: 'Lado' },
                                    { key: 'strategyName', label: 'Perfil' },
                                    { key: 'entryPrice', label: 'Preço' },
                                    { key: 'amount', label: 'Quantidade' },
                                    { key: 'pnl', label: 'PnL' },
                                    { key: 'commission', label: 'Taxa' },
                                    { key: 'status', label: 'Status' },
                                    { key: 'timestamp', label: 'Data/Hora' },
                                ].map(col => (
                                    <th key={col.key} className="p-3 cursor-pointer hover:text-white transition-colors" onClick={() => requestSort(col.key)}>
                                        <div className="flex items-center gap-1">
                                            {col.label}
                                            {sortConfig?.key === col.key && (sortConfig.direction === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />)}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 font-mono">
                            {paginatedTrades.length > 0 ? paginatedTrades.map((trade: any, i: number) => (
                                <tr key={trade.id || i} className="hover:bg-white/5 transition-colors">
                                    <td className="p-3 font-bold text-white">{trade.symbol?.replace('USDT', '/USDT')}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-0.5 rounded-[4px] font-bold ${trade.side === 'LONG' || trade.side === 'BUY' ? 'text-green-400 bg-green-500/10 border border-green-500/20' : 'text-red-400 bg-red-500/10 border border-red-500/20'}`}>
                                            {trade.side}
                                        </span>
                                    </td>
                                    <td className="p-3">
                                        <span className={`px-2 py-0.5 rounded-[4px] text-[10px] font-bold ${
                                            trade.strategyName === '-' ? 'text-gray-600' : 'text-cyan-400 bg-cyan-500/10 border border-cyan-500/20'
                                        }`}>
                                            {trade.strategyName}
                                        </span>
                                    </td>
                                    <td className="p-3">${trade.entryPrice?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    <td className="p-3">{Math.abs(trade.amount)?.toFixed(4)}</td>
                                    <td className={`p-3 font-bold ${trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {trade.pnl > 0 ? '+' : ''}${trade.pnl?.toFixed(4)}
                                    </td>
                                    <td className="p-3 text-gray-500">${trade.commission?.toFixed(4)}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-0.5 rounded-[4px] text-[10px] font-bold ${
                                            trade.status === 'OPEN' ? 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/20' : 'text-gray-400 bg-gray-500/10 border border-gray-500/20'
                                        }`}>
                                            {trade.status}
                                        </span>
                                    </td>
                                    <td className="p-3 text-[10px] text-gray-500">{trade.timestamp}</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={9} className="p-20 text-center text-gray-600 italic uppercase tracking-widest text-xs">
                                        {isLoading ? 'Carregando trades da API Binance...' : 'Nenhum registro encontrado no histórico.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {/* PAGINATION FOOTER */}
                <div className="p-3 border-t border-card-border bg-black/20 text-[10px] text-gray-500 flex items-center justify-between uppercase font-bold tracking-tighter shrink-0">
                    <span>Total: {filteredTrades.length} registros | Página {currentPage}/{totalPages}</span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage <= 1}
                            className="p-1 hover:bg-white/5 rounded disabled:opacity-30 transition-colors"
                            aria-label="Página anterior"
                        >
                            <ChevronLeft size={14} />
                        </button>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let page: number;
                            if (totalPages <= 5) {
                                page = i + 1;
                            } else if (currentPage <= 3) {
                                page = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                                page = totalPages - 4 + i;
                            } else {
                                page = currentPage - 2 + i;
                            }
                            return (
                                <button
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${currentPage === page ? 'bg-primary/20 text-primary border border-primary/30' : 'hover:bg-white/5 text-gray-500'}`}
                                >
                                    {page}
                                </button>
                            );
                        })}
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage >= totalPages}
                            className="p-1 hover:bg-white/5 rounded disabled:opacity-30 transition-colors"
                            aria-label="Próxima página"
                        >
                            <ChevronRight size={14} />
                        </button>
                    </div>
                    <span>Fonte: Binance Futures API + Supabase</span>
                </div>
            </div>
        </div>
    );
};

export default TradeHistory;
