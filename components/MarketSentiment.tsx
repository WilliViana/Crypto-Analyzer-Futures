import React, { useState, useEffect } from 'react';
import { getMarketNews, runDeepAnalysis } from '../services/geminiService';
import { MarketData, Language } from '../types';
import { Brain, Newspaper, TrendingUp, TrendingDown, Loader2, Search, ExternalLink, ShieldCheck } from 'lucide-react';

interface MarketSentimentProps {
  symbol: string;
  marketData: MarketData;
  lang: Language;
}

const MarketSentiment: React.FC<MarketSentimentProps> = ({ symbol, marketData, lang }) => {
  const [news, setNews] = useState<{text: string, sources: any[]}>({ text: '', sources: [] });
  const [analysis, setAnalysis] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sentimentScore, setSentimentScore] = useState(50); // 0-100 (Fear to Greed)

  const fetchAIAnalysis = async () => {
    setIsLoading(true);
    try {
      const [newsResult, deepResult] = await Promise.all([
        getMarketNews(symbol, lang),
        runDeepAnalysis(marketData, lang)
      ]);
      setNews(newsResult);
      setAnalysis(deepResult);
      
      // Heurística simples para o score baseada no texto (idealmente a IA retornaria isso via JSON)
      const text = (newsResult.text + deepResult).toLowerCase();
      let score = 50;
      if (text.includes('bullish') || text.includes('alta') || text.includes('baleias comprando')) score += 25;
      if (text.includes('bearish') || text.includes('queda') || text.includes('liquidado')) score -= 25;
      setSentimentScore(Math.max(5, Math.min(95, score)));
      
    } catch (error) {
      console.error("AI Fetch Error", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAIAnalysis();
  }, [symbol]);

  return (
    <div className="bg-surface border border-card-border rounded-xl p-6 shadow-xl flex flex-col gap-6 animate-fade-in h-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
            <Brain size={20} />
          </div>
          <h3 className="font-black text-white text-sm uppercase tracking-tighter">Sentimento do Motor Neural</h3>
        </div>
        <button 
          onClick={fetchAIAnalysis} 
          disabled={isLoading}
          className="p-2 hover:bg-white/5 rounded-lg text-gray-500 transition-colors"
        >
          {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
        </button>
      </div>

      {/* Sentiment Meter */}
      <div className="relative pt-6">
        <div className="flex justify-between text-[10px] font-bold uppercase mb-2">
          <span className="text-red-500">Extremo Medo</span>
          <span className="text-gray-500">Neutro</span>
          <span className="text-green-500">Ganância</span>
        </div>
        <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden relative">
          <div 
            className="absolute top-0 bottom-0 left-0 transition-all duration-1000 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"
            style={{ width: '100%' }}
          ></div>
          <div 
            className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_white] transition-all duration-1000 z-10"
            style={{ left: `${sentimentScore}%` }}
          ></div>
        </div>
        <div className="text-center mt-3">
           <span className="text-2xl font-mono font-black text-white">{sentimentScore}</span>
           <span className="text-gray-500 text-xs ml-2 font-bold uppercase">Index</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0">
        {/* Notícias e Fontes */}
        <div className="bg-black/20 border border-white/5 rounded-xl p-4 flex flex-col">
          <div className="flex items-center gap-2 mb-3 text-indigo-400">
             <Newspaper size={14} />
             <span className="text-[10px] font-bold uppercase tracking-widest">Live News Grounding</span>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar text-[11px] text-gray-400 leading-relaxed italic pr-2">
            {isLoading ? 'Escaneando fontes globais...' : news.text || 'Aguardando dados...'}
          </div>
          {news.sources.length > 0 && (
            <div className="mt-4 pt-3 border-t border-white/5 flex flex-wrap gap-2">
               {news.sources.slice(0, 3).map((source, i) => (
                 <a key={i} href={source.web?.uri} target="_blank" className="text-[9px] text-indigo-500 flex items-center gap-1 hover:underline">
                   <ExternalLink size={10} /> {source.web?.title?.substring(0, 15)}...
                 </a>
               ))}
            </div>
          )}
        </div>

        {/* Análise Deep Thinking */}
        <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-4 flex flex-col">
          <div className="flex items-center gap-2 mb-3 text-purple-400">
             <TrendingUp size={14} />
             <span className="text-[10px] font-bold uppercase tracking-widest">Raciocínio de Estratégia</span>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar text-[11px] text-gray-300 leading-relaxed pr-2">
            {isLoading ? (
               <div className="flex flex-col items-center justify-center h-full gap-2">
                  <Loader2 className="animate-spin text-purple-500" size={24} />
                  <span className="text-[10px] text-purple-500 animate-pulse">CADEIA DE PENSAMENTO ATIVA...</span>
               </div>
            ) : analysis || 'Aguardando gatilhos técnicos...'}
          </div>
          <div className="mt-3 flex items-center gap-2 text-[9px] text-green-400 bg-green-500/10 p-2 rounded border border-green-500/20">
             <ShieldCheck size={12} />
             <span>Sinal Validado por Modelo Probabilístico Gemini-3-Pro</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketSentiment;