import React, { useEffect, useState } from 'react';
import { fetchTopMovers } from '../services/marketService';
import { CoinData } from '../types';           // Import correto do tipo
import { Loader2, RefreshCw } from 'lucide-react';

interface BubbleMapProps {
  onSelect: (coin: CoinData) => void;
  selectedSymbol: string | null;
  isActive: boolean; // Controla se o componente está ativo/performático
  // symbols?: string[]; // ← comentado, pois não está sendo usado atualmente
}

const BubbleMap: React.FC<BubbleMapProps> = React.memo(
  ({ onSelect, selectedSymbol, isActive }) => {
    const [coins, setCoins] = useState<CoinData[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const loadRealData = async () => {
      setIsLoading(true);
      try {
        const data = await fetchTopMovers();
        setCoins(data);
      } catch (error) {
        console.error('Erro ao carregar top movers:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Carrega dados na montagem + refresh a cada 30s
    useEffect(() => {
      if (!isActive) return;

      loadRealData();
      const interval = setInterval(loadRealData, 30000);

      return () => clearInterval(interval);
    }, [isActive]);

    // Calcula estilo do bubble baseado em change e size
    const getBubbleStyle = (
      change: number,
      sizeScore: number,
      isSelected: boolean
    ) => {
      const isPositive = change >= 0;

      const bgClass = isPositive
        ? 'bg-[#064e3b] hover:bg-[#065f46]' // emerald dark
        : 'bg-[#7f1d1d] hover:bg-[#991b1b]'; // red dark

      const borderClass = isPositive
        ? 'border-[#34d399]' // emerald-400
        : 'border-[#f87171]'; // red-400

      const textClass = 'text-white';

      // Tamanhos dinâmicos baseados no score de tamanho
      let sizeClass = '';
      let fontSize = '';

      if (sizeScore >= 20) {
        sizeClass = 'w-36 h-36 md:w-44 md:h-44';
        fontSize = 'text-2xl md:text-3xl';
      } else if (sizeScore >= 10) {
        sizeClass = 'w-28 h-28 md:w-36 md:h-36';
        fontSize = 'text-xl md:text-2xl';
      } else if (sizeScore >= 5) {
        sizeClass = 'w-24 h-24 md:w-32 md:h-32';
        fontSize = 'text-lg md:text-xl';
      } else if (sizeScore >= 2) {
        sizeClass = 'w-20 h-20 md:w-24 md:h-24';
        fontSize = 'text-base md:text-lg';
      } else {
        sizeClass = 'w-16 h-16 md:w-20 md:h-20';
        fontSize = 'text-xs md:text-sm';
      }

      const shadow = isSelected
        ? 'shadow-[0_0_20px_rgba(255,255,255,0.5)] scale-110 z-20'
        : 'shadow-lg hover:scale-105 z-10';

      return {
        className: `${bgClass} ${sizeClass} rounded-full flex flex-col items-center justify-center border-2 ${borderClass} ${textClass} ${shadow} transition-all duration-500 ease-out cursor-pointer relative overflow-hidden shrink-0 grow-0`,
        fontSize,
      };
    };

    if (isLoading && coins.length === 0) {
      return (
        <div className="w-full h-full flex items-center justify-center">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      );
    }

    return (
      <div className="w-full h-full min-h-[500px] p-4 flex flex-wrap justify-center items-center content-center gap-2 md:gap-4 overflow-y-auto scrollbar-hide bg-[#0B0E14] relative">
        <div className="absolute top-4 right-4 z-20">
          <button
            onClick={loadRealData}
            disabled={isLoading}
            className="p-2 bg-black/40 rounded-full text-gray-400 hover:text-white hover:bg-black/60 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} />
          </button>
        </div>

        {coins.map((coin) => {
          const style = getBubbleStyle(
            coin.change,
            coin.size,
            selectedSymbol === coin.symbol
          );

          return (
            <button
              key={coin.symbol}
              onClick={() => onSelect(coin)}
              className={style.className}
            >
              <div className="flex flex-col items-center z-10 pointer-events-none">
                <span
                  className={`font-bold leading-none drop-shadow-md ${style.fontSize}`}
                >
                  {coin.symbol}
                </span>

                <span className="font-mono font-bold mt-1 text-[0.7em] drop-shadow-md flex items-center justify-center bg-black/30 rounded-full px-2 py-0.5 backdrop-blur-sm whitespace-nowrap">
                  {coin.change > 0 ? '+' : ''}
                  {coin.change.toFixed(2)}%
                </span>
              </div>

              {/* Efeito glossy */}
              <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>
            </button>
          );
        })}
      </div>
    );
  }
);

export default BubbleMap;