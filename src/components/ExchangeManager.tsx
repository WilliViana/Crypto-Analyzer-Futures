
import React, { useState, useEffect } from 'react';
import { Exchange, Language, LogEntry } from '../types';
import { translations } from '../utils/translations';
import { Server, ShieldCheck, Zap, Key, Lock, Save, X, Database, Globe, Copy, Check, ToggleLeft as Toggle, Loader2, AlertCircle, Info } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { saveExchange, deleteExchange } from '../services/syncService';
import { validateApiCredentials } from '../services/exchangeService';

interface ExchangeManagerProps {
    exchanges: Exchange[];
    setExchanges: React.Dispatch<React.SetStateAction<Exchange[]>>;
    lang: Language;
    addLog: (message: string, level: LogEntry['level']) => void;
}

interface ExchangeOption {
    id: string;
    name: string;
    type: 'CEX' | 'DEX';
    color: string;
    bg: string;
    icon: string;
    hasSecret: boolean;      // Some DEXes only need wallet/key
    testnetAvailable: boolean;
    placeholder: { key: string; secret: string };
}

const CEX_LIST: ExchangeOption[] = [
    { id: 'binance', name: 'Binance', type: 'CEX', color: 'text-yellow-500', bg: 'bg-yellow-500/10', icon: 'B', hasSecret: true, testnetAvailable: true, placeholder: { key: 'Binance API Key', secret: 'Binance API Secret' } },
    { id: 'bybit', name: 'Bybit', type: 'CEX', color: 'text-orange-400', bg: 'bg-orange-500/10', icon: 'BY', hasSecret: true, testnetAvailable: true, placeholder: { key: 'Bybit API Key', secret: 'Bybit API Secret' } },
    { id: 'okx', name: 'OKX', type: 'CEX', color: 'text-white', bg: 'bg-black/40', icon: 'O', hasSecret: true, testnetAvailable: true, placeholder: { key: 'OKX API Key', secret: 'OKX API Secret' } },
    { id: 'mexc', name: 'MEXC', type: 'CEX', color: 'text-blue-400', bg: 'bg-blue-500/10', icon: 'MX', hasSecret: true, testnetAvailable: false, placeholder: { key: 'MEXC API Key', secret: 'MEXC API Secret' } },
    { id: 'bingx', name: 'BingX', type: 'CEX', color: 'text-cyan-400', bg: 'bg-cyan-500/10', icon: 'BX', hasSecret: true, testnetAvailable: false, placeholder: { key: 'BingX API Key', secret: 'BingX API Secret' } },
];

const DEX_LIST: ExchangeOption[] = [
    { id: 'hyperliquid', name: 'Hyperliquid', type: 'DEX', color: 'text-green-400', bg: 'bg-green-500/10', icon: 'HL', hasSecret: true, testnetAvailable: true, placeholder: { key: 'Wallet Address (0x...)', secret: 'Private Key (0x...)' } },
    { id: 'dydx', name: 'dYdX', type: 'DEX', color: 'text-purple-400', bg: 'bg-purple-500/10', icon: 'dY', hasSecret: true, testnetAvailable: true, placeholder: { key: 'dYdX API Key', secret: 'dYdX API Secret' } },
    { id: 'gmx', name: 'GMX', type: 'DEX', color: 'text-blue-300', bg: 'bg-blue-400/10', icon: 'GM', hasSecret: false, testnetAvailable: false, placeholder: { key: 'Wallet Address (0x...)', secret: '' } },
    { id: 'perpetual', name: 'Perpetual Protocol', type: 'DEX', color: 'text-teal-400', bg: 'bg-teal-500/10', icon: 'PP', hasSecret: false, testnetAvailable: false, placeholder: { key: 'Wallet Address (0x...)', secret: '' } },
    { id: 'aster', name: 'Aster', type: 'DEX', color: 'text-pink-400', bg: 'bg-pink-500/10', icon: 'AS', hasSecret: true, testnetAvailable: false, placeholder: { key: 'Aster API Key', secret: 'Aster API Secret' } },
];

const ExchangeManager: React.FC<ExchangeManagerProps> = ({ exchanges, setExchanges, lang, addLog }) => {
    const t = translations[lang].exchange_manager;
    const [activeTab, setActiveTab] = useState<'CEX' | 'DEX'>('CEX');
    const [selectedExchange, setSelectedExchange] = useState<ExchangeOption | null>(null);

    const [apiKey, setApiKey] = useState('');
    const [apiSecret, setApiSecret] = useState('');
    const [isTestnet, setIsTestnet] = useState(false);
    const [userIp, setUserIp] = useState<string>('Detectando...');
    const [copied, setCopied] = useState(false);
    const [validating, setValidating] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);

    const connectedExchange = exchanges.find(e => e.status === 'CONNECTED');

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

    const handleConnect = async () => {
        if (!selectedExchange) return;
        if (!apiKey || (selectedExchange.hasSecret && !apiSecret)) {
            addLog("Chave de API ou Chave Privada necessária.", "WARN");
            setValidationError("Preencha todos os campos obrigatórios.");
            return;
        }

        // Check if another exchange is already connected
        if (connectedExchange && connectedExchange.id !== selectedExchange.id) {
            setValidationError(`Já existe uma corretora conectada (${connectedExchange.name}). Desvincule-a antes de conectar outra.`);
            return;
        }

        setValidating(true);
        setValidationError(null);

        try {
            const tempExchange: Exchange = {
                id: selectedExchange.id,
                name: selectedExchange.name,
                type: selectedExchange.type,
                status: 'DISCONNECTED',
                apiKey,
                apiSecret: selectedExchange.hasSecret ? apiSecret : '',
                isTestnet,
            };

            addLog(`🔍 Validando credenciais da API ${selectedExchange.name}...`, 'INFO');

            // Binance and Hyperliquid have full proxy validation
            const hasValidation = selectedExchange.id === 'binance' || selectedExchange.id === 'hyperliquid';

            if (hasValidation) {
                const validation = await validateApiCredentials(tempExchange);
                if (!validation.valid) {
                    let friendlyError = validation.error || 'Credenciais inválidas';

                    if (friendlyError.includes('451') || friendlyError.includes('restricted location') || friendlyError.includes('Eligibility')) {
                        friendlyError = '🌍 Binance bloqueou por restrição geográfica.\n\nIsso ocorre quando o servidor está em região restrita pela Binance.\n\n✅ Solução 1: Ative "Modo Demo Trading (Testnet)" acima.\n✅ Solução 2: Use VPN para acessar a API.\n✅ Solução 3: Use outra corretora (Bybit, OKX, etc).';
                    } else if (friendlyError.includes('-2015') || friendlyError.includes('Invalid API-key')) {
                        friendlyError = '🔑 Chave API inválida.\n\nVerifique:\n• API Key e Secret estão corretos\n• Permissões Futures estão habilitadas\n• Para chaves Demo, ative Testnet acima';
                    } else if (friendlyError.includes('-1021') || friendlyError.includes('Timestamp')) {
                        friendlyError = '⏰ Erro de sincronização de tempo. Ajuste o relógio do seu dispositivo.';
                    } else if (friendlyError.includes('Failed to fetch') || friendlyError.includes('Load failed')) {
                        friendlyError = '📡 Erro de conexão. Verifique sua internet e tente novamente.';
                    }

                    setValidationError(friendlyError);
                    addLog(`❌ Validação falhou: ${validation.error}`, 'ERROR');
                    setValidating(false);
                    return;
                }

                const balanceStr = validation.balance !== undefined ? `$${validation.balance.toFixed(2)}` : 'Conectado';
                addLog(`✅ API válida! Saldo: ${balanceStr}`, 'SUCCESS');

                const newEx: Exchange = { ...tempExchange, status: 'CONNECTED', balance: balanceStr };
                setExchanges(prev => [...prev.filter(e => e.id !== selectedExchange.id), newEx]);

                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user?.id) {
                    await saveExchange(session.user.id, newEx);
                    addLog(`[SYNC] Exchange salva no servidor.`, 'INFO');
                }

            } else {
                // Non-Binance: save directly (proxy validation not available yet)
                addLog(`⚡ ${selectedExchange.name} conectada (validação automática indisponível - salvo localmente).`, 'SUCCESS');

                const newEx: Exchange = { ...tempExchange, status: 'CONNECTED', balance: 'Conectado' };
                setExchanges(prev => [...prev.filter(e => e.id !== selectedExchange.id), newEx]);

                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user?.id) {
                    await saveExchange(session.user.id, newEx);
                }
            }

            addLog(`✅ ${selectedExchange.name} (${isTestnet ? 'DEMO' : 'REAL'}) conectada com sucesso.`, 'SUCCESS');

            setSelectedExchange(null);
            setApiKey('');
            setApiSecret('');
            setIsTestnet(false);
        } catch (error: any) {
            console.error(error);
            const errorMsg = error?.message || String(error);
            let friendlyError = errorMsg;

            if (errorMsg.includes('451') || errorMsg.includes('restricted location') || errorMsg.includes('Eligibility')) {
                friendlyError = '🌍 Conexão bloqueada por restrição geográfica.\n\nA Binance não permite acesso da região onde o servidor está localizado.\n\n✅ Ative o modo Testnet ou use outra corretora.';
            } else if (errorMsg.includes('Failed to fetch') || errorMsg.includes('Load failed')) {
                friendlyError = '📡 Erro de conexão com o servidor. Verifique sua internet.';
            } else if (errorMsg.includes('-2015') || errorMsg.includes('Invalid API-key')) {
                friendlyError = '🔑 Chave API inválida. Verifique credenciais e permissões Futures.';
            } else if (errorMsg.includes('-1021') || errorMsg.includes('Timestamp')) {
                friendlyError = '⏰ Erro de sincronização de tempo.';
            }

            addLog(`Erro: ${friendlyError}`, 'ERROR');
            setValidationError(friendlyError);
        } finally {
            setValidating(false);
        }
    };

    const isConnected = (id: string) => exchanges.find(e => e.id === id && e.status === 'CONNECTED');
    const currentList = activeTab === 'CEX' ? CEX_LIST : DEX_LIST;

    return (
        <div className="max-w-5xl mx-auto w-full animate-fade-in pb-20">
            {/* Info: apenas 1 corretora por vez */}
            <div className="mb-4 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-center gap-3">
                <Info size={18} className="text-amber-400 shrink-0" />
                <p className="text-xs text-amber-300">
                    <strong>Atenção:</strong> Só é possível conectar e utilizar <strong>uma corretora por vez</strong>. Para trocar, desvincule a atual antes.
                </p>
            </div>

            {/* IP Helper */}
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

            {/* Connected Exchange Banner */}
            {connectedExchange && (
                <div className="mb-4 bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                        <div>
                            <span className="text-sm font-bold text-green-400">{connectedExchange.name}</span>
                            <span className="text-xs text-gray-400 ml-2">
                                {connectedExchange.isTestnet ? '(DEMO)' : '(REAL)'} — {connectedExchange.balance || 'Conectado'}
                            </span>
                        </div>
                    </div>
                    <button onClick={async () => {
                        setExchanges(exchanges.filter(e => e.id !== connectedExchange.id));
                        await deleteExchange(connectedExchange.id);
                        addLog(`${connectedExchange.name} desvinculada.`, 'INFO');
                    }} className="px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold hover:bg-red-500 hover:text-white transition-all">
                        Desvincular
                    </button>
                </div>
            )}

            <div className="bg-surface border border-card-border rounded-xl overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-card-border bg-black/30">
                    <div className="flex items-center gap-2 mb-2">
                        <Database className="text-primary" size={24} />
                        <h2 className="text-xl font-bold text-white uppercase tracking-tighter">Conectores de API</h2>
                    </div>
                    <p className="text-sm text-gray-500">Vincule suas chaves de API para execução algorítmica.</p>
                </div>

                <div className="flex border-b border-card-border">
                    <button onClick={() => setActiveTab('CEX')} className={`flex-1 py-4 text-xs font-bold transition-all ${activeTab === 'CEX' ? 'bg-primary/10 text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-white'}`}>
                        CEX (Corretoras)
                    </button>
                    <button onClick={() => setActiveTab('DEX')} className={`flex-1 py-4 text-xs font-bold transition-all ${activeTab === 'DEX' ? 'bg-primary/10 text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-white'}`}>
                        DEX (DeFi/Perps)
                    </button>
                </div>

                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {currentList.map(item => {
                        const connected = isConnected(item.id);
                        const anotherConnected = connectedExchange && connectedExchange.id !== item.id;

                        return (
                            <div key={item.id} className={`bg-black/20 border rounded-xl p-4 transition-all group ${connected ? 'border-green-500/50' : 'border-card-border hover:border-primary/40'}`}>
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs ${item.bg} ${item.color}`}>{item.icon}</div>
                                        <div>
                                            <div className="font-bold text-white text-sm">{item.name}</div>
                                            {connected && exchanges.find(e => e.id === item.id)?.isTestnet && (
                                                <span className="text-[8px] font-black text-yellow-500 uppercase tracking-widest">Modo Demo</span>
                                            )}
                                            {!item.testnetAvailable && <span className="text-[7px] text-gray-600 uppercase">Sem Testnet</span>}
                                        </div>
                                    </div>
                                    <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-gray-700'}`}></div>
                                </div>

                                {connected ? (
                                    <button onClick={async () => {
                                        setExchanges(exchanges.filter(e => e.id !== item.id));
                                        await deleteExchange(item.id);
                                        addLog(`${item.name} desvinculada.`, 'INFO');
                                    }} className="w-full py-2.5 rounded-lg text-xs font-bold bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500 hover:text-white transition-all">
                                        Desvincular
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => {
                                            if (anotherConnected) {
                                                setValidationError(`Desvincule ${connectedExchange?.name} primeiro.`);
                                                return;
                                            }
                                            setSelectedExchange(item);
                                            setIsTestnet(false);
                                            setValidationError(null);
                                        }}
                                        disabled={!!anotherConnected}
                                        className={`w-full py-2.5 rounded-lg text-xs font-bold transition-all ${anotherConnected
                                            ? 'bg-gray-800 text-gray-600 cursor-not-allowed border border-gray-700'
                                            : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-primary hover:text-white'
                                            }`}
                                    >
                                        {anotherConnected ? 'Bloqueado' : 'Configurar'}
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Connection Modal */}
            {selectedExchange && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
                    <div className="bg-surface border border-card-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-slide-in">
                        <div className="p-6 border-b border-card-border flex justify-between items-center bg-black/20">
                            <div className="flex items-center gap-2 text-white font-bold uppercase tracking-wider">
                                <ShieldCheck className="text-primary" /> Conectar {selectedExchange.name}
                            </div>
                            <button onClick={() => { setSelectedExchange(null); setValidationError(null); }} aria-label="Close"><X size={20} className="text-gray-400 hover:text-white" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            {/* Testnet Toggle */}
                            {selectedExchange.testnetAvailable && (
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
                            )}

                            {/* API Key */}
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-bold text-gray-500">API Key</label>
                                <div className="relative">
                                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={14} />
                                    <input
                                        type="text"
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        className="w-full bg-black/40 border border-card-border rounded-xl py-3 pl-10 pr-4 text-white font-mono text-xs focus:border-primary outline-none"
                                        placeholder={selectedExchange.placeholder.key}
                                    />
                                </div>
                            </div>

                            {/* API Secret (only if exchange requires it) */}
                            {selectedExchange.hasSecret && (
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-gray-500">API Secret</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={14} />
                                        <input
                                            type="password"
                                            value={apiSecret}
                                            onChange={(e) => setApiSecret(e.target.value)}
                                            className="w-full bg-black/40 border border-card-border rounded-xl py-3 pl-10 pr-4 text-white font-mono text-xs focus:border-primary outline-none"
                                            placeholder={selectedExchange.placeholder.secret}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Tips */}
                            {selectedExchange.id === 'binance' && (
                                <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                                    <p className="text-[9px] text-blue-400 leading-tight uppercase font-bold">
                                        DICA: Para chaves de "Demo Trading", ative o modo Testnet acima para evitar o erro -2015.
                                    </p>
                                </div>
                            )}

                            {selectedExchange.id !== 'binance' && (
                                <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                                    <p className="text-[9px] text-amber-400 leading-tight">
                                        ⚠️ Nota: Validação automática disponível apenas para Binance. As credenciais de {selectedExchange.name} serão salvas mas precisam ser validadas manualmente na primeira operação.
                                    </p>
                                </div>
                            )}

                            {/* Error Display */}
                            {validationError && (
                                <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                                    <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                                    <span className="text-xs text-red-400 whitespace-pre-line">{validationError}</span>
                                </div>
                            )}

                            {/* Submit */}
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
