
import React from 'react';
import { StrategyProfile, Language } from '../types';
import { translations } from '../utils/translations';
import { Shield, Scale, Rocket, Target, Zap, ArrowDown, Pencil, Plus } from 'lucide-react';

interface StrategyCardProps {
  profile: StrategyProfile;
  lang: Language;
  onEdit: (profile: StrategyProfile) => void;
  onToggle: (id: string) => void;
  isAddButton?: boolean;
  onAdd?: () => void;
}

const colorMap: Record<string, string> = {
  blue: 'border-blue-500/50 shadow-blue-500/10',
  yellow: 'border-yellow-500/50 shadow-yellow-500/10',
  orange: 'border-orange-500/50 shadow-orange-500/10',
  purple: 'border-purple-500/50 shadow-purple-500/10',
  red: 'border-red-500/50 shadow-red-500/10',
  indigo: 'border-indigo-500/50 shadow-indigo-500/10',
  gray: 'border-gray-500/50 shadow-gray-500/10'
};

const StrategyCard: React.FC<StrategyCardProps> = React.memo(({ profile, lang, onEdit, onToggle, isAddButton, onAdd }) => {
  const t = translations[lang].strategy_card;

  if (isAddButton) {
    return (
      <div 
        onClick={onAdd}
        className="relative bg-surface rounded-2xl border border-card-border border-dashed hover:border-primary/50 cursor-pointer shadow-xl p-5 flex flex-col items-center justify-center min-h-[300px] transition-all duration-300 hover:transform hover:-translate-y-2 group"
      >
        <div className="p-4 rounded-full bg-white/5 group-hover:bg-primary/20 transition-colors mb-4">
           <Plus size={32} className="text-gray-500 group-hover:text-primary" />
        </div>
        <h3 className="font-bold text-gray-400 group-hover:text-white uppercase tracking-wider text-sm">{t.create_new}</h3>
        <p className="text-xs text-gray-600 text-center mt-2 px-4">Defina parâmetros personalizados de risco e execução.</p>
      </div>
    );
  }

  const getIcon = () => {
    switch (profile.id) {
      case 'SAFE': return <Shield size={24} className="text-blue-400" />;
      case 'MODERATE': return <Scale size={24} className="text-yellow-400" />;
      case 'BOLD': return <Rocket size={24} className="text-orange-400" />;
      case 'SPECIALIST': return <Target size={24} className="text-purple-400" />;
      case 'ALPHA': return <Zap size={24} className="text-red-400" />;
      default: return <Target size={24} className="text-indigo-400" />;
    }
  };

  return (
    <div className={`relative bg-surface rounded-2xl border ${colorMap[profile.color] || 'border-card-border'} shadow-xl p-5 flex flex-col transition-all duration-300 hover:transform hover:-translate-y-2 group overflow-hidden`}>
      
      {/* Background Glow */}
      <div className={`absolute -top-10 -right-10 w-24 h-24 rounded-full blur-[40px] opacity-20 bg-${profile.color}-500`}></div>

      <div className="flex items-center justify-between mb-6">
        <div className={`p-3 rounded-xl bg-black/40 border border-white/5`}>
          {getIcon()}
        </div>
        <div className="text-right">
            <h3 className="font-black text-white text-sm uppercase tracking-tighter leading-none">{profile.name}</h3>
            <span className={`text-[9px] font-bold uppercase text-gray-500 mt-1 block`}>{profile.riskLevel} Risk</span>
        </div>
      </div>

      {/* Logic Pipeline */}
      <div className="flex flex-col items-center gap-2 py-4 bg-black/20 rounded-xl mb-4 border border-white/5 min-h-[100px]">
        <div className="text-[9px] text-gray-500 uppercase font-bold tracking-widest mb-1">Workflow IA</div>
        {profile.workflowSteps.slice(0, 3).map((step, idx) => (
            <React.Fragment key={idx}>
                <div className="text-[10px] font-mono font-bold bg-surface border border-card-border px-3 py-1.5 rounded-lg text-gray-300 w-[90%] text-center truncate">
                    {step}
                </div>
                {idx < Math.min(profile.workflowSteps.length, 3) - 1 && (
                    <ArrowDown size={10} className="text-gray-700" />
                )}
            </React.Fragment>
        ))}
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-[10px] uppercase font-bold text-gray-500">
            <span>Alavancagem</span>
            <span className="text-white font-mono">{profile.leverage}x</span>
        </div>
        <div className="flex justify-between text-[10px] uppercase font-bold text-gray-500">
            <span>Capital Alocado</span>
            <span className="text-white font-mono">${profile.capital}</span>
        </div>
        <div className="flex justify-between text-[10px] uppercase font-bold text-gray-500">
            <span>TP / SL</span>
            <span className="text-primary font-mono">{profile.takeProfit}% / {profile.stopLoss}%</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-auto">
        <div className="bg-black/30 p-2 rounded-lg border border-white/5 text-center">
            <div className="text-[8px] text-gray-500 uppercase font-bold">{t.win_rate}</div>
            <div className="text-xs font-mono font-bold text-white">{profile.winRate}%</div>
        </div>
        <div className="bg-black/30 p-2 rounded-lg border border-white/5 text-center">
            <div className="text-[8px] text-gray-500 uppercase font-bold">{t.trades}</div>
            <div className="text-xs font-mono font-bold text-white">{profile.trades}</div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
          {/* Toggle Switch */}
          <button 
            onClick={() => onToggle(profile.id)}
            className="flex items-center gap-2 cursor-pointer focus:outline-none"
            title={profile.active ? "Desativar" : "Ativar"}
          >
            <div className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-300 ${profile.active ? 'bg-green-500' : 'bg-gray-700'}`}>
                <div className={`w-3 h-3 bg-white rounded-full shadow-md transform transition-transform duration-300 ${profile.active ? 'translate-x-4' : 'translate-x-0'}`}></div>
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-tighter ${profile.active ? 'text-green-400' : 'text-gray-500'}`}>
                {profile.active ? 'ON' : 'OFF'}
            </span>
          </button>

          <button 
            onClick={() => onEdit(profile)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all text-[10px] font-bold uppercase"
          >
            <Pencil size={12} /> Config
          </button>
      </div>
    </div>
  );
});

export default StrategyCard;
