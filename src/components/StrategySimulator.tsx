
import React, { useState } from 'react';
import { StrategyProfile, LeverageOption } from '../types';
import { Calculator, ChevronDown, DollarSign, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

interface StrategySimulatorProps {
  profiles: StrategyProfile[];
}

const LEVERAGE_OPTIONS: LeverageOption[] = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100];

const StrategySimulator: React.FC<StrategySimulatorProps> = ({ profiles }) => {
  const [investment, setInvestment] = useState(1000);
  const [leverage, setLeverage] = useState<LeverageOption>(10);
  const [selectedProfileId, setSelectedProfileId] = useState(profiles[0]?.id || '');

  const selectedProfile = profiles.find(p => p.id === selectedProfileId) || profiles[0];
  
  const positionSize = investment * leverage;
  const tpPercent = selectedProfile?.takeProfit || 5;
  const slPercent = selectedProfile?.stopLoss || 2;
  
  const estProfit = (positionSize * (tpPercent / 100));
  const estLoss = (positionSize * (slPercent / 100));
  const roi = (estProfit / investment) * 100;
  const risk = (estLoss / investment) * 100;

  return (
    <div className="bg-[#1E1B2E] border border-indigo-500/20 rounded-xl overflow-hidden shadow-2xl relative">
      <div className="p-5 bg-indigo-900/20 border-b border-indigo-500/20 flex items-center gap-3">
        <div className="p-3 bg-indigo-500/20 rounded-lg text-indigo-400">
            <Calculator size={24} />
        </div>
        <div>
            <h3 className="font-bold text-white text-xl">Simulador de Potencial de Ganho</h3>
            <p className="text-sm text-indigo-300">Cálculo de exposição baseado no capital alocado e alavancagem</p>
        </div>
      </div>

      <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-6">
            <div>
                <label className="text-xs uppercase font-bold text-gray-400 mb-2 block tracking-widest">Investimento (USD)</label>
                <div className="relative">
                    <DollarSign size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input 
                        type="number" 
                        value={investment}
                        onChange={(e) => setInvestment(Number(e.target.value))}
                        className="w-full bg-[#151A25] border border-gray-700 rounded-xl py-4 pl-10 pr-4 text-white text-lg font-mono focus:border-indigo-500 focus:outline-none transition-all"
                        placeholder="Ex: 1000"
                    />
                </div>
            </div>
            
            <div>
                <label className="text-xs uppercase font-bold text-gray-400 mb-2 block tracking-widest">Alavancagem Granular</label>
                <div className="relative">
                    <select 
                        value={leverage}
                        onChange={(e) => setLeverage(Number(e.target.value) as LeverageOption)}
                        className="w-full bg-[#151A25] border border-gray-700 rounded-xl py-4 px-4 text-white text-lg font-mono focus:border-indigo-500 focus:outline-none appearance-none cursor-pointer transition-all"
                    >
                        {LEVERAGE_OPTIONS.map(opt => (
                            <option key={opt} value={opt}>{opt}x</option>
                        ))}
                    </select>
                    <ChevronDown size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                </div>
            </div>

            <div>
                <label className="text-xs uppercase font-bold text-gray-400 mb-2 block tracking-widest">Selecionar Perfil Estratégico</label>
                <div className="relative">
                    <select 
                        value={selectedProfileId}
                        onChange={(e) => setSelectedProfileId(e.target.value)}
                        className="w-full bg-[#151A25] border border-gray-700 rounded-xl py-4 px-4 text-white text-lg focus:border-indigo-500 focus:outline-none appearance-none cursor-pointer transition-all"
                    >
                        {profiles.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                    <ChevronDown size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                </div>
            </div>
        </div>

        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                    <TrendingUp size={80} className="text-green-500" />
                </div>
                <div>
                    <div className="text-sm font-bold text-green-500 uppercase tracking-widest mb-1">Lucro Estimado (Target)</div>
                    <div className="text-4xl font-mono font-bold text-white">${estProfit.toLocaleString(undefined, {maximumFractionDigits: 2})}</div>
                    <div className="text-lg font-bold text-green-400 mt-2">+{roi.toFixed(1)}% ROI Real</div>
                </div>
                <div className="mt-6 pt-6 border-t border-green-500/20 text-sm text-green-300/70">
                    Calculado com Take Profit de {tpPercent}% e exposição de ${positionSize.toLocaleString()}
                </div>
            </div>

            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                    <TrendingDown size={80} className="text-red-500" />
                </div>
                <div>
                    <div className="text-sm font-bold text-red-500 uppercase tracking-widest mb-1">Risco Estimado (Stop)</div>
                    <div className="text-4xl font-mono font-bold text-white">-${estLoss.toLocaleString(undefined, {maximumFractionDigits: 2})}</div>
                    <div className="text-lg font-bold text-red-400 mt-2">-{risk.toFixed(1)}% de Perda</div>
                </div>
                <div className="mt-6 pt-6 border-t border-red-500/20 text-sm text-red-300/70 flex items-center gap-2">
                    <AlertTriangle size={14} /> Stop Loss de {slPercent}% configurado no perfil.
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default StrategySimulator;
