import React, { useMemo, useState, useEffect } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, 
  ReferenceLine, BarChart, Bar, Cell
} from 'recharts';
import { Language } from '../types';
import { translations } from '../utils/translations';
import { Activity, GitCommit, Layers, Scale, Loader2, Target, MoveUp, MoveDown } from 'lucide-react';
import { fetchOrderBook } from '../services/marketService';
import { useMarketData } from '../hooks/useMarketData';

interface AdvancedAnalyticsProps {
  symbol: string;
  price: number;
  lang: Language;
}

const AdvancedAnalytics: React.FC<AdvancedAnalyticsProps> = ({ symbol, price, lang }) => {
  const t = translations[lang].advanced_analytics;
  const marketData = useMarketData(symbol);
  const [orderBook, setOrderBook] = useState<any>({ bids: [], asks: [] });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
      const loadBook = async () => {
          setIsLoading(true);
          try {
            const book = await fetchOrderBook(symbol);
            setOrderBook(book);
          } catch (e) {
            console.error("OrderBook failed", e);
          } finally {
            setIsLoading(false);
          }
      };

      loadBook();
      const interval = setInterval(loadBook, 5000);
      return () => clearInterval(interval);
  }, [symbol]);

  const confluenceData = useMemo(() => [
    { subject: 'RSI', A: Math.min(100, Math.max(0, marketData.rsi)), full: 100 },
    { subject: 'Vol', A: Math.min(100, (marketData.volume / 1000000) * 100), full: 100 },
    { subject: 'MACD', A: Math.abs(marketData.macdHist) * 1000 > 100 ? 100 : Math.abs(marketData.macdHist) * 1000, full: 100 },
    { subject: 'ATR', A: 75, full: 100 },
    { subject: 'Trend', A: marketData.price > marketData.vwap ? 90 : 20, full: 100 }
  ], [marketData]);

  return (
    <div className="flex flex-col h-full gap-4 text-gray-200">
        <div className="flex items-center justify-between mb-2">
           <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
             <Target size={14} className="text-primary"/> Confluência Técnica
           </h3>
           <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${marketData.price > marketData.vwap ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
              <span className="text-[9px] font-mono font-bold uppercase">{marketData.price > marketData.vwap ? 'Bullish Dominance' : 'Bearish Pressure'}</span>
           </div>
        </div>

        {/* Radar Chart for Confluence */}
        <div className="h-[200px] w-full shrink-0 flex items-center justify-center bg-black/20 rounded-xl p-2 border border-white/5">
            <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={confluenceData}>
                    <PolarGrid stroke="#2A303C" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#6B7280', fontSize: 9 }} />
                    <Radar
                        name="Signal"
                        dataKey="A"
                        stroke="#6366F1"
                        fill="#6366F1"
                        fillOpacity={0.4}
                    />
                </RadarChart>
            </ResponsiveContainer>
        </div>

        {/* Order Book Depth Mini */}
        <div className="flex-1 flex flex-col min-h-0 bg-black/20 rounded-xl p-3 border border-white/5 overflow-hidden">
            <div className="flex justify-between items-center mb-3">
               <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Order Book Depth</span>
               <span className="text-[9px] font-mono text-indigo-400">SPREAD: 0.01%</span>
            </div>
            
            <div className="flex-1 flex flex-col gap-1 overflow-y-auto scrollbar-hide font-mono text-[9px]">
                {/* Asks (Sells) - Top down */}
                {orderBook.asks.slice(0, 8).reverse().map((ask: any, i: number) => (
                    <div key={`ask-${i}`} className="flex justify-between items-center group">
                        <span className="text-red-400 font-bold">{ask.price.toFixed(2)}</span>
                        <div className="flex-1 mx-2 relative h-3 overflow-hidden rounded bg-red-500/5">
                            <div className="absolute right-0 top-0 bottom-0 bg-red-500/20" style={{ width: `${Math.min(100, ask.qty * 10)}%` }}></div>
                        </div>
                        <span className="text-gray-500">{ask.qty.toFixed(3)}</span>
                    </div>
                ))}

                <div className="my-2 py-1 border-y border-white/10 text-center text-white font-black text-[11px]">
                   {price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>

                {/* Bids (Buys) */}
                {orderBook.bids.slice(0, 8).map((bid: any, i: number) => (
                    <div key={`bid-${i}`} className="flex justify-between items-center group">
                        <span className="text-green-400 font-bold">{bid.price.toFixed(2)}</span>
                        <div className="flex-1 mx-2 relative h-3 overflow-hidden rounded bg-green-500/5">
                            <div className="absolute left-0 top-0 bottom-0 bg-green-500/20" style={{ width: `${Math.min(100, bid.qty * 10)}%` }}></div>
                        </div>
                        <span className="text-gray-500">{bid.qty.toFixed(3)}</span>
                    </div>
                ))}
            </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="bg-black/40 border border-white/5 p-2 rounded-lg text-center">
               <div className="text-[8px] text-gray-500 uppercase font-bold mb-1">Buy Pressure</div>
               <div className="flex items-center justify-center gap-1 text-green-400 font-bold">
                  <MoveUp size={10} /> 54%
               </div>
            </div>
            <div className="bg-black/40 border border-white/5 p-2 rounded-lg text-center">
               <div className="text-[8px] text-gray-500 uppercase font-bold mb-1">Sell Pressure</div>
               <div className="flex items-center justify-center gap-1 text-red-400 font-bold">
                  <MoveDown size={10} /> 46%
               </div>
            </div>
        </div>
    </div>
  );
};

export default AdvancedAnalytics;