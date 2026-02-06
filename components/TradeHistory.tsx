
import React, { useState, useMemo } from 'react';
import { Trade, Language } from '../types';
import { translations } from '../utils/translations';
import { ArrowUp, ArrowDown, History, Search, Download, Filter, Target } from 'lucide-react';

interface TradeHistoryProps {
  trades: Trade[];
  lang: Language;
}

const TradeHistory: React.FC<TradeHistoryProps> = ({ trades, lang }) => {
  const t = translations[lang].trade_history;
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Trade; direction: 'asc' | 'desc' } | null>({ key: 'timestamp', direction: 'desc' });

  const sortedTrades = useMemo(() => {
    let sortableTrades = Array.isArray(trades) ? [...trades] : [];
    if (searchTerm) {
        sortableTrades = sortableTrades.filter(trade => 
            trade.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
            trade.side.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (trade.strategyName && trade.strategyName.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }
    if (sortConfig !== null) {
      sortableTrades.sort((a, b) => {
        const aValue = a[sortConfig.key] ?? '';
        const bValue = b[sortConfig.key] ?? '';
        
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableTrades;
  }, [trades, sortConfig, searchTerm]);

  const requestSort = (key: keyof Trade) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

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
            <button className="bg-black/40 hover:bg-black/60 border border-card-border hover:border-gray-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold transition-all text-xs">
                <Download size={14} /> EXPORTAR CSV
            </button>
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
            <button className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white"><Filter size={18} /></button>
        </div>

        <div className="bg-surface border border-card-border rounded-xl shadow-lg flex-1 overflow-hidden flex flex-col min-h-0">
            <div className="overflow-auto flex-1 scrollbar-hide">
                <table className="w-full text-left text-[11px] md:text-xs text-gray-400 border-collapse">
                    <thead className="bg-black/40 sticky top-0 z-10 text-[10px] uppercase font-bold text-gray-500 border-b border-card-border">
                        <tr>
                            {['symbol', 'strategyName', 'side', 'entryPrice', 'exitPrice', 'amount', 'pnl', 'status', 'timestamp'].map((key) => (
                                <th 
                                    key={key} 
                                    className="p-4 cursor-pointer hover:text-white transition-colors"
                                    onClick={() => requestSort(key as keyof Trade)}
                                >
                                    <div className="flex items-center gap-1">
                                        {key === 'symbol' ? t.col_symbol : key === 'strategyName' ? t.col_strategy : key === 'side' ? t.col_side : key === 'entryPrice' ? t.col_entry : key === 'exitPrice' ? t.col_exit : key === 'amount' ? t.col_amount : key === 'pnl' ? t.col_pnl : key === 'status' ? t.col_status : t.col_time}
                                        {sortConfig?.key === key && (sortConfig.direction === 'asc' ? <ArrowUp size={10}/> : <ArrowDown size={10}/>)}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono">
                        {sortedTrades.length > 0 ? sortedTrades.map((trade) => (
                            <tr key={trade.id} className="hover:bg-white/5 transition-colors">
                                <td className="p-4 font-bold text-white">{trade.symbol}</td>
                                <td className="p-4">
                                    <div className="flex items-center gap-1.5">
                                        <Target size={12} className="text-purple-400" />
                                        <span className="text-gray-300 font-bold text-[10px] uppercase bg-white/5 px-2 py-0.5 rounded">{trade.strategyName || 'MANUAL'}</span>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <span className={`px-2 py-0.5 rounded-[4px] font-bold ${trade.side === 'LONG' ? 'text-green-400 bg-green-500/10 border border-green-500/20' : 'text-red-400 bg-red-500/10 border border-red-500/20'}`}>
                                        {trade.side}
                                    </span>
                                </td>
                                <td className="p-4">${trade.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                <td className="p-4 text-gray-300">{trade.exitPrice ? `$${trade.exitPrice.toLocaleString()}` : '-'}</td>
                                <td className="p-4">{trade.amount}</td>
                                <td className={`p-4 font-bold ${trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {trade.pnl > 0 ? '+' : ''}{trade.pnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </td>
                                <td className="p-4 text-center">
                                    <span className={`inline-flex items-center gap-1.5 ${trade.status === 'OPEN' ? 'text-blue-400' : 'text-gray-500'}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${trade.status === 'OPEN' ? 'bg-blue-400 animate-pulse' : 'bg-gray-700'}`}></span>
                                        {trade.status}
                                    </span>
                                </td>
                                <td className="p-4 text-[10px] text-gray-500">{trade.timestamp}</td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={9} className="p-20 text-center text-gray-600 italic uppercase tracking-widest text-xs">
                                    Nenhum registro encontrado no histórico real.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <div className="p-3 border-t border-card-border bg-black/20 text-[10px] text-gray-500 flex justify-between uppercase font-bold tracking-tighter">
                <span>Total: {sortedTrades.length} registros</span>
                <span>Última atualização: {new Date().toLocaleTimeString()}</span>
            </div>
        </div>
    </div>
  );
};

export default TradeHistory;
