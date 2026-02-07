// src/components/OrderForm.tsx - Enhanced with Limit/Market/Stop-Limit + TP/SL
import React, { useState, useEffect } from 'react';
import { Exchange, OrderSide } from '../types';
import { executeOrder } from '../services/exchangeService';
import { ArrowRight, AlertCircle, CheckCircle, Wallet, RefreshCw, Shield, Target, TrendingDown, TrendingUp } from 'lucide-react';

type OrderMode = 'MARKET' | 'LIMIT' | 'STOP_LIMIT';

interface OrderFormProps {
  symbol: string;
  currentPrice: number;
  exchanges: Exchange[];
  realBalance: number;
}

export default function OrderForm({ symbol, currentPrice, exchanges, realBalance }: OrderFormProps) {
  const [side, setSide] = useState<OrderSide>('BUY');
  const [orderMode, setOrderMode] = useState<OrderMode>('MARKET');
  const [amountUSD, setAmountUSD] = useState<string>('50');
  const [leverage, setLeverage] = useState<number>(10);
  const [limitPrice, setLimitPrice] = useState<string>('');
  const [stopPrice, setStopPrice] = useState<string>('');

  // TP/SL
  const [enableTPSL, setEnableTPSL] = useState(false);
  const [takeProfitPrice, setTakeProfitPrice] = useState<string>('');
  const [stopLossPrice, setStopLossPrice] = useState<string>('');
  const [takeProfitPercent, setTakeProfitPercent] = useState<number>(5);
  const [stopLossPercent, setStopLossPercent] = useState<number>(2);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const activeExchange = exchanges.find(e => e.status === 'CONNECTED');

  // Update prices when currentPrice changes
  useEffect(() => {
    if (currentPrice > 0) {
      setLimitPrice(currentPrice.toFixed(2));
      setStopPrice((currentPrice * 0.99).toFixed(2));

      // Calculate TP/SL based on percentages
      const tp = side === 'BUY'
        ? currentPrice * (1 + takeProfitPercent / 100)
        : currentPrice * (1 - takeProfitPercent / 100);
      const sl = side === 'BUY'
        ? currentPrice * (1 - stopLossPercent / 100)
        : currentPrice * (1 + stopLossPercent / 100);

      setTakeProfitPrice(tp.toFixed(2));
      setStopLossPrice(sl.toFixed(2));
    }
  }, [currentPrice, side, takeProfitPercent, stopLossPercent]);

  // Limpa mensagem após 5s
  useEffect(() => {
    if (statusMsg) {
      const timer = setTimeout(() => setStatusMsg(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [statusMsg]);

  const handleSubmit = async () => {
    if (!activeExchange) {
      setStatusMsg({ type: 'error', text: 'Nenhuma corretora conectada' });
      return;
    }

    setIsSubmitting(true);
    setStatusMsg(null);

    try {
      const orderParams: any = {
        symbol: symbol,
        side: side,
        type: orderMode === 'MARKET' ? 'MARKET' : 'LIMIT',
        quantity: 0, // Let service calculate
        leverage: leverage
      };

      // Add price for LIMIT orders
      if (orderMode === 'LIMIT' || orderMode === 'STOP_LIMIT') {
        orderParams.price = parseFloat(limitPrice);
      }

      // Add stop price for STOP_LIMIT
      if (orderMode === 'STOP_LIMIT') {
        orderParams.stopPrice = parseFloat(stopPrice);
      }

      // Add TP/SL if enabled
      if (enableTPSL) {
        orderParams.stopLossPrice = parseFloat(stopLossPrice);
        orderParams.takeProfitPrice = parseFloat(takeProfitPrice);
      }

      const result = await executeOrder(orderParams, activeExchange, 'Manual');

      if (result.success) {
        setStatusMsg({ type: 'success', text: `✅ Ordem enviada! ID: ${result.orderId}` });
      } else {
        setStatusMsg({ type: 'error', text: result.message });
      }
    } catch (error: any) {
      setStatusMsg({ type: 'error', text: error.message || 'Erro fatal' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const leveragePresets = [1, 5, 10, 20, 50, 100];

  return (
    <div className="flex flex-col gap-3 h-full text-sm">

      {/* Saldo */}
      <div className="flex justify-between items-center text-xs text-gray-400 bg-black/30 p-3 rounded-lg border border-[#2A303C]">
        <div className="flex items-center gap-2"><Wallet size={14} /> Disponível:</div>
        <div className="font-mono text-white font-bold text-base">${realBalance.toFixed(2)}</div>
      </div>

      {/* Modo de Ordem (Tabs) */}
      <div className="flex gap-1 bg-[#0B0E14] p-1 rounded-lg">
        {(['LIMIT', 'MARKET', 'STOP_LIMIT'] as OrderMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setOrderMode(mode)}
            className={`flex-1 py-2 rounded-md text-xs font-bold transition-all ${orderMode === mode
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-[#2A303C]'
              }`}
          >
            {mode === 'STOP_LIMIT' ? 'Stop Limit' : mode}
          </button>
        ))}
      </div>

      {/* Botões Lado */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setSide('BUY')}
          className={`py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${side === 'BUY'
              ? 'bg-green-600 text-white shadow-lg shadow-green-900/30'
              : 'bg-[#1A2530] text-gray-400 hover:bg-[#253540] border border-green-900/30'
            }`}
        >
          <TrendingUp size={16} />
          COMPRAR / LONG
        </button>
        <button
          onClick={() => setSide('SELL')}
          className={`py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${side === 'SELL'
              ? 'bg-red-600 text-white shadow-lg shadow-red-900/30'
              : 'bg-[#2A1A1A] text-gray-400 hover:bg-[#3A2525] border border-red-900/30'
            }`}
        >
          <TrendingDown size={16} />
          VENDER / SHORT
        </button>
      </div>

      {/* Campos de Preço (Limit/Stop-Limit) */}
      {orderMode !== 'MARKET' && (
        <div className="space-y-3 bg-[#0B0E14]/50 p-3 rounded-lg border border-[#2A303C]">
          {orderMode === 'STOP_LIMIT' && (
            <div>
              <label className="text-xs text-gray-500 font-bold uppercase">Preço de Ativação (Stop)</label>
              <div className="relative mt-1">
                <input
                  type="number"
                  value={stopPrice}
                  onChange={e => setStopPrice(e.target.value)}
                  placeholder="Ex: 70500"
                  className="w-full bg-[#0B0E14] border border-yellow-500/30 rounded-lg py-2 px-3 text-white font-mono focus:border-yellow-500 outline-none"
                />
                <span className="absolute right-3 top-2 text-yellow-500 text-xs font-bold">STOP</span>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs text-gray-500 font-bold uppercase">Preço Limite</label>
            <div className="relative mt-1">
              <input
                type="number"
                value={limitPrice}
                onChange={e => setLimitPrice(e.target.value)}
                placeholder="Ex: 70600"
                className="w-full bg-[#0B0E14] border border-[#2A303C] rounded-lg py-2 px-3 text-white font-mono focus:border-indigo-500 outline-none"
              />
              <button
                onClick={() => setLimitPrice(currentPrice.toFixed(2))}
                className="absolute right-2 top-1.5 text-[10px] bg-indigo-600 hover:bg-indigo-500 px-2 py-1 rounded text-white font-bold"
              >
                ÚLTIMO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Valor USD */}
      <div>
        <label className="text-xs text-gray-500 font-bold uppercase ml-1">Valor da Ordem (USD)</label>
        <div className="relative mt-1">
          <span className="absolute left-3 top-2.5 text-gray-400 font-bold">$</span>
          <input
            type="number"
            value={amountUSD}
            onChange={e => setAmountUSD(e.target.value)}
            className="w-full bg-[#0B0E14] border border-[#2A303C] rounded-lg py-2 pl-8 pr-4 text-white font-mono focus:border-indigo-500 outline-none"
          />
        </div>
        <div className="flex gap-1 mt-2">
          {[25, 50, 100, 250, 500].map(val => (
            <button
              key={val}
              onClick={() => setAmountUSD(val.toString())}
              className={`flex-1 py-1 text-xs rounded ${amountUSD === val.toString()
                  ? 'bg-indigo-600 text-white'
                  : 'bg-[#1A1F2E] text-gray-400 hover:bg-[#2A303C]'
                }`}
            >
              ${val}
            </button>
          ))}
        </div>
      </div>

      {/* Alavancagem */}
      <div>
        <label className="text-xs text-gray-500 font-bold uppercase ml-1">
          Alavancagem: <span className="text-indigo-400">{leverage}x</span>
        </label>
        <input
          type="range"
          min="1" max="100" step="1"
          value={leverage}
          onChange={e => setLeverage(parseInt(e.target.value))}
          className="w-full mt-2 accent-indigo-500 h-2"
        />
        <div className="flex gap-1 mt-2">
          {leveragePresets.map(val => (
            <button
              key={val}
              onClick={() => setLeverage(val)}
              className={`flex-1 py-1 text-xs rounded font-bold ${leverage === val
                  ? 'bg-indigo-600 text-white'
                  : 'bg-[#1A1F2E] text-gray-400 hover:bg-[#2A303C]'
                }`}
            >
              {val}x
            </button>
          ))}
        </div>
      </div>

      {/* TP/SL Toggle */}
      <div className="bg-[#0B0E14]/50 p-3 rounded-lg border border-[#2A303C]">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={enableTPSL}
            onChange={e => setEnableTPSL(e.target.checked)}
            className="w-4 h-4 accent-indigo-500"
          />
          <Shield size={14} className="text-indigo-400" />
          <span className="text-xs font-bold text-gray-300 uppercase">TP/SL (Take Profit / Stop Loss)</span>
        </label>

        {enableTPSL && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            {/* Take Profit */}
            <div>
              <label className="text-[10px] text-green-400 font-bold flex items-center gap-1 mb-1">
                <Target size={10} /> Take Profit
              </label>
              <input
                type="number"
                value={takeProfitPrice}
                onChange={e => setTakeProfitPrice(e.target.value)}
                className="w-full bg-[#0B0E14] border border-green-500/30 rounded-lg py-2 px-2 text-green-400 font-mono text-xs focus:border-green-500 outline-none"
              />
              <div className="flex gap-1 mt-1">
                {[2, 5, 10, 15].map(pct => (
                  <button
                    key={pct}
                    onClick={() => {
                      setTakeProfitPercent(pct);
                      const tp = side === 'BUY'
                        ? currentPrice * (1 + pct / 100)
                        : currentPrice * (1 - pct / 100);
                      setTakeProfitPrice(tp.toFixed(2));
                    }}
                    className={`flex-1 py-0.5 text-[10px] rounded ${takeProfitPercent === pct ? 'bg-green-600 text-white' : 'bg-[#1A2A1A] text-green-400/60'}`}
                  >
                    +{pct}%
                  </button>
                ))}
              </div>
            </div>

            {/* Stop Loss */}
            <div>
              <label className="text-[10px] text-red-400 font-bold flex items-center gap-1 mb-1">
                <AlertCircle size={10} /> Stop Loss
              </label>
              <input
                type="number"
                value={stopLossPrice}
                onChange={e => setStopLossPrice(e.target.value)}
                className="w-full bg-[#0B0E14] border border-red-500/30 rounded-lg py-2 px-2 text-red-400 font-mono text-xs focus:border-red-500 outline-none"
              />
              <div className="flex gap-1 mt-1">
                {[1, 2, 5, 10].map(pct => (
                  <button
                    key={pct}
                    onClick={() => {
                      setStopLossPercent(pct);
                      const sl = side === 'BUY'
                        ? currentPrice * (1 - pct / 100)
                        : currentPrice * (1 + pct / 100);
                      setStopLossPrice(sl.toFixed(2));
                    }}
                    className={`flex-1 py-0.5 text-[10px] rounded ${stopLossPercent === pct ? 'bg-red-600 text-white' : 'bg-[#2A1A1A] text-red-400/60'}`}
                  >
                    -{pct}%
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
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
        <div className={`p-3 rounded-lg text-xs flex items-start gap-2 ${statusMsg.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'}`}>
          {statusMsg.type === 'success' ? <CheckCircle size={14} className="mt-0.5" /> : <AlertCircle size={14} className="mt-0.5" />}
          <span>{statusMsg.text}</span>
        </div>
      )}
    </div>
  );
}