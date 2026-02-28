
import React from 'react';
import { BookOpen, Shield, TrendingUp, Zap, Target, AlertTriangle, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Language } from '../types';

interface InformationTabProps {
    lang: Language;
}

const InformationTab: React.FC<InformationTabProps> = ({ lang }) => {
    const [openSection, setOpenSection] = React.useState<string | null>('strategies');

    const toggleSection = (id: string) => {
        setOpenSection(openSection === id ? null : id);
    };

    const Section = ({ id, title, icon: Icon, children }: { id: string; title: string; icon: any; children: React.ReactNode }) => (
        <div className="bg-surface rounded-2xl border border-card-border overflow-hidden transition-all duration-300">
            <button
                onClick={() => toggleSection(id)}
                className={`w-full flex items-center justify-between p-6 ${openSection === id ? 'bg-primary/5' : 'hover:bg-white/5'}`}
            >
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${openSection === id ? 'bg-primary/20 text-primary' : 'bg-black/30 text-gray-400'}`}>
                        <Icon size={24} />
                    </div>
                    <h3 className={`text-lg font-bold ${openSection === id ? 'text-white' : 'text-gray-300'}`}>{title}</h3>
                </div>
                {openSection === id ? <ChevronUp className="text-primary" /> : <ChevronDown className="text-gray-500" />}
            </button>

            {openSection === id && (
                <div className="p-6 border-t border-card-border bg-black/10 animate-in slide-in-from-top-2 duration-200">
                    {children}
                </div>
            )}
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            <div className="text-center mb-10">
                <h1 className="text-3xl font-black text-white mb-3 bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-500">
                    Central de Conhecimento
                </h1>
                <p className="text-gray-400">Entenda como nossa IA opera e maximize seus resultados.</p>
            </div>

            <Section id="how-it-works" title="Como Funciona o CAP.PRO" icon={BookOpen}>
                <div className="space-y-4 text-gray-300 leading-relaxed">
                    <p>
                        O <strong>CAP.PRO (Quantum HFT Terminal)</strong> utiliza um motor algorítmico avançado gerido via browser.
                        Ele recebe sinais de uma API segura, analisa sua conta e executa ordens na Binance Futures
                        de forma automática e em milissegundos.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                        <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                            <div className="text-primary font-bold mb-2">1. Conexão Segura</div>
                            <p className="text-xs text-gray-500">A chave API não tem permissão de saque. Usamos um proxy (Shadow Profile) para proteger suas chaves.</p>
                        </div>
                        <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                            <div className="text-primary font-bold mb-2">2. Perfis de Margem</div>
                            <p className="text-xs text-gray-500">Você escolhe o capital inicial, alavancagem máxima (ex: 20x) e Stop Loss global.</p>
                        </div>
                        <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                            <div className="text-primary font-bold mb-2">3. Execução Automatizada</div>
                            <p className="text-xs text-gray-500">Ao receber um sinal do backend, o motor calcula o rateio, valida e executa na Exchange.</p>
                        </div>
                    </div>
                </div>
            </Section>

            <Section id="strategies" title="Perfis de Estratégia" icon={Target}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex gap-4">
                        <Shield className="text-blue-400 shrink-0" size={32} />
                        <div>
                            <h4 className="text-blue-400 font-bold mb-1">Conservador (Safe)</h4>
                            <p className="text-sm text-gray-400">
                                Foca na preservação de capital. Entra apenas em tendências muito confirmadas.
                                Ideal para iniciantes ou mercados voláteis demais.
                            </p>
                            <div className="flex gap-2 mt-2">
                                <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-1 rounded">Risco Baixo</span>
                                <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-1 rounded">Alta Assertividade</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <TrendingUp className="text-yellow-400 shrink-0" size={32} />
                        <div>
                            <h4 className="text-yellow-400 font-bold mb-1">Moderado (Moderate)</h4>
                            <p className="text-sm text-gray-400">
                                O equilíbrio perfeito. Busca lucros consistentes com risco controlado.
                                A estratégia padrão recomendada para a maioria das condições de mercado.
                            </p>
                            <div className="flex gap-2 mt-2">
                                <span className="text-[10px] bg-yellow-500/10 text-yellow-400 px-2 py-1 rounded">Risco Médio</span>
                                <span className="text-[10px] bg-yellow-500/10 text-yellow-400 px-2 py-1 rounded">Equilibrado</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <Zap className="text-orange-400 shrink-0" size={32} />
                        <div>
                            <h4 className="text-orange-400 font-bold mb-1">Agressivo (Bold)</h4>
                            <p className="text-sm text-gray-400">
                                Busca capturar movimentos rápidos e correções. Aceita maior volatilidade
                                em troca de potenciais lucros maiores. Requer stop loss rigoroso.
                            </p>
                            <div className="flex gap-2 mt-2">
                                <span className="text-[10px] bg-orange-500/10 text-orange-400 px-2 py-1 rounded">Risco Alto</span>
                                <span className="text-[10px] bg-orange-500/10 text-orange-400 px-2 py-1 rounded">Escalabilidade</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <Target className="text-purple-400 shrink-0" size={32} />
                        <div>
                            <h4 className="text-purple-400 font-bold mb-1">Especialista (Sniper)</h4>
                            <p className="text-sm text-gray-400">
                                Estratégia focada em reversões de tendência e padrões harmônicos.
                                Opera menos vezes, mas com altíssima precisão.
                            </p>
                            <div className="flex gap-2 mt-2">
                                <span className="text-[10px] bg-purple-500/10 text-purple-400 px-2 py-1 rounded">Risco Variável</span>
                                <span className="text-[10px] bg-purple-500/10 text-purple-400 px-2 py-1 rounded">Alta Precisão</span>
                            </div>
                        </div>
                    </div>
                </div>
            </Section>

            <Section id="risk-management" title="Gestão de Risco" icon={AlertTriangle}>
                <div className="space-y-6">
                    <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-start gap-4">
                        <AlertTriangle className="text-red-400 shrink-0 mt-1" />
                        <div>
                            <h4 className="text-red-400 font-bold mb-1">Margem Insuficiente (-2019)</h4>
                            <p className="text-sm text-gray-300">
                                O erro <strong>-2019</strong> ocorre se você abrir muitas ordens e sua margem ficar muito baixa.
                                Mantenha sempre um saldo de segurança na Binance e use a aba "Visão Geral" para monitorar sua margem.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <h4 className="text-white font-bold mb-2">Stop Loss (SL)</h4>
                            <p className="text-sm text-gray-400">
                                É sua rede de segurança. O bot sempre define um SL automático, mas você pode ajustá-lo nos perfis.
                                Um SL de 2% significa que se o preço cair 2%, a operação é encerrada para prevenir perdas maiores.
                            </p>
                        </div>
                        <div>
                            <h4 className="text-white font-bold mb-2">Drawdown e Capital</h4>
                            <p className="text-sm text-gray-400">
                                O capital da estratégia é consumido à medida que ordens são abertas.
                                Se seu perfil tem $100 e abre uma posição de $10, restam $90. Se falhar por falta de margem, diminua o tamanho/qtd de posições.
                            </p>
                        </div>
                    </div>
                </div>
            </Section>

            <Section id="faq" title="Perguntas Frequentes" icon={HelpCircle}>
                <div className="space-y-4">
                    <details className="group">
                        <summary className="flex items-center justify-between cursor-pointer p-4 bg-black/30 rounded-lg hover:bg-black/50 transition-colors">
                            <span className="font-medium text-white">Preciso deixar a aba aberta?</span>
                            <ChevronDown className="text-gray-500 group-open:rotate-180 transition-transform" />
                        </summary>
                        <div className="p-4 text-sm text-gray-400">
                            Sim, neste momento o bot roda no seu navegador. É necessário manter a aba ativa para que ele monitore o mercado e execute ordens.
                            Recomendamos usar uma janela dedicada ou um servidor VPS se desejar operação contínua 24/7.
                        </div>
                    </details>

                    <details className="group">
                        <summary className="flex items-center justify-between cursor-pointer p-4 bg-black/30 rounded-lg hover:bg-black/50 transition-colors">
                            <span className="font-medium text-white">Minhas API Keys estão seguras?</span>
                            <ChevronDown className="text-gray-500 group-open:rotate-180 transition-transform" />
                        </summary>
                        <div className="p-4 text-sm text-gray-400">
                            Absolutamente. Suas chaves são salvas criptografadas no banco de dados com RLS (Row Level Security).
                            Além disso, elas são usadas apenas através do nosso proxy seguro, nunca expostas diretamente no frontend.
                        </div>
                    </details>

                    <details className="group">
                        <summary className="flex items-center justify-between cursor-pointer p-4 bg-black/30 rounded-lg hover:bg-black/50 transition-colors">
                            <span className="font-medium text-white">Posso usar múltiplas estratégias ao mesmo tempo?</span>
                            <ChevronDown className="text-gray-500 group-open:rotate-180 transition-transform" />
                        </summary>
                        <div className="p-4 text-sm text-gray-400">
                            Sim! O sistema foi desenhado para rodar múltiplos perfis simultaneamente.
                            Cada perfil opera de forma independente com seu próprio capital alocado.
                        </div>
                    </details>
                </div>
            </Section>
        </div>
    );
};

export default InformationTab;
