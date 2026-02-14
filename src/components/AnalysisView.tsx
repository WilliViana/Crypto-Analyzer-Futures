
import React, { useState, useEffect } from 'react';
import { Exchange } from '../types';
import OrderForm from './OrderForm';
import TradingViewWidget from './TradingViewWidget';
import { Search, BarChart2, EyeOff } from 'lucide-react';
import { fetchAssetPrice } from '../services/marketService';

interface AnalysisViewProps {
  exchanges: Exchange[];
  realBalance: number;
  availablePairs: any[]; 
}

export default function AnalysisView({ exchanges, realBalance, availablePairs }: AnalysisViewProps) {
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPrice, setCurrentPrice] = useState(0);
  const [showChart, setShowChart] = useState(true); 

  const safePairs = Array.isArray(availablePairs) ? availablePairs : [];
  const filteredPairs = safePairs.filter(p => p.symbol && p.symbol.includes(searchTerm.toUpperCase())).slice(0, 10);

  useEffect(() => {
      const getPrice = async () => {
          const price = await fetchAssetPrice(selectedSymbol);
          setCurrentPrice(price);
      };
      getPrice();
      const interval = setInterval(getPrice, 5000);
      return () => clearInterval(interval);
  }, [selectedSymbol]);

  return (
    <div className="flex flex-col gap-4 animate-fade-in pb-20">
        <div className="bg-[#151A25] p-4 rounded-xl border border-[#2A303C] flex flex-col md:flex-row items-center gap-4">
            <h2 className="text-white font-bold whitespace-nowrap uppercase tracking-widest text-xs">Terminal de Fluxo</h2>
            <div className="relative flex-1 w-full max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search size={14} className="text-gray-500"/>
                </div>
                <input 
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar Ativo..."
                    className="w-full bg-[#0B0E14] text-white pl-10 pr-4 py-2 rounded-lg border border-[#2A303C] focus:border-indigo-500 outline-none text-xs"
                />
                {searchTerm && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-[#1A1F2E] border border-[#2A303C] rounded-lg shadow-xl z-50 overflow-hidden">
                        {filteredPairs.map(p => (
                            <button key={p.symbol} onClick={() => { setSelectedSymbol(p.symbol); setSearchTerm(''); }} className="w-full text-left px-4 py-2 hover:bg-indigo-600/20 text-gray-300 hover:text-white text-xs">
                                {p.symbol}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            <div className="flex items-center gap-3">
                <div className="text-white font-mono text-xs font-bold bg-indigo-600/20 px-3 py-1 rounded border border-indigo-500/50">
                    {selectedSymbol} <span className="text-gray-400 font-normal ml-2">${currentPrice || '---'}</span>
                </div>
                <button onClick={() => setShowChart(!showChart)} className="flex items-center gap-2 px-3 py-1 bg-[#2A303C] hover:bg-[#353C4B] rounded text-[10px] font-bold text-gray-300 transition-colors border border-gray-600">
                    {showChart ? <EyeOff size={12}/> : <BarChart2 size={12}/>}
                    {showChart ? 'OCULTAR' : 'GRÁFICO'}
                </button>
            </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {showChart && (
                <div className="lg:col-span-2 bg-[#151A25] rounded-xl border border-[#2A303C] overflow-hidden h-[550px]">
                    <TradingViewWidget symbol={selectedSymbol} />
                </div>
            )}
            <div className={`${showChart ? 'lg:col-span-1' : 'lg:col-span-3'} bg-[#151A25] p-6 rounded-xl border border-[#2A303C]`}>
                <OrderForm symbol={selectedSymbol} currentPrice={currentPrice} exchanges={exchanges} realBalance={realBalance} />
            </div>
        </div>
    </div>
  );
}
