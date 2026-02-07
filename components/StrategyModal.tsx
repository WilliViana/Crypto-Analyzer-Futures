
import React, { useState, useEffect } from 'react';
import { StrategyProfile, AdvancedIndicators, IndicatorConfig } from '../types';
import { X, Save, Sliders, Info, BookOpen, ToggleLeft, ToggleRight, CheckSquare, Square, Brain } from 'lucide-react';

interface StrategyModalProps {
    profile: StrategyProfile;
    onClose: () => void;
    onSave: (profile: StrategyProfile) => void;
}

const DEFAULT_ADVANCED_INDICATORS: AdvancedIndicators = {
    rsi: { enabled: true, period: 14, thresholdLow: 30, thresholdHigh: 70, weight: 20 },
    macd: { enabled: true, weight: 15 },
    stochastic: { enabled: false, weight: 10 },
    bollinger: { enabled: true, weight: 15 },
    ichimoku: { enabled: false, weight: 20 },
    sar: { enabled: false, weight: 10 },
    cci: { enabled: false, weight: 10 },
    volume: { enabled: true, weight: 10 }
};

const StrategyModal: React.FC<StrategyModalProps> = ({ profile, onClose, onSave }) => {
    const [formData, setFormData] = useState<StrategyProfile>(profile);
    const [activeTab, setActiveTab] = useState<'risk' | 'indicators' | 'advanced'>('risk');

    useEffect(() => {
        if (!formData.indicators) {
            setFormData(prev => ({
                ...prev,
                indicators: DEFAULT_ADVANCED_INDICATORS,
                useDivergences: true,
                useCandlePatterns: false
            }));
        }
    }, []);

    const toggleIndicator = (key: keyof AdvancedIndicators) => {
        setFormData(prev => ({
            ...prev,
            indicators: {
                ...prev.indicators,
                [key]: {
                    ...prev.indicators[key],
                    enabled: !prev.indicators[key].enabled
                }
            }
        }));
    };

    const updateIndicatorWeight = (key: keyof AdvancedIndicators, val: number) => {
        setFormData(prev => ({
            ...prev,
            indicators: {
                ...prev.indicators,
                [key]: {
                    ...prev.indicators[key],
                    weight: val
                }
            }
        }));
    };

    // Fix: Cast Object.values to IndicatorConfig[] to resolve unknown property access in reduce and comparison errors
    const totalWeight = (Object.values(formData.indicators || {}) as IndicatorConfig[]).reduce((acc, curr) => acc + (curr.enabled ? curr.weight : 0), 0);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
            <div className="bg-[#151A25] border border-[#2A303C] rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="px-6 py-4 border-b border-[#2A303C] bg-gradient-to-r from-[#151A25] to-[#1E232F] flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary border border-primary/20">
                            <Brain size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white uppercase tracking-wide leading-none">Ajuste de Estratégia</h3>
                            <span className="text-[10px] text-gray-500 font-mono">NEURAL CONFIGURATION PANEL</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-full"><X size={20} /></button>
                </div>

                {/* Info Grid */}
                <div className="p-6 bg-[#0B0E14]/50 border-b border-[#2A303C] grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1.5 tracking-wider">Nome do Perfil</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full bg-[#151A25] border border-[#2A303C] rounded-lg py-2 px-4 text-white text-sm focus:border-primary focus:outline-none transition-colors"
                        />
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1.5 tracking-wider">Risco</label>
                            <select
                                value={formData.riskLevel}
                                onChange={(e) => setFormData({ ...formData, riskLevel: e.target.value })}
                                className="w-full bg-[#151A25] border border-[#2A303C] rounded-lg py-2 px-4 text-white text-sm focus:border-primary focus:outline-none appearance-none"
                            >
                                <option value="Low">Low</option>
                                <option value="Med">Moderate</option>
                                <option value="High">High</option>
                                <option value="Extreme">Extreme</option>
                            </select>
                        </div>
                        <div className="flex-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1.5 tracking-wider">Leverage</label>
                            <div className="flex items-center bg-[#151A25] border border-[#2A303C] rounded-lg px-3 py-2 text-white text-sm font-mono font-bold">
                                {formData.leverage}x
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-[#2A303C] bg-[#151A25]">
                    <button onClick={() => setActiveTab('risk')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${activeTab === 'risk' ? 'text-primary border-primary bg-primary/5' : 'text-gray-500 border-transparent hover:text-gray-300'}`}>Gestão Financeira</button>
                    <button onClick={() => setActiveTab('indicators')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${activeTab === 'indicators' ? 'text-primary border-primary bg-primary/5' : 'text-gray-500 border-transparent hover:text-gray-300'}`}>Gatilhos Técnicos</button>
                    <button onClick={() => setActiveTab('advanced')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${activeTab === 'advanced' ? 'text-primary border-primary bg-primary/5' : 'text-gray-500 border-transparent hover:text-gray-300'}`}>IA & Filtros</button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-[#0B0E14]/30">
                    {activeTab === 'risk' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-white uppercase tracking-wider">Leverage (Max 125x)</label>
                                    <input type="range" aria-label="Nível de alavancagem" min="1" max="100" value={formData.leverage} onChange={(e) => setFormData({ ...formData, leverage: parseInt(e.target.value) })} className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary" />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-white uppercase tracking-wider">Confiança Mínima ({formData.confidenceThreshold}%)</label>
                                    <input type="range" aria-label="Limiar de confiança mínima" min="1" max="95" value={formData.confidenceThreshold} onChange={(e) => setFormData({ ...formData, confidenceThreshold: parseInt(e.target.value) })} className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500" />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="p-4 bg-black/20 border border-white/5 rounded-xl">
                                    <label className="text-[10px] font-bold text-yellow-500 uppercase block mb-1">Capital Alocado ($)</label>
                                    <input type="number" aria-label="Capital alocado em dólares" step="10" min="10" value={formData.capital} onChange={(e) => setFormData({ ...formData, capital: parseFloat(e.target.value) || 100 })} className="w-full bg-surface border border-card-border rounded-lg py-2 px-3 text-white text-sm font-mono" placeholder="100" />
                                </div>
                                <div className="p-4 bg-black/20 border border-white/5 rounded-xl">
                                    <label className="text-[10px] font-bold text-green-500 uppercase block mb-1">Take Profit %</label>
                                    <input type="number" aria-label="Porcentagem de Take Profit" step="0.1" value={formData.takeProfit} onChange={(e) => setFormData({ ...formData, takeProfit: parseFloat(e.target.value) })} className="w-full bg-surface border border-card-border rounded-lg py-2 px-3 text-white text-sm font-mono" />
                                </div>
                                <div className="p-4 bg-black/20 border border-white/5 rounded-xl">
                                    <label className="text-[10px] font-bold text-red-500 uppercase block mb-1">Stop Loss %</label>
                                    <input type="number" aria-label="Porcentagem de Stop Loss" step="0.1" value={formData.stopLoss} onChange={(e) => setFormData({ ...formData, stopLoss: parseFloat(e.target.value) })} className="w-full bg-surface border border-card-border rounded-lg py-2 px-3 text-white text-sm font-mono" />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'indicators' && formData.indicators && (
                        <div className="flex flex-col gap-4 animate-fade-in">
                            <div className="flex items-center justify-between p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg mb-2">
                                <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Peso Total de Confluência</span>
                                <span className={`text-lg font-mono font-black ${totalWeight >= 100 ? 'text-green-400' : 'text-yellow-400'}`}>{totalWeight}/100</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Fix: Explicitly cast Object.entries to IndicatorConfig mapping to resolve unknown property access errors */}
                                {(Object.entries(formData.indicators) as [keyof AdvancedIndicators, IndicatorConfig][]).map(([key, config]) => (
                                    <div key={key} className={`p-4 rounded-xl border transition-all ${config.enabled ? 'bg-surface border-primary/30' : 'bg-black/20 border-card-border opacity-50'}`}>
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <button onClick={() => toggleIndicator(key)}>
                                                    {config.enabled ? <CheckSquare size={18} className="text-primary" /> : <Square size={18} className="text-gray-600" />}
                                                </button>
                                                <div>
                                                    <span className="font-bold text-white uppercase text-xs block">{key}</span>
                                                    {config.enabled && <span className="text-[9px] text-gray-500">Peso: {config.weight}pts</span>}
                                                </div>
                                            </div>
                                            {config.enabled && (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="range"
                                                        min="0" max="40"
                                                        value={config.weight}
                                                        onChange={(e) => updateIndicatorWeight(key, parseInt(e.target.value))}
                                                        className="w-20 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        {/* Advanced Params */}
                                        {config.enabled && (
                                            <div className="grid grid-cols-3 gap-2 mt-4 border-t border-white/5 pt-3 animate-fade-in">
                                                {config.period !== undefined && (
                                                    <div>
                                                        <label className="text-[9px] text-gray-500 uppercase block mb-1">Período</label>
                                                        <input
                                                            type="number"
                                                            aria-label={`Período para ${key}`}
                                                            value={config.period}
                                                            onChange={(e) => setFormData(prev => ({
                                                                ...prev,
                                                                indicators: {
                                                                    ...prev.indicators,
                                                                    [key]: { ...prev.indicators[key], period: parseInt(e.target.value) }
                                                                }
                                                            }))}
                                                            className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 text-xs text-white"
                                                        />
                                                    </div>
                                                )}
                                                {config.thresholdLow !== undefined && (
                                                    <div>
                                                        <label className="text-[9px] text-gray-500 uppercase block mb-1">Min (Oversold)</label>
                                                        <input
                                                            type="number"
                                                            aria-label={`Limiar inferior para ${key}`}
                                                            value={config.thresholdLow}
                                                            onChange={(e) => setFormData(prev => ({
                                                                ...prev,
                                                                indicators: {
                                                                    ...prev.indicators,
                                                                    [key]: { ...prev.indicators[key], thresholdLow: parseInt(e.target.value) }
                                                                }
                                                            }))}
                                                            className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 text-xs text-white"
                                                        />
                                                    </div>
                                                )}
                                                {config.thresholdHigh !== undefined && (
                                                    <div>
                                                        <label className="text-[9px] text-gray-500 uppercase block mb-1">Max (Overbought)</label>
                                                        <input
                                                            type="number"
                                                            aria-label={`Limiar superior para ${key}`}
                                                            value={config.thresholdHigh}
                                                            onChange={(e) => setFormData(prev => ({
                                                                ...prev,
                                                                indicators: {
                                                                    ...prev.indicators,
                                                                    [key]: { ...prev.indicators[key], thresholdHigh: parseInt(e.target.value) }
                                                                }
                                                            }))}
                                                            className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 text-xs text-white"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'advanced' && (
                        <div className="space-y-4 animate-fade-in">
                            <div className="flex items-center justify-between p-4 bg-surface border border-card-border rounded-xl group hover:border-primary/50 transition-all">
                                <div>
                                    <h4 className="font-bold text-white text-sm">Divergências Estendidas</h4>
                                    <p className="text-[10px] text-gray-500">Detecta divergências entre preço e indicadores em 3 timeframes.</p>
                                </div>
                                <button onClick={() => setFormData(p => ({ ...p, useDivergences: !p.useDivergences }))}>
                                    {formData.useDivergences ? <ToggleRight size={32} className="text-green-500" /> : <ToggleLeft size={32} className="text-gray-600" />}
                                </button>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-surface border border-card-border rounded-xl group hover:border-primary/50 transition-all">
                                <div>
                                    <h4 className="font-bold text-white text-sm">IA Pattern Recognition</h4>
                                    <p className="text-[10px] text-gray-500">Reconhecimento de velas complexas (Engolfos, Martelos, Estrelas).</p>
                                </div>
                                <button onClick={() => setFormData(p => ({ ...p, useCandlePatterns: !p.useCandlePatterns }))}>
                                    {formData.useCandlePatterns ? <ToggleRight size={32} className="text-green-500" /> : <ToggleLeft size={32} className="text-gray-600" />}
                                </button>
                            </div>
                            <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
                                <div className="flex items-center gap-2 mb-2 text-primary">
                                    <BookOpen size={16} />
                                    <h4 className="font-bold text-[10px] uppercase">Lógica Neural</h4>
                                </div>
                                <p className="text-[10px] text-gray-500 leading-relaxed italic">
                                    O motor soma os pesos de cada indicador habilitado. Se o total atingir o limiar de confiança, o sinal é validado. Divergências e padrões de vela atuam como multiplicadores de bônus no score final.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-[#2A303C] bg-[#151A25] flex gap-4">
                    <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-transparent border border-[#2A303C] text-gray-400 font-bold hover:text-white transition-all uppercase text-xs">
                        Descartar
                    </button>
                    <button onClick={() => onSave(formData)} className="flex-1 py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-all uppercase flex items-center justify-center gap-2 shadow-lg shadow-primary/20 text-xs">
                        <Save size={16} /> Aplicar Perfil
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StrategyModal;
