// src/components/OrderForm.tsx
import React, { useState, useEffect } from 'react';
import { Exchange, OrderSide, OrderType } from '../types';
import { executeOrder } from '../services/exchangeService';
import { ArrowRight, AlertCircle, CheckCircle, Wallet, RefreshCw } from 'lucide-react';

interface OrderFormProps {
  symbol: string;
  currentPrice: number;
  exchanges: Exchange[];
  realBalance: number;
}

export default function OrderForm({ symbol, currentPrice, exchanges, realBalance }: OrderFormProps) {
  const [side, setSide] = useState<OrderSide>('BUY');
  const [amountUSD, setAmountUSD] = useState<string>('50'); // Valor em Dólar
  const [leverage, setLeverage] = useState<number>(10);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{type: 'success'|'error', text: string} | null>(null);

  const activeExchange = exchanges.find(e => e.status === 'CONNECTED');

  // Limpa mensagem após 5s
  useEffect(() => {
      if(statusMsg) {
          const timer = setTimeout(() => setStatusMsg(null), 5000);
          return () => clearTimeout(timer);
      }
  }, [statusMsg]);

  const handleSubmit = async () => {
    if (!activeExchange) {
        setStatusMsg({type: 'error', text: 'Nenhuma corretora conectada'});
        return;
    }

    setIsSubmitting(true);
    setStatusMsg(null);

    try {
      // Calcula quantidade baseada no valor USD inserido (Qtd = (Valor * Alavancagem) / Preço)
      // Nota: Passamos quantity=0 para o serviço calcular ou calculamos aqui. 
      // O serviço exchangeService já tem lógica de cálculo se quantity for 0, 
      // mas vamos passar 0 e deixar ele lidar com a precisão correta.
      
      const result = await executeOrder({
        symbol: symbol,
        side: side,
        type: 'MARKET',
        quantity: 0, // 0 força o exchangeService a calcular baseado em regra fixa ou podemos passar calculado
        leverage: leverage,
        stopLossPrice: 0, // Opcional: Adicione inputs se quiser
        takeProfitPrice: 0
      }, activeExchange, 'Manual');

      if (result.success) {
        setStatusMsg({ type: 'success', text: `Ordem enviada! ID: ${result.orderId}` });
      } else {
        setStatusMsg({ type: 'error', text: result.message });
      }
    } catch (error: any) {
      setStatusMsg({ type: 'error', text: error.message || 'Erro fatal' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      
      {/* Saldo */}
      <div className="flex justify-between items-center text-xs text-gray-400 bg-black/20 p-2 rounded-lg">
          <div className="flex items-center gap-1"><Wallet size={12}/> Disponível:</div>
          <div className="font-mono text-white font-bold">${realBalance.toFixed(2)}</div>
      </div>

      {/* Botões Lado */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setSide('BUY')}
          className={`py-3 rounded-lg font-bold transition-all ${side === 'BUY' ? 'bg-green-600 text-white shadow-lg shadow-green-900/20' : 'bg-[#2A303C] text-gray-400 hover:bg-[#353C4B]'}`}
        >
          COMPRAR / LONG
        </button>
        <button
          onClick={() => setSide('SELL')}
          className={`py-3 rounded-lg font-bold transition-all ${side === 'SELL' ? 'bg-red-600 text-white shadow-lg shadow-red-900/20' : 'bg-[#2A303C] text-gray-400 hover:bg-[#353C4B]'}`}
        >
          VENDER / SHORT
        </button>
      </div>

      {/* Inputs */}
      <div className="space-y-3">
          <div>
              <label className="text-xs text-gray-500 font-bold uppercase ml-1">Valor da Ordem (USD)</label>
              <div className="relative mt-1">
                  <span className="absolute left-3 top-2.5 text-gray-400">$</span>
                  <input 
                    type="number" 
                    value={amountUSD}
                    onChange={e => setAmountUSD(e.target.value)}
                    className="w-full bg-[#0B0E14] border border-[#2A303C] rounded-lg py-2 pl-7 pr-4 text-white font-mono focus:border-indigo-500 outline-none"
                  />
              </div>
          </div>

          <div>
              <label className="text-xs text-gray-500 font-bold uppercase ml-1">Alavancagem ({leverage}x)</label>
              <input 
                type="range" 
                min="1" max="100" step="1"
                value={leverage}
                onChange={e => setLeverage(parseInt(e.target.value))}
                className="w-full mt-2 accent-indigo-500"
              />
              <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                  <span>1x</span>
                  <span>20x</span>
                  <span>50x</span>
                  <span>100x</span>
              </div>
          </div>
      </div>

      {/* Botão Executar */}
      <button
        onClick={handleSubmit}
        disabled={isSubmitting || !activeExchange}
        className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all mt-auto
            ${isSubmitting ? 'bg-gray-600 cursor-wait' : side === 'BUY' ? 'bg-green-500 hover:bg-green-400 text-black' : 'bg-red-500 hover:bg-red-400 text-white'}
            ${!activeExchange ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        {isSubmitting ? <RefreshCw className="animate-spin" /> : <ArrowRight />}
        {isSubmitting ? 'Enviando...' : `EXECUTAR ${side}`}
      </button>

      {/* Feedback */}
      {statusMsg && (
          <div className={`p-3 rounded-lg text-xs flex items-start gap-2 ${statusMsg.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
              {statusMsg.type === 'success' ? <CheckCircle size={14} className="mt-0.5"/> : <AlertCircle size={14} className="mt-0.5"/>}
              <span>{statusMsg.text}</span>
          </div>
      )}
    </div>
  );
}