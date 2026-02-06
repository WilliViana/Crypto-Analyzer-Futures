import React, { useState, useEffect } from 'react';
import { Language, Trade } from '../types'; 
import { TrendingUp, Activity, DollarSign, PieChart, Layers, Clock, Target, BarChart2, EyeOff } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import TradingViewWidget from './TradingViewWidget'; 

interface DashboardOverviewProps {
  lang: Language;
  totalBalance: number;
  unrealizedPnL: number;
  assets: { symbol: string; amount: number; price: number; value: number; unrealizedPnL: number, initialMargin?: number }[];
  trades: Trade[];
}

const DashboardOverview: React.FC<DashboardOverviewProps> = ({ lang, totalBalance, unrealizedPnL, assets, trades }) => {
  const [sessionHistory, setSessionHistory] = useState<{time: string, value: number}[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT');
  const [showChart, setShowChart] = useState(false); // <--- GRÁFICO OCULTO

  useEffect(() => {
    if (totalBalance > 0) {
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setSessionHistory(prev => {
          const last = prev[prev.length - 1];
          if (last?.value === totalBalance) return prev;
          return [...prev.slice(-19), { time: now, value: totalBalance }];
      });
    }
  }, [totalBalance]);

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-10">
      
      {/* 1. GRÁFICO TRADINGVIEW (CONDICIONAL) */}
      <div className="w-full bg-[#151A25] rounded-xl border border-[#2A303C] shadow-2xl overflow-hidden relative">
           <div className="p-4 border-b border-[#2A303C] flex justify-between items-center bg-[#1A1F2E]">
               <div className="text-white font-bold text-sm">
                   Visão Geral: {selectedSymbol}
               </div>
               <button 
                    onClick={() => setShowChart(!showChart)}
                    className="flex items-center gap-2 px-3 py-1 bg-[#2A303C] hover:bg-[#353C4B] rounded text-xs font-bold text-gray-300 border border-gray-600 transition-colors"
                >
                    {showChart ? <EyeOff size={14}/> : <BarChart2 size={14}/>}
                    {showChart ? 'Ocultar Gráfico' : 'Ver Gráfico'}
               </button>
           </div>
           
           {showChart && (
               <div className="h-[500px] w-full">
                   <TradingViewWidget symbol={selectedSymbol} />
               </div>
           )}
      </div>

      {/* 2. METRICAS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-surface border border-card-border rounded-xl p-5 shadow-lg relative overflow-hidden">
                <div className="text-xs uppercase font-bold text-gray-500 mb-1">Saldo Total</div>
                <div className="text-3xl font-mono font-bold text-white">${totalBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                <div className="absolute top-4 right-4 p-2 bg-primary/10 rounded-lg text-primary"><DollarSign size={16} /></div>
            </div>
            {/* ... Outros cards mantidos iguais ... */}
            <div className="bg-surface border border-card-border rounded-xl p-5 shadow-lg relative overflow-hidden">
                <div className="text-xs uppercase font-bold text-gray-500 mb-1">Posições</div>
                <div className="text-3xl font-mono font-bold text-white">{assets.length}</div>
                <div className="absolute top-4 right-4 p-2 bg-yellow-500/10 rounded-lg text-yellow-500"><Layers size={16} /></div>
            </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[400px]">
            {/* Gráfico de Saldo */}
            <div className="lg:col-span-2 bg-surface border border-card-border rounded-xl p-6 shadow-lg flex flex-col">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2 uppercase"><TrendingUp size={16} className="text-primary"/> Curva de Patrimônio</h3>
                <div className="flex-1 min-h-0 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={sessionHistory}>
                            <defs>
                                <linearGradient id="colorEq" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#2A303C" vertical={false} />
                            <XAxis dataKey="time" tick={{ fill: '#6B7280', fontSize: 10 }} />
                            <YAxis domain={['auto', 'auto']} tick={{ fill: '#6B7280', fontSize: 10 }} />
                            <Tooltip contentStyle={{ backgroundColor: '#151A25', borderColor: '#2A303C' }} />
                            <Area type="monotone" dataKey="value" stroke="#6366F1" strokeWidth={2} fill="url(#colorEq)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
            
            {/* LISTA DE ORDENS ABERTAS */}
            <div className="bg-surface border border-card-border rounded-xl p-6 shadow-lg flex flex-col">
                 <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2 uppercase"><Target size={16} className="text-purple-400"/> Ordens Abertas</h3>
                 <div className="flex-1 overflow-auto space-y-3 pr-2 scrollbar-hide">
                     {assets.length > 0 ? assets.map(asset => {
                         const entryValue = (Math.abs(asset.amount) * asset.price / 20).toFixed(2); 
                         return (
                             <div 
                                key={asset.symbol} 
                                onClick={() => setSelectedSymbol(asset.symbol)}
                                className="flex flex-col gap-2 p-3 bg-black/20 rounded-lg border border-white/5 hover:border-primary/50 cursor-pointer group transition-all"
                             >
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded bg-surface flex items-center justify-center text-[10px] font-bold text-white border border-white/10">{asset.symbol.substring(0,3)}</div>
                                        <div>
                                            <span className="font-bold text-white text-sm block">{asset.symbol}</span>
                                            <span className="text-[9px] uppercase font-bold text-gray-500 tracking-wider bg-gray-800 px-1 rounded">SISTEMA</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${asset.amount > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                            {asset.amount > 0 ? 'LONG' : 'SHORT'}
                                        </span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-[10px] mt-1 border-t border-white/5 pt-2">
                                    <div className="text-gray-400 uppercase">Entrada: <span className="text-white font-mono font-bold">${entryValue}</span></div>
                                    <div className="text-gray-400 uppercase text-right">PnL: <span className={`font-mono font-bold ${asset.unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>{asset.unrealizedPnL.toFixed(2)}</span></div>
                                </div>
                             </div>
                         );
                     }) : (
                         <div className="flex flex-col items-center justify-center py-10 opacity-50 h-full">
                             <Clock size={32} className="mb-2" />
                             <span className="text-xs uppercase font-bold text-center">Nenhuma ordem.</span>
                         </div>
                     )}
                 </div>
            </div>
      </div>
    </div>
  );
};

export default DashboardOverview;