
import React, { useState, useEffect } from 'react';
import { Exchange } from '../types';
import OrderForm from './OrderForm';
import TradingViewWidget from './TradingViewWidget';
import { Search, BarChart2, EyeOff, Activity } from 'lucide-react';

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

    // WebSocket Binance Real-Time Ticker (substitui polling REST)
    useEffect(() => {
        let ws: WebSocket | null = null;
        let reconnectTimer: any = null;

        const connectWS = () => {
            const activeExchange = exchanges.find(e => e.status === 'CONNECTED');
            const isTestnet = activeExchange?.isTestnet;
            const baseUrl = isTestnet
                ? 'wss://stream.binancefuture.com/ws'
                : 'wss://fstream.binance.com/ws';

            const streamName = selectedSymbol.toLowerCase() + '@ticker';
            ws = new WebSocket(`${baseUrl}/${streamName}`);

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.c) setCurrentPrice(parseFloat(data.c));
                } catch { /* ignore parse errors */ }
            };

            ws.onerror = () => {
                console.log('[WS] Erro, tentando reconectar em 5s...');
            };

            ws.onclose = () => {
                // Reconectar automaticamente após 5s
                reconnectTimer = setTimeout(connectWS, 5000);
            };
        };

        connectWS();

        return () => {
            if (ws) { ws.onclose = null; ws.close(); }
            if (reconnectTimer) clearTimeout(reconnectTimer);
        };
    }, [selectedSymbol, exchanges]);

    return (
        <div className="flex flex-col gap-4 animate-fade-in pb-20">
            <div className="bg-[#151A25] p-4 rounded-xl border border-[#2A303C] flex flex-col md:flex-row items-center gap-4">
                <h2 className="text-white font-bold whitespace-nowrap flex items-center gap-2 text-xs uppercase tracking-widest">
                    <Activity size={16} className="text-indigo-500" /> Fluxo Ao Vivo
                </h2>

                <div className="relative flex-1 w-full max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search size={14} className="text-gray-500" />
                    </div>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar Ativo (ex: ETH)..."
                        aria-label="Buscar ativo"
                        className="w-full bg-[#0B0E14] text-white pl-10 pr-4 py-2 rounded-lg border border-[#2A303C] focus:border-indigo-500 outline-none text-xs"
                    />
                    {searchTerm && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-[#1A1F2E] border border-[#2A303C] rounded-lg shadow-xl z-50 overflow-hidden">
                            {filteredPairs.length > 0 ? filteredPairs.map(p => (
                                <button key={p.symbol} onClick={() => { setSelectedSymbol(p.symbol); setSearchTerm(''); }} className="w-full text-left px-4 py-2 hover:bg-indigo-600/20 text-gray-300 hover:text-white text-xs">
                                    {p.symbol}
                                </button>
                            )) : <div className="p-3 text-gray-500 text-xs text-center">Nenhum ativo encontrado</div>}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <div className="text-white font-mono text-sm font-bold bg-indigo-600/20 px-4 py-2 rounded-lg border border-indigo-500/50 flex items-center gap-2 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                        {selectedSymbol}
                        <span className={`transition-colors duration-300 ${currentPrice ? 'text-green-400' : 'text-gray-500'}`}>
                            ${currentPrice > 0 ? currentPrice.toFixed(currentPrice < 1 ? 4 : 2) : '---'}
                        </span>
                    </div>
                    <button onClick={() => setShowChart(!showChart)} className="flex items-center gap-2 px-3 py-2 bg-[#2A303C] hover:bg-[#353C4B] rounded-lg text-[10px] font-bold text-gray-300 transition-colors border border-gray-600">
                        {showChart ? <EyeOff size={12} /> : <BarChart2 size={12} />}
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
