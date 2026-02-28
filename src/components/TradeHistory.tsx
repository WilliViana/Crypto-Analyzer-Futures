
import React, { useState, useMemo, useEffect } from 'react';
import { Trade, Language, Exchange } from '../types';
import { translations } from '../utils/translations';
import { ArrowUp, ArrowDown, History, Search, Download, Filter, Target, DollarSign, RefreshCw, Activity } from 'lucide-react';
import { fetchTradeHistory } from '../services/exchangeService';

interface TradeHistoryProps {
    trades: Trade[];
    lang: Language;
    exchanges?: Exchange[];
}

const TradeHistory: React.FC<TradeHistoryProps> = ({ trades: localTrades, lang, exchanges = [] }) => {
    const t = translations[lang].trade_history;
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'time', direction: 'desc' });
    const [apiTrades, setApiTrades] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

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

    // Merge API trades with local trades
    const allTrades = useMemo(() => {
        const fromApi = apiTrades.map((t: any) => ({
            id: t.id?.toString() || Math.random().toString(),
            symbol: t.symbol || '',
            side: t.side === 'BUY' ? 'LONG' : 'SHORT',
            entryPrice: parseFloat(t.price) || 0,
            amount: parseFloat(t.qty) || 0,
            pnl: parseFloat(t.realizedPnl) || 0,
            status: 'CLOSED',
            timestamp: t.time ? new Date(t.time).toLocaleString('pt-BR') : '',
            strategyName: t.strategyName || '-',
            commission: parseFloat(t.commission) || 0,
        }));
        return fromApi.length > 0 ? fromApi : localTrades.map(t => ({ ...t, commission: 0 }));
    }, [apiTrades, localTrades]);

    const sortedTrades = useMemo(() => {
        let sortable = [...allTrades];
        if (searchTerm) {
            sortable = sortable.filter((trade: any) =>
                trade.symbol?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                trade.side?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
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
    }, [allTrades, sortConfig, searchTerm]);

    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };

    const totalPnl = allTrades.reduce((a: number, b: any) => a + (b.pnl || 0), 0);
    const winCount = allTrades.filter((t: any) => t.pnl > 0).length;
    const winRate = allTrades.length > 0 ? Math.round((winCount / allTrades.length) * 100) : 0;
    const bestTrade = allTrades.length > 0 ? Math.max(...allTrades.map((t: any) => t.pnl || 0)) : 0;

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
                    <span className="text-[10px] text-gray-500 font-mono">{allTrades.length} trades da API</span>
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
                        <p className="text-xl font-mono font-bold text-white">{allTrades.length}</p>
                    </div>
                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500"><History size={18} /></div>
                </div>
            </div>

            <div className="bg-surface border border-card-border rounded-xl p-4 flex gap-4 items-center shadow-lg shrink-0">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                    <input
                        type="text"
                        placeholder={t.search_placeholder}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-black/40 border border-card-border rounded-lg pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-primary transition-colors"
                    />
                </div>
                <button className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white" aria-label="Filter"><Filter size={18} /></button>
            </div>

            <div className="bg-surface border border-card-border rounded-xl shadow-lg flex-1 overflow-hidden flex flex-col min-h-0">
                <div className="overflow-auto flex-1 scrollbar-hide">
                    <table className="w-full text-left text-[11px] md:text-xs text-gray-400 border-collapse">
                        <thead className="bg-black/40 sticky top-0 z-10 text-[10px] uppercase font-bold text-gray-500 border-b border-card-border">
                            <tr>
                                {[
                                    { key: 'symbol', label: 'Par' },
                                    { key: 'side', label: 'Lado' },
                                    { key: 'entryPrice', label: 'Preço' },
                                    { key: 'amount', label: 'Quantidade' },
                                    { key: 'pnl', label: 'PnL' },
                                    { key: 'commission', label: 'Taxa' },
                                    { key: 'timestamp', label: 'Data/Hora' },
                                ].map(col => (
                                    <th key={col.key} className="p-4 cursor-pointer hover:text-white transition-colors" onClick={() => requestSort(col.key)}>
                                        <div className="flex items-center gap-1">
                                            {col.label}
                                            {sortConfig?.key === col.key && (sortConfig.direction === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />)}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 font-mono">
                            {sortedTrades.length > 0 ? sortedTrades.map((trade: any, i: number) => (
                                <tr key={trade.id || i} className="hover:bg-white/5 transition-colors">
                                    <td className="p-4 font-bold text-white">{trade.symbol?.replace('USDT', '/USDT')}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-0.5 rounded-[4px] font-bold ${trade.side === 'LONG' || trade.side === 'BUY' ? 'text-green-400 bg-green-500/10 border border-green-500/20' : 'text-red-400 bg-red-500/10 border border-red-500/20'}`}>
                                            {trade.side}
                                        </span>
                                    </td>
                                    <td className="p-4">${trade.entryPrice?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    <td className="p-4">{Math.abs(trade.amount)?.toFixed(4)}</td>
                                    <td className={`p-4 font-bold ${trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {trade.pnl > 0 ? '+' : ''}${trade.pnl?.toFixed(4)}
                                    </td>
                                    <td className="p-4 text-gray-500">${trade.commission?.toFixed(4)}</td>
                                    <td className="p-4 text-[10px] text-gray-500">{trade.timestamp}</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={7} className="p-20 text-center text-gray-600 italic uppercase tracking-widest text-xs">
                                        {isLoading ? 'Carregando trades da API Binance...' : 'Nenhum registro encontrado no histórico.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="p-3 border-t border-card-border bg-black/20 text-[10px] text-gray-500 flex justify-between uppercase font-bold tracking-tighter">
                    <span>Total: {sortedTrades.length} registros</span>
                    <span>Fonte: Binance Futures API</span>
                </div>
            </div>
        </div>
    );
};

export default TradeHistory;
