
import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, AreaChart, Area, CartesianGrid, XAxis, YAxis, BarChart, Bar } from 'recharts';
import { Wallet, Globe, LineChart, PieChart as PieChartIcon, Layers, Shield, X, ExternalLink, TrendingUp, TrendingDown, Coins, BarChart2, Clock, XCircle } from 'lucide-react';
import { Language, RealAccountData, Trade, Exchange } from '../types';
import { translations } from '../utils/translations';
import { closePosition } from '../services/exchangeService';

interface WalletDashboardProps {
    lang: Language;
    realPortfolio: RealAccountData;
    trades?: Trade[];
    exchanges?: Exchange[];
    onRefresh?: () => void;
    spotBalance?: number;
}

const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const timeFilters = [
    { label: '1H', value: '1h' },
    { label: '12H', value: '12h' },
    { label: '1D', value: '1d' },
    { label: '1S', value: '1w' },
    { label: '1M', value: '1m' },
    { label: '3M', value: '3m' },
    { label: '6M', value: '6m' },
    { label: '1A', value: '1y' },
    { label: 'MAX', value: 'max' },
];

const WalletDashboard: React.FC<WalletDashboardProps> = React.memo(({
    lang, realPortfolio, trades = [], exchanges = [], onRefresh, spotBalance = 0
}) => {
    const t = translations[lang].wallet;
    const [selectedAsset, setSelectedAsset] = useState<any | null>(null);
    const [selectedTimeFilter, setSelectedTimeFilter] = useState('1d');
    const [isClosing, setIsClosing] = useState(false);

    const assets = useMemo(() => {
        return realPortfolio.assets.map(asset => ({
            ...asset,
            allocation: realPortfolio.totalBalance > 0
                ? parseFloat(((asset.value / realPortfolio.totalBalance) * 100).toFixed(2))
                : 0
        }));
    }, [realPortfolio]);

    const allocationData = useMemo(() => {
        if (assets.length === 0) return [];
        return assets.map(a => ({ name: a.symbol, value: a.allocation }));
    }, [assets]);

    // Calculate stats
    const stats = useMemo(() => {
        const closedTrades = trades.filter(t => t.status === 'CLOSED');
        const totalPnL = closedTrades.reduce((acc, t) => acc + t.pnl, 0);
        const wins = closedTrades.filter(t => t.pnl > 0).length;
        const winRate = closedTrades.length > 0 ? Math.round((wins / closedTrades.length) * 100) : 0;
        const avgWin = wins > 0 ? closedTrades.filter(t => t.pnl > 0).reduce((acc, t) => acc + t.pnl, 0) / wins : 0;
        const losses = closedTrades.filter(t => t.pnl <= 0).length;
        const avgLoss = losses > 0 ? closedTrades.filter(t => t.pnl <= 0).reduce((acc, t) => acc + t.pnl, 0) / losses : 0;
        return { totalPnL, winRate, avgWin, avgLoss, totalTrades: closedTrades.length };
    }, [trades]);

    // Mock PnL history data (would come from API in production)
    const pnlHistory = useMemo(() => {
        const data = [];
        let cumulative = 0;
        const sortedTrades = [...trades].filter(t => t.status === 'CLOSED').sort((a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        for (const trade of sortedTrades.slice(-20)) {
            cumulative += trade.pnl;
            data.push({
                time: new Date(trade.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                pnl: cumulative,
                trade: trade.pnl
            });
        }
        return data;
    }, [trades]);

    const getStrategyForAsset = (symbol: string) => {
        const cleanSymbol = symbol.replace('USDT', '');
        const trade = [...trades].reverse().find(t =>
            t.status === 'OPEN' &&
            (t.symbol === symbol || t.symbol === cleanSymbol || t.symbol === `${cleanSymbol}USDT`)
        );
        return trade?.strategyName || 'Manual / Externo';
    };

    const handleClosePosition = async (asset: any) => {
        const activeExchange = exchanges.find(e => e.status === 'CONNECTED');
        if (!activeExchange) return;

        setIsClosing(true);
        try {
            const side = asset.amount > 0 ? 'SELL' : 'BUY';
            await closePosition(asset.symbol, Math.abs(asset.amount), side as 'BUY' | 'SELL', activeExchange);
            setSelectedAsset(null);
            onRefresh?.();
        } catch (error) {
            console.error('Close position error:', error);
        } finally {
            setIsClosing(false);
        }
    };

    const handleCloseAllPositions = async () => {
        const activeExchange = exchanges.find(e => e.status === 'CONNECTED');
        if (!activeExchange || assets.length === 0) return;
        if (!confirm(`Fechar TODAS as ${assets.length} posições abertas?`)) return;

        setIsClosing(true);
        try {
            for (const asset of assets) {
                const side = asset.amount > 0 ? 'SELL' : 'BUY';
                await closePosition(asset.symbol, Math.abs(asset.amount), side as 'BUY' | 'SELL', activeExchange);
            }
            onRefresh?.();
        } catch (error) {
            console.error('Close all positions error:', error);
        } finally {
            setIsClosing(false);
        }
    };

    const AssetModal = ({ asset, onClose }: { asset: any, onClose: () => void }) => {
        const strategyName = getStrategyForAsset(asset.symbol);
        const side = asset.amount > 0 ? 'LONG' : 'SHORT';
        const pnlColor = asset.unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400';
        const pnlPercent = asset.initialMargin ? ((asset.unrealizedPnL / asset.initialMargin) * 100).toFixed(2) : '0';

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
                <div className="bg-[#151A25] border border-[#2A303C] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative">
                    <div className="bg-gradient-to-r from-indigo-900/40 to-purple-900/40 p-6 border-b border-[#2A303C]">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${asset.amount > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{side}</span>
                                    <h3 className="text-xl font-bold text-white">{asset.symbol}</h3>
                                </div>
                                <span className="text-gray-400 text-xs uppercase tracking-wide font-bold">Estratégia: {strategyName}</span>
                            </div>
                            <button onClick={onClose} className="bg-black/20 hover:bg-white/10 p-2 rounded-full text-gray-400 hover:text-white transition-colors"><X size={20} /></button>
                        </div>
                    </div>

                    <div className="p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                                <div className="text-[10px] text-gray-500 uppercase font-bold">Preço Médio</div>
                                <div className="text-white font-mono font-bold">${asset.price.toLocaleString()}</div>
                            </div>
                            <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                                <div className="text-[10px] text-gray-500 uppercase font-bold">Tamanho</div>
                                <div className="text-white font-mono font-bold">{Math.abs(asset.amount).toFixed(4)}</div>
                            </div>
                            <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                                <div className="text-[10px] text-gray-500 uppercase font-bold">Valor Nocional</div>
                                <div className="text-white font-mono font-bold">${asset.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                            </div>
                            <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                                <div className="text-[10px] text-gray-500 uppercase font-bold">PnL Não Realizado</div>
                                <div className={`${pnlColor} font-mono font-bold`}>
                                    {asset.unrealizedPnL > 0 ? '+' : ''}{asset.unrealizedPnL.toLocaleString(undefined, { minimumFractionDigits: 2 })} ({pnlPercent}%)
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => handleClosePosition(asset)}
                                disabled={isClosing}
                                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                            >
                                <XCircle size={18} />
                                {isClosing ? 'Fechando...' : 'FECHAR POSIÇÃO'}
                            </button>
                            <button className="px-4 py-3 bg-[#2A303C] hover:bg-[#353C4B] text-gray-300 rounded-xl text-xs flex items-center gap-2">
                                <ExternalLink size={14} /> Corretora
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto w-full animate-fade-in text-gray-200">
            {selectedAsset && <AssetModal asset={selectedAsset} onClose={() => setSelectedAsset(null)} />}

            {/* Header / Metrics Row */}
            <div className="bg-[#151A25] border border-[#2A303C] rounded-xl p-6 shadow-lg">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-primary/10 rounded-xl border border-primary/20">
                            <Wallet className="text-primary" size={32} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white uppercase tracking-tighter">Carteira Real</h2>
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                <div className={`w-2 h-2 rounded-full ${realPortfolio.isSimulated ? 'bg-yellow-500' : 'bg-green-500'} animate-pulse`}></div>
                                Sincronizado via {realPortfolio.isSimulated ? 'Binance Testnet' : 'Binance Mainnet'}
                            </div>
                        </div>
                    </div>

                    {/* Time Filters */}
                    <div className="flex gap-1 bg-black/30 p-1 rounded-lg border border-white/5">
                        {timeFilters.map(filter => (
                            <button
                                key={filter.value}
                                onClick={() => setSelectedTimeFilter(filter.value)}
                                className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase transition-colors ${selectedTimeFilter === filter.value
                                    ? 'bg-primary text-white'
                                    : 'text-gray-500 hover:text-white'
                                    }`}
                            >
                                {filter.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Balance Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                <div className="bg-surface border border-card-border rounded-xl p-4 shadow-lg relative overflow-hidden col-span-1">
                    <div className="text-[10px] uppercase font-bold text-gray-500 mb-1 flex items-center gap-1">
                        <Coins size={12} className="text-green-400" />
                        Saldo Futures
                    </div>
                    <div className="text-xl font-mono font-bold text-white">
                        ${realPortfolio.totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                </div>

                <div className="bg-surface border border-card-border rounded-xl p-4 shadow-lg relative overflow-hidden col-span-1">
                    <div className="text-[10px] uppercase font-bold text-gray-500 mb-1 flex items-center gap-1">
                        <Wallet size={12} className="text-yellow-400" />
                        Saldo Spot
                    </div>
                    <div className="text-xl font-mono font-bold text-white">
                        ${spotBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                </div>

                <div className="bg-surface border border-card-border rounded-xl p-4 shadow-lg relative overflow-hidden">
                    <div className="text-[10px] uppercase font-bold text-gray-500 mb-1">PnL Flutuante</div>
                    <div className={`text-xl font-mono font-bold ${realPortfolio.unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {realPortfolio.unrealizedPnL >= 0 ? '+' : ''}${realPortfolio.unrealizedPnL.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                </div>

                <div className="bg-surface border border-card-border rounded-xl p-4 shadow-lg relative overflow-hidden">
                    <div className="text-[10px] uppercase font-bold text-gray-500 mb-1">PnL Realizado</div>
                    <div className={`text-xl font-mono font-bold ${stats.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {stats.totalPnL >= 0 ? '+' : ''}${stats.totalPnL.toFixed(2)}
                    </div>
                </div>

                <div className="bg-surface border border-card-border rounded-xl p-4 shadow-lg relative overflow-hidden">
                    <div className="text-[10px] uppercase font-bold text-gray-500 mb-1">Win Rate</div>
                    <div className="text-xl font-mono font-bold text-white">{stats.winRate}%</div>
                </div>

                <div className="bg-surface border border-card-border rounded-xl p-4 shadow-lg relative overflow-hidden">
                    <div className="text-[10px] uppercase font-bold text-gray-500 mb-1">Posições</div>
                    <div className="text-xl font-mono font-bold text-white">{assets.length}</div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-[320px]">
                {/* PnL History Chart */}
                <div className="xl:col-span-2 bg-[#151A25] border border-[#2A303C] rounded-xl p-6 shadow-lg flex flex-col">
                    <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2 uppercase tracking-tight">
                        <LineChart size={18} className="text-primary" /> Histórico de PnL Cumulativo
                    </h3>
                    <div className="flex-1 min-h-0">
                        {pnlHistory.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={pnlHistory}>
                                    <defs>
                                        <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={stats.totalPnL >= 0 ? "#10B981" : "#EF4444"} stopOpacity={0.3} />
                                            <stop offset="95%" stopColor={stats.totalPnL >= 0 ? "#10B981" : "#EF4444"} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#2A303C" vertical={false} />
                                    <XAxis dataKey="time" tick={{ fill: '#6B7280', fontSize: 10 }} />
                                    <YAxis tick={{ fill: '#6B7280', fontSize: 10 }} />
                                    <Tooltip contentStyle={{ backgroundColor: '#151A25', borderColor: '#2A303C' }} />
                                    <Area type="monotone" dataKey="pnl" stroke={stats.totalPnL >= 0 ? "#10B981" : "#EF4444"} strokeWidth={2} fill="url(#pnlGrad)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-500 text-xs italic">
                                Nenhum trade finalizado ainda.
                            </div>
                        )}
                    </div>
                </div>

                {/* Allocation Pie */}
                <div className="bg-[#151A25] border border-[#2A303C] rounded-xl p-6 shadow-lg flex flex-col">
                    <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2 uppercase tracking-tight">
                        <PieChartIcon size={18} className="text-purple-500" /> Alocação de Posições
                    </h3>
                    <div className="flex-1 w-full min-h-0">
                        {allocationData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={allocationData}
                                        innerRadius={50}
                                        outerRadius={70}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {allocationData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: '#151A25', borderColor: '#2A303C' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-500 text-xs italic">
                                Nenhuma posição aberta.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Holdings Table */}
            <div className="bg-[#151A25] border border-[#2A303C] rounded-xl shadow-lg flex flex-col">
                <div className="p-4 border-b border-[#2A303C] flex justify-between items-center">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-tight">
                        <Layers size={18} className="text-blue-400" /> Posições Abertas
                    </h3>
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500">{assets.length} posições</span>
                        {assets.length > 0 && (
                            <button
                                onClick={handleCloseAllPositions}
                                disabled={isClosing}
                                className="px-3 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/30 rounded text-[10px] font-bold uppercase transition-all disabled:opacity-50"
                                title="Fechar todas as posições"
                            >
                                {isClosing ? 'Fechando...' : 'Fechar Todas'}
                            </button>
                        )}
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-400">
                        <thead className="bg-black/20 text-[10px] uppercase font-bold text-gray-500">
                            <tr>
                                <th className="p-4">Contrato</th>
                                <th className="p-4">Estratégia</th>
                                <th className="p-4 text-right">Tamanho</th>
                                <th className="p-4 text-right">Entrada</th>
                                <th className="p-4 text-right">Valor</th>
                                <th className="p-4 text-right">PnL</th>
                                <th className="p-4 text-center">Lev.</th>
                                <th className="p-4 text-center">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 font-mono text-xs">
                            {assets.length > 0 ? assets.map((asset) => (
                                <tr
                                    key={asset.symbol}
                                    className="hover:bg-white/5 transition-colors cursor-pointer group"
                                >
                                    <td className="p-4 flex items-center gap-2" onClick={() => setSelectedAsset(asset)}>
                                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center font-bold text-primary border border-primary/20">
                                            {asset.symbol[0]}
                                        </div>
                                        <div className="font-bold text-white group-hover:text-primary transition-colors">{asset.symbol}</div>
                                    </td>
                                    <td className="p-4">
                                        <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-1 rounded text-gray-300 font-bold uppercase tracking-wider">
                                            {getStrategyForAsset(asset.symbol)}
                                        </span>
                                    </td>
                                    <td className={`p-4 text-right font-bold ${asset.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {asset.amount > 0 ? '+' : ''}{asset.amount.toFixed(4)}
                                    </td>
                                    <td className="p-4 text-right">${asset.price.toLocaleString()}</td>
                                    <td className="p-4 text-right text-white">${asset.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    <td className={`p-4 text-right font-bold ${asset.unrealizedPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        {asset.unrealizedPnL >= 0 ? '+' : ''}${asset.unrealizedPnL?.toLocaleString() || '0.00'}
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className="text-xs font-bold text-yellow-400">{asset.leverage || '1'}x</span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setSelectedAsset(asset); }}
                                            className="px-3 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded text-[10px] font-bold uppercase border border-red-500/20"
                                        >
                                            Fechar
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={8} className="p-10 text-center text-gray-600 italic">
                                        Nenhuma posição de futuros em aberto.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
});

export default WalletDashboard;
