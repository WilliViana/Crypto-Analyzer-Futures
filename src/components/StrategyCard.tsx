
import React from 'react';
import { StrategyProfile, Language, Trade } from '../types';
import { translations } from '../utils/translations';
import { Shield, Scale, Rocket, Target, Zap, ArrowDown, ArrowUp, Pencil, Plus, Info, HelpCircle, Trash2, GripVertical } from 'lucide-react';

interface StrategyCardProps {
  profile: StrategyProfile;
  lang: Language;
  onEdit: (profile: StrategyProfile) => void;
  onToggle: (id: string) => void;
  onDelete?: (id: string) => void;
  isAddButton?: boolean;
  onAdd?: () => void;
  trades?: Trade[];
  isTopPerformer?: boolean;
  onMoveUp?: (id: string) => void;
  onMoveDown?: (id: string) => void;
  isFirst?: boolean;
  isLast?: boolean;
  onDragStart?: (id: string) => void;
  onDragOver?: (id: string) => void;
  onDrop?: (id: string) => void;
  isDragOver?: boolean;
}

const colorMap: Record<string, string> = {
  blue: 'border-blue-500/50 shadow-blue-500/10',
  yellow: 'border-yellow-500/50 shadow-yellow-500/10',
  orange: 'border-orange-500/50 shadow-orange-500/10',
  purple: 'border-purple-500/50 shadow-purple-500/10',
  red: 'border-red-500/50 shadow-red-500/10',
  indigo: 'border-indigo-500/50 shadow-indigo-500/10',
  gray: 'border-gray-500/50 shadow-gray-500/10',
  cyan: 'border-cyan-500/50 shadow-cyan-500/10'
};

// Metric descriptions
const metricDescriptions: Record<string, string> = {
  leverage: "Multiplicador de capital. Maior alavancagem = maior risco e potencial de lucro.",
  capital: "Valor em USD alocado para este perfil operar.",
  takeProfit: "% de lucro em que a posição será fechada automaticamente.",
  stopLoss: "% de perda em que a posição será fechada para limitar perdas.",
  confidence: "Nível mínimo de confiança do sinal para abrir uma ordem.",
};

const StrategyCard: React.FC<StrategyCardProps> = React.memo(({ profile, lang, onEdit, onToggle, onDelete, isAddButton, onAdd, trades = [], isTopPerformer = false, onMoveUp, onMoveDown, isFirst, isLast, onDragStart, onDragOver, onDrop, isDragOver }) => {
  const t = translations[lang].strategy_card;
  const [isDragging, setIsDragging] = React.useState(false);

  // Calculate real stats from trades matched to this profile
  const realStats = React.useMemo(() => {
    if (trades.length === 0) return { totalTrades: 0, winRate: 0, totalPnL: 0 };
    
    const pName = profile.name.toLowerCase();
    const pId = profile.id.toLowerCase();
    
    // Match trades by strategyName (case-insensitive, includes), strategyId, or exact id
    const profileTrades = trades.filter(t => {
      const sName = (t.strategyName || '').toLowerCase();
      const sId = (t.strategyId || '').toLowerCase();
      return (
        sName === pName ||
        sName === pId ||
        sId === pId ||
        sId === pName ||
        (sName && sName.includes(pName) && pName.length > 2) ||
        (sName && pName.includes(sName) && sName.length > 2)
      );
    });
    
    if (profileTrades.length === 0) return { totalTrades: 0, winRate: 0, totalPnL: 0 };
    
    const closedTrades = profileTrades.filter(t => t.status === 'CLOSED');
    const allTrades = closedTrades.length > 0 ? closedTrades : profileTrades;
    const wins = allTrades.filter(t => t.pnl > 0).length;
    const winRate = allTrades.length > 0 ? Math.round((wins / allTrades.length) * 100) : 0;
    const totalPnL = allTrades.reduce((s, t) => s + (t.pnl || 0), 0);
    return { totalTrades: allTrades.length, winRate, totalPnL };
  }, [trades, profile]);

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

  // Tooltip component
  const Tooltip = ({ text }: { text: string }) => (
    <div className="group/tooltip relative inline-flex ml-1">
      <HelpCircle size={10} className="text-gray-600 hover:text-gray-400 cursor-help" />
      <div className="invisible group-hover/tooltip:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/90 text-gray-300 text-[9px] rounded whitespace-nowrap z-50 border border-gray-700">
        {text}
      </div>
    </div>
  );

  // Fire animation styles for top performer
  const fireStyles = isTopPerformer && profile.active ? `
    ring-2 ring-orange-500/50 
    before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-t before:from-orange-500/20 before:via-transparent before:to-transparent before:animate-pulse
    after:absolute after:-top-24 after:left-1/2 after:-translate-x-1/2 after:w-32 after:h-32 after:bg-orange-500/30 after:rounded-full after:blur-3xl after:animate-pulse
  ` : '';

  const dragOverStyle = isDragOver ? 'ring-2 ring-primary/50 scale-[1.02]' : '';
  const draggingStyle = isDragging ? 'opacity-50 scale-95 rotate-1' : '';

  return (
    <div
      draggable={!!onDragStart}
      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; setIsDragging(true); onDragStart?.(profile.id); }}
      onDragEnd={() => setIsDragging(false)}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; onDragOver?.(profile.id); }}
      onDrop={(e) => { e.preventDefault(); setIsDragging(false); onDrop?.(profile.id); }}
      className={`relative bg-surface rounded-2xl border ${colorMap[profile.color] || 'border-card-border'} shadow-xl p-5 flex flex-col transition-all duration-300 hover:transform hover:-translate-y-2 group overflow-hidden cursor-grab active:cursor-grabbing ${!profile.active ? 'opacity-40 grayscale' : ''} ${fireStyles} ${dragOverStyle} ${draggingStyle}`}
    >
      {/* 🔥 Top Performer Badge */}
      {isTopPerformer && profile.active && (
        <div className="absolute -top-1 -right-1 z-20">
          <div className="relative">
            <span className="text-2xl animate-bounce">🔥</span>
            <div className="absolute inset-0 animate-ping text-2xl opacity-50">🔥</div>
          </div>
        </div>
      )}

      {/* Inactive overlay - clickable to reactivate */}
      {!profile.active && (
        <button
          onClick={() => onToggle(profile.id)}
          className="absolute inset-0 bg-black/30 z-10 flex items-center justify-center cursor-pointer hover:bg-black/20 transition-colors"
        >
          <span className="bg-gray-800 hover:bg-green-600 text-gray-400 hover:text-white px-4 py-2 rounded-full text-xs font-bold uppercase transition-colors">
            Clique para Ativar
          </span>
        </button>
      )}

      {/* Background Glow */}
      <div className={`absolute -top-10 -right-10 w-24 h-24 rounded-full blur-[40px] opacity-20 bg-${profile.color}-500`}></div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          {/* Priority Badge */}
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black bg-${profile.color}-500/20 text-${profile.color}-400 border border-${profile.color}-500/30`}>
            {profile.priority ?? '?'}
          </div>
          <div className={`p-3 rounded-xl bg-black/40 border border-white/5`}>
            {getIcon()}
          </div>
        </div>
        <div className="text-right flex items-center gap-2">
          <div>
            <h3 className="font-black text-white text-sm uppercase tracking-tighter leading-none">{profile.name}</h3>
            <span className={`text-[9px] font-bold uppercase text-gray-500 mt-1 block`}>{profile.riskLevel} Risk</span>
          </div>
          {/* Drag Handle */}
          {onDragStart && (
            <GripVertical size={16} className="text-gray-600 hover:text-gray-400 cursor-grab" />
          )}
        </div>
      </div>

      {/* Logic Pipeline */}
      <div className="flex flex-col items-center gap-2 py-4 bg-black/20 rounded-xl mb-4 border border-white/5 min-h-[100px]">
        <div className="text-[9px] text-gray-500 uppercase font-bold tracking-widest mb-1">Workflow IA</div>
        {(profile.workflowSteps || []).length > 0 ? (
          (profile.workflowSteps || []).slice(0, 3).map((step, idx) => (
            <React.Fragment key={idx}>
              <div className="text-[10px] font-mono font-bold bg-surface border border-card-border px-3 py-1.5 rounded-lg text-gray-300 w-[90%] text-center truncate">
                {step}
              </div>
              {idx < Math.min((profile.workflowSteps || []).length, 3) - 1 && (
                <ArrowDown size={10} className="text-gray-700" />
              )}
            </React.Fragment>
          ))
        ) : (
          <div className="flex flex-col items-center gap-2 py-2">
            <div className="text-[10px] text-gray-600 italic">Nenhum workflow definido</div>
            <div className="text-[9px] text-gray-700">Configure via botão "Config" abaixo</div>
          </div>
        )}
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-[10px] uppercase font-bold text-gray-500">
          <span className="flex items-center">
            Alavancagem
            <Tooltip text={metricDescriptions.leverage} />
          </span>
          <span className="text-white font-mono">{profile.leverage}x</span>
        </div>
        <div className="flex justify-between text-[10px] uppercase font-bold text-gray-500">
          <span className="flex items-center">
            Capital Alocado
            <Tooltip text={metricDescriptions.capital} />
          </span>
          <span className="text-white font-mono">${profile.capital}</span>
        </div>
        <div className="flex justify-between text-[10px] uppercase font-bold text-gray-500">
          <span className="flex items-center">
            TP / SL
            <Tooltip text={`TP: ${metricDescriptions.takeProfit} | SL: ${metricDescriptions.stopLoss}`} />
          </span>
          <span className="text-primary font-mono">{profile.takeProfit}% / {profile.stopLoss}%</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-auto">
        <div className="bg-black/30 p-2 rounded-lg border border-white/5 text-center">
          <div className="text-[8px] text-gray-500 uppercase font-bold flex items-center justify-center gap-1">
            {t.win_rate}
            {realStats.totalTrades > 0 && <span className="text-green-400">(Real)</span>}
          </div>
          <div className={`text-xs font-mono font-bold ${realStats.totalTrades > 0 ? (realStats.winRate >= 50 ? 'text-green-400' : 'text-red-400') : 'text-white'}`}>
            {realStats.winRate}%
          </div>
        </div>
        <div className="bg-black/30 p-2 rounded-lg border border-white/5 text-center">
          <div className="text-[8px] text-gray-500 uppercase font-bold">{t.trades}</div>
          <div className="text-xs font-mono font-bold text-white">
            {realStats.totalTrades > 0 ? realStats.totalTrades : (profile.trades || 0)}
          </div>
        </div>
        <div className="bg-black/30 p-2 rounded-lg border border-white/5 text-center">
          <div className="text-[8px] text-gray-500 uppercase font-bold">Retorno</div>
          <div className={`text-xs font-mono font-bold ${realStats.totalPnL > 0 ? 'text-green-400' : realStats.totalPnL < 0 ? 'text-red-400' : 'text-gray-500'}`}>
            {realStats.totalPnL !== 0 ? `${realStats.totalPnL >= 0 ? '+' : ''}$${realStats.totalPnL.toFixed(2)}` : '$0.00'}
          </div>
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

        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(profile.id); }}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-all text-[10px] font-bold"
            title="Excluir perfil"
          >
            <Trash2 size={12} />
          </button>
        )}

        {/* Reorder Buttons */}
        {(onMoveUp || onMoveDown) && (
          <div className="flex flex-col gap-0.5 ml-1">
            <button
              onClick={(e) => { e.stopPropagation(); onMoveUp?.(profile.id); }}
              disabled={isFirst}
              className={`p-0.5 rounded transition-all ${isFirst ? 'text-gray-700 cursor-not-allowed' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
              title="Mover para cima"
            >
              <ArrowUp size={12} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onMoveDown?.(profile.id); }}
              disabled={isLast}
              className={`p-0.5 rounded transition-all ${isLast ? 'text-gray-700 cursor-not-allowed' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
              title="Mover para baixo"
            >
              <ArrowDown size={12} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

export default StrategyCard;
