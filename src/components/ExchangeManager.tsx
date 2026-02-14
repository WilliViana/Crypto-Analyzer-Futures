
import React, { useState, useEffect } from 'react';
import { Exchange, Language, LogEntry } from '../types';
import { translations } from '../utils/translations';
import { Server, ShieldCheck, Zap, Key, Lock, Save, X, Database, Globe, Copy, Check, ToggleLeft as Toggle, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { saveExchange, deleteExchange } from '../services/syncService';
import { validateApiCredentials } from '../services/exchangeService';

interface ExchangeManagerProps {
    exchanges: Exchange[];
    setExchanges: React.Dispatch<React.SetStateAction<Exchange[]>>;
    lang: Language;
    addLog: (message: string, level: LogEntry['level']) => void;
}

const ExchangeManager: React.FC<ExchangeManagerProps> = ({ exchanges, setExchanges, lang, addLog }) => {
    const t = translations[lang].exchange_manager;
    const [activeTab, setActiveTab] = useState<'CEX' | 'DEX'>('DEX');
    const [selectedExchange, setSelectedExchange] = useState<{ id: string, name: string } | null>(null);

    const [apiKey, setApiKey] = useState('');
    const [apiSecret, setApiSecret] = useState('');
    const [isTestnet, setIsTestnet] = useState(false);
    const [userIp, setUserIp] = useState<string>('Detectando...');
    const [copied, setCopied] = useState(false);
    const [validating, setValidating] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);

    useEffect(() => {
        fetch('https://api.ipify.org?format=json')
            .then(res => res.json())
            .then(data => setUserIp(data.ip))
            .catch(() => setUserIp('Erro ao detectar IP'));
    }, []);

    const copyIp = () => {
        navigator.clipboard.writeText(userIp);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const displayCex = [
        { id: 'binance', name: 'Binance', type: 'CEX', color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
        { id: 'okx', name: 'OKX', type: 'CEX', color: 'text-white', bg: 'bg-black/40' },
    ];

    const displayDex = [
        { id: 'hyperliquid', name: 'Hyperliquid', type: 'DEX', color: 'text-green-400', bg: 'bg-green-500/10' },
        { id: 'dydx', name: 'dYdX', type: 'DEX', color: 'text-purple-400', bg: 'bg-purple-500/10' },
    ];

    const handleConnect = async () => {
        if (!selectedExchange) return;
        if (!apiKey || (selectedExchange.id !== 'hyperliquid' && !apiSecret)) {
            addLog("Chave de API ou Chave Privada necessária.", "WARN");
            return;
        }

        setValidating(true);
        setValidationError(null);

        try {
            const tempExchange: Exchange = {
                id: selectedExchange.id,
                name: selectedExchange.name,
                type: activeTab,
                status: 'DISCONNECTED',
                apiKey,
                apiSecret,
                isTestnet,
            };

            // Step 1: Validate API credentials with Binance
            addLog(`🔍 Validando credenciais da API ${selectedExchange.name}...`, 'INFO');
            const validation = await validateApiCredentials(tempExchange);

            if (!validation.valid) {
                setValidationError(validation.error || 'Credenciais inválidas');
                addLog(`❌ Validação falhou: ${validation.error}`, 'ERROR');
                setValidating(false);
                return;
            }

            // Step 2: Credentials are valid — save
            const balanceStr = validation.balance !== undefined
                ? `$${validation.balance.toFixed(2)}`
                : 'Conectado';
            addLog(`✅ API válida! Saldo: ${balanceStr}`, 'SUCCESS');

            const newEx: Exchange = {
                ...tempExchange,
                status: 'CONNECTED',
                balance: balanceStr,
            };

            setExchanges(prev => [...prev.filter(e => e.id !== selectedExchange.id), newEx]);

            // Step 3: Save to Supabase
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.id) {
                await saveExchange(session.user.id, newEx);
                addLog(`[SYNC] Exchange salva no servidor.`, 'INFO');
            }

            addLog(`${selectedExchange.name} (${isTestnet ? 'DEMO' : 'REAL'}) conectado.`, 'SUCCESS');
        } catch (error) {
            console.error(error);
            addLog(`Erro ao conectar: ${error}`, 'ERROR');
            setValidationError(`Erro: ${error}`);
        } finally {
            setValidating(false);
            setSelectedExchange(null);
            setApiKey('');
            setApiSecret('');
            setIsTestnet(false);
        }
    };

    const isConnected = (id: string) => exchanges.find(e => e.id === id);
    const currentList = activeTab === 'CEX' ? displayCex : displayDex;

    return (
        <div className="max-w-5xl mx-auto w-full animate-fade-in pb-20">
            <div className="mb-6 bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                        <Globe size={20} />
                    </div>
                    <div>
                        <span className="text-[10px] font-bold text-indigo-400 uppercase block">Whitelist Helper</span>
                        <span className="text-sm text-gray-300">Seu IP para Whitelist: <span className="font-mono font-bold text-white ml-1">{userIp}</span></span>
                    </div>
                </div>
                <button
                    onClick={copyIp}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow-lg"
                >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? 'COPIADO' : 'COPIAR IP'}
                </button>
            </div>

            <div className="bg-surface border border-card-border rounded-xl overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-card-border bg-black/30">
                    <div className="flex items-center gap-2 mb-2">
                        <Database className="text-primary" size={24} />
                        <h2 className="text-xl font-bold text-white uppercase tracking-tighter">Conectores de API</h2>
                    </div>
                    <p className="text-sm text-gray-500">Vincule suas chaves de API para execução algorítmica.</p>
                </div>

                <div className="flex border-b border-card-border">
                    <button onClick={() => setActiveTab('DEX')} className={`flex-1 py-4 text-xs font-bold transition-all ${activeTab === 'DEX' ? 'bg-primary/10 text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-white'}`}>DEX (EVM/Perps)</button>
                    <button onClick={() => setActiveTab('CEX')} className={`flex-1 py-4 text-xs font-bold transition-all ${activeTab === 'CEX' ? 'bg-primary/10 text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-white'}`}>CEX (Corretoras)</button>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentList.map(item => (
                        <div key={item.id} className={`bg-black/20 border rounded-xl p-4 transition-all group ${isConnected(item.id) ? 'border-green-500/50' : 'border-card-border hover:border-primary/40'}`}>
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${item.bg} ${item.color}`}>{item.name[0]}</div>
                                    <div>
                                        <div className="font-bold text-white text-sm">{item.name}</div>
                                        {exchanges.find(e => e.id === item.id)?.isTestnet && <span className="text-[8px] font-black text-yellow-500 uppercase tracking-widest">Modo Demo</span>}
                                    </div>
                                </div>
                                <div className={`w-2 h-2 rounded-full ${isConnected(item.id) ? 'bg-green-500 animate-pulse' : 'bg-gray-700'}`}></div>
                            </div>

                            {isConnected(item.id) ? (
                                <button onClick={async () => {
                                    setExchanges(exchanges.filter(e => e.id !== item.id));
                                    // SYNC: Remove from Supabase
                                    await deleteExchange(item.id);
                                }} className="w-full py-2.5 rounded-lg text-xs font-bold bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500 hover:text-white transition-all">Desvincular</button>
                            ) : (
                                <button onClick={() => { setSelectedExchange({ id: item.id, name: item.name }); setIsTestnet(false); }} className="w-full py-2.5 rounded-lg text-xs font-bold bg-white/5 text-gray-300 border border-white/10 hover:bg-primary hover:text-white transition-all">Configurar</button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {selectedExchange && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
                    <div className="bg-surface border border-card-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-slide-in">
                        <div className="p-6 border-b border-card-border flex justify-between items-center bg-black/20">
                            <div className="flex items-center gap-2 text-white font-bold uppercase tracking-wider">
                                <ShieldCheck className="text-primary" /> Conectar {selectedExchange.name}
                            </div>
                            <button onClick={() => setSelectedExchange(null)} aria-label="Close"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex items-center justify-between p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl mb-2">
                                <div className="flex items-center gap-2">
                                    <Zap size={16} className="text-yellow-500" />
                                    <span className="text-xs font-bold text-yellow-500 uppercase">Modo Demo Trading (Testnet)</span>
                                </div>
                                <button
                                    onClick={() => setIsTestnet(!isTestnet)}
                                    aria-label="Toggle Testnet"
                                    className={`w-10 h-5 rounded-full relative transition-colors ${isTestnet ? 'bg-yellow-500' : 'bg-gray-700'}`}
                                >
                                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isTestnet ? 'right-1' : 'left-1'}`}></div>
                                </button>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-bold text-gray-500">API Key</label>
                                <div className="relative">
                                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={14} />
                                    <input type="text" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="w-full bg-black/40 border border-card-border rounded-xl py-3 pl-10 pr-4 text-white font-mono text-xs focus:border-primary outline-none" placeholder="Binance API Key" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-bold text-gray-500">API Secret</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={14} />
                                    <input type="password" value={apiSecret} onChange={(e) => setApiSecret(e.target.value)} className="w-full bg-black/40 border border-card-border rounded-xl py-3 pl-10 pr-4 text-white font-mono text-xs focus:border-primary outline-none" placeholder="Binance API Secret" />
                                </div>
                            </div>
                            <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                                <p className="text-[9px] text-blue-400 leading-tight uppercase font-bold">DICA: Para chaves de "Demo Trading", ative o modo Testnet acima para evitar o erro -2015.</p>
                            </div>
                            {validationError && (
                                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                                    <AlertCircle size={14} className="text-red-500 shrink-0" />
                                    <span className="text-xs text-red-400">{validationError}</span>
                                </div>
                            )}
                            <button
                                onClick={handleConnect}
                                disabled={validating}
                                className={`w-full py-3 rounded-xl font-bold uppercase text-xs shadow-lg transition-all flex items-center justify-center gap-2 ${validating ? 'bg-gray-700 text-gray-400 cursor-wait' : 'bg-primary text-white hover:bg-primary/90 shadow-primary/20'}`}
                            >
                                {validating ? (
                                    <><Loader2 size={14} className="animate-spin" /> Validando API...</>
                                ) : (
                                    'Vincular Conta'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExchangeManager;
