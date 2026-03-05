
import React, { useState } from 'react';
import { StrategyProfile, Language } from '../types';
import { ShieldAlert, Globe2, Layers, Unlock, TrendingUp, TrendingDown, Target, AlertTriangle, CheckCircle, Settings2, Percent } from 'lucide-react';

export type RiskMode = 'general' | 'profile' | 'free';

interface RiskManagementProps {
    riskMode: RiskMode;
    setRiskMode: (mode: RiskMode) => void;
    dailyTargetPct: number;
    setDailyTargetPct: (v: number) => void;
    dailyStopLossPct: number;
    setDailyStopLossPct: (v: number) => void;
    profiles: StrategyProfile[];
    setProfiles: React.Dispatch<React.SetStateAction<StrategyProfile[]>>;
    lang: Language;
}

export default function RiskManagement({
    riskMode, setRiskMode,
    dailyTargetPct, setDailyTargetPct,
    dailyStopLossPct, setDailyStopLossPct,
    profiles, setProfiles, lang
}: RiskManagementProps) {
    const [selectedMode, setSelectedMode] = useState<RiskMode>(riskMode);
    const isActivated = selectedMode === riskMode;

    const modes = [
        { id: 'general' as RiskMode, label: 'Geral', icon: Globe2, desc: 'Limites de ganho e perda para toda a plataforma', color: 'indigo' },
        { id: 'profile' as RiskMode, label: 'Perfis', icon: Layers, desc: 'Limites específicos por perfil de investimento', color: 'purple' },
        { id: 'free' as RiskMode, label: 'Livre', icon: Unlock, desc: 'Sem limites — a plataforma opera sem restrições', color: 'red' },
    ];

    const handleActivate = () => {
        setRiskMode(selectedMode);
        localStorage.setItem('cap_risk_mode', selectedMode);
    };

    const updateProfileRisk = (profileId: string, field: 'profileDailyTargetPct' | 'profileDailyStopLossPct', value: number) => {
        setProfiles(prev => prev.map(p =>
            p.id === profileId ? { ...p, [field]: value } : p
        ));
    };

    const colorMap: Record<string, string> = {
        blue: 'from-blue-500 to-blue-700',
        yellow: 'from-yellow-500 to-yellow-700',
        orange: 'from-orange-500 to-orange-700',
        purple: 'from-purple-500 to-purple-700',
        red: 'from-red-500 to-red-700',
    };

    return (
        <div className="max-w-5xl mx-auto w-full animate-fade-in pb-20">
            {/* Header */}
            <div className="bg-surface border border-card-border rounded-xl p-6 mb-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-amber-500/20 rounded-lg">
                        <ShieldAlert size={24} className="text-amber-400" />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-xl font-bold text-white uppercase tracking-tighter">Gestão de Riscos</h2>
                        <p className="text-sm text-gray-500">Selecione e ative um modo de risco para proteger seu capital.</p>
                    </div>
                    {/* Active badge */}
                    <div className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${riskMode === 'general' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' :
                        riskMode === 'profile' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                            'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}>
                        <CheckCircle size={12} />
                        Ativo: {riskMode === 'general' ? 'Geral' : riskMode === 'profile' ? 'Perfis' : 'Livre'}
                    </div>
                </div>
            </div>

            {/* Mode Selector */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {modes.map(mode => {
                    const Icon = mode.icon;
                    const isSelected = selectedMode === mode.id;
                    const isCurrentlyActive = riskMode === mode.id;
                    return (
                        <button
                            key={mode.id}
                            onClick={() => setSelectedMode(mode.id)}
                            className={`p-5 rounded-xl border-2 transition-all text-left group relative ${isSelected
                                ? `border-${mode.color}-500 bg-${mode.color}-500/10 shadow-lg shadow-${mode.color}-500/10`
                                : 'border-card-border bg-surface hover:border-gray-600'
                                }`}
                        >
                            {isCurrentlyActive && (
                                <div className="absolute top-2 right-2">
                                    <span className="text-[7px] bg-green-500 text-white px-1.5 py-0.5 rounded-full font-bold uppercase">Ativo</span>
                                </div>
                            )}
                            <div className="flex items-center gap-3 mb-2">
                                <div className={`p-2 rounded-lg ${isSelected ? `bg-${mode.color}-500/20` : 'bg-white/5'}`}>
                                    <Icon size={20} className={isSelected ? `text-${mode.color}-400` : 'text-gray-500'} />
                                </div>
                                <span className={`text-sm font-bold uppercase tracking-wider ${isSelected ? 'text-white' : 'text-gray-400'}`}>{mode.label}</span>
                            </div>
                            <p className="text-xs text-gray-500 leading-relaxed">{mode.desc}</p>
                        </button>
                    );
                })}
            </div>

            {/* Activate Button */}
            {!isActivated && (
                <div className="mb-6 flex justify-center">
                    <button
                        onClick={handleActivate}
                        className="px-8 py-3 bg-primary text-white rounded-xl font-bold uppercase text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center gap-2"
                    >
                        <CheckCircle size={16} />
                        Ativar Modo "{selectedMode === 'general' ? 'Geral' : selectedMode === 'profile' ? 'Perfis' : 'Livre'}"
                    </button>
                </div>
            )}

            {/* General Mode Config */}
            {selectedMode === 'general' && (
                <div className="bg-surface border border-card-border rounded-xl p-6 space-y-6 animate-fade-in">
                    <div className="flex items-center gap-2 mb-4">
                        <Settings2 size={18} className="text-indigo-400" />
                        <h3 className="text-lg font-bold text-white">Configurações Gerais</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Daily Target */}
                        <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <TrendingUp size={18} className="text-green-400" />
                                <span className="text-sm font-bold text-green-400 uppercase">Meta de Ganho Diário</span>
                            </div>
                            <p className="text-xs text-gray-500 mb-4">Ao atingir essa % de lucro, o motor pausa e pergunta se deseja continuar.</p>
                            <div className="flex items-center gap-3">
                                <input
                                    type="range"
                                    min="1"
                                    max="50"
                                    value={dailyTargetPct}
                                    onChange={(e) => {
                                        setDailyTargetPct(Number(e.target.value));
                                        localStorage.setItem('cap_daily_target', e.target.value);
                                    }}
                                    className="flex-1 accent-green-500"
                                    aria-label="Meta de ganho diário"
                                />
                                <div className="flex items-center gap-1 bg-green-500/20 px-3 py-2 rounded-lg min-w-[80px] justify-center">
                                    <span className="text-xl font-bold text-green-400">{dailyTargetPct}</span>
                                    <Percent size={14} className="text-green-500" />
                                </div>
                            </div>
                        </div>

                        {/* Daily Stop Loss */}
                        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <TrendingDown size={18} className="text-red-400" />
                                <span className="text-sm font-bold text-red-400 uppercase">Stop Loss Diário</span>
                            </div>
                            <p className="text-xs text-gray-500 mb-4">Se a perda do dia atingir essa %, o motor para automaticamente para proteger o capital.</p>
                            <div className="flex items-center gap-3">
                                <input
                                    type="range"
                                    min="1"
                                    max="30"
                                    value={dailyStopLossPct}
                                    onChange={(e) => {
                                        setDailyStopLossPct(Number(e.target.value));
                                        localStorage.setItem('cap_daily_stoploss', e.target.value);
                                    }}
                                    className="flex-1 accent-red-500"
                                    aria-label="Stop loss diário"
                                />
                                <div className="flex items-center gap-1 bg-red-500/20 px-3 py-2 rounded-lg min-w-[80px] justify-center">
                                    <span className="text-xl font-bold text-red-400">-{dailyStopLossPct}</span>
                                    <Percent size={14} className="text-red-500" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="bg-black/20 border border-white/5 rounded-lg p-4 mt-4">
                        <p className="text-xs text-gray-400">
                            <strong className="text-white">Resumo:</strong> O motor buscará lucro de <span className="text-green-400 font-bold">{dailyTargetPct}%</span> e parará se a perda atingir <span className="text-red-400 font-bold">-{dailyStopLossPct}%</span> no dia.
                        </p>
                    </div>
                </div>
            )}

            {/* Profile Mode Config */}
            {selectedMode === 'profile' && (
                <div className="space-y-4 animate-fade-in">
                    <div className="flex items-center gap-2 mb-2 bg-surface border border-card-border rounded-xl p-4">
                        <Layers size={18} className="text-purple-400" />
                        <h3 className="text-lg font-bold text-white">Limites por Perfil</h3>
                    </div>

                    {profiles.map(profile => (
                        <div key={profile.id} className="bg-surface border border-card-border rounded-xl p-5 transition-all hover:border-purple-500/30">
                            <div className="flex items-center gap-3 mb-4">
                                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colorMap[profile.color] || 'from-gray-500 to-gray-700'} flex items-center justify-center text-white text-xs font-bold`}>
                                    {profile.name[0]}
                                </div>
                                <div className="flex-1">
                                    <div className="font-bold text-white text-sm">{profile.name}</div>
                                    <div className="text-xs text-gray-500">Capital: ${(profile.currentCapital || profile.capital).toFixed(2)}</div>
                                </div>
                                <div className={`px-2 py-1 rounded text-[9px] font-bold uppercase ${profile.active ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-500'}`}>
                                    {profile.active ? 'Ativo' : 'Inativo'}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Profile Target */}
                                <div className="flex items-center gap-3 bg-green-500/5 rounded-lg p-3 border border-green-500/10">
                                    <Target size={14} className="text-green-400 shrink-0" />
                                    <span className="text-xs text-gray-400 whitespace-nowrap">Meta:</span>
                                    <input
                                        type="number"
                                        min="1"
                                        max="100"
                                        value={profile.profileDailyTargetPct || 10}
                                        onChange={(e) => updateProfileRisk(profile.id, 'profileDailyTargetPct', Number(e.target.value))}
                                        className="w-16 bg-black/40 border border-card-border rounded px-2 py-1 text-green-400 text-xs text-center font-mono outline-none focus:border-green-500"
                                        aria-label={`Meta diária ${profile.name}`}
                                    />
                                    <span className="text-xs text-gray-500">%</span>
                                </div>

                                {/* Profile Stop Loss */}
                                <div className="flex items-center gap-3 bg-red-500/5 rounded-lg p-3 border border-red-500/10">
                                    <AlertTriangle size={14} className="text-red-400 shrink-0" />
                                    <span className="text-xs text-gray-400 whitespace-nowrap">Stop:</span>
                                    <input
                                        type="number"
                                        min="1"
                                        max="50"
                                        value={profile.profileDailyStopLossPct || 5}
                                        onChange={(e) => updateProfileRisk(profile.id, 'profileDailyStopLossPct', Number(e.target.value))}
                                        className="w-16 bg-black/40 border border-card-border rounded px-2 py-1 text-red-400 text-xs text-center font-mono outline-none focus:border-red-500"
                                        aria-label={`Stop loss ${profile.name}`}
                                    />
                                    <span className="text-xs text-gray-500">%</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Free Mode */}
            {selectedMode === 'free' && (
                <div className="bg-surface border border-red-500/20 rounded-xl p-8 text-center animate-fade-in">
                    <div className="flex justify-center mb-4">
                        <div className="p-4 bg-red-500/10 rounded-full">
                            <Unlock size={40} className="text-red-400" />
                        </div>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Modo Livre Ativado</h3>
                    <p className="text-gray-400 text-sm max-w-md mx-auto mb-6">
                        Sem limites de ganho ou perda. O motor vai operar continuamente sem pausas automáticas.
                    </p>
                    <div className="flex items-center justify-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg p-3 max-w-sm mx-auto">
                        <AlertTriangle size={14} className="text-red-400" />
                        <span className="text-xs text-red-400 font-bold uppercase">⚠️ Risco elevado — Use com cautela</span>
                    </div>
                </div>
            )}
        </div>
    );
}
