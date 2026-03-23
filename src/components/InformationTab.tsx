
import React from 'react';
import { BookOpen, Shield, TrendingUp, Zap, Target, AlertTriangle, HelpCircle, ChevronDown, ChevronUp, Brain, Eye, LineChart, History, BarChart3, Lock, Headphones, FileText } from 'lucide-react';
import { Language } from '../types';

interface InformationTabProps {
    lang: Language;
}

const InformationTab: React.FC<InformationTabProps> = ({ lang }) => {
    const [openSection, setOpenSection] = React.useState<string | null>('how-it-works');

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
                <p className="text-gray-400">Entenda como cada parte do sistema funciona e maximize seus resultados.</p>
            </div>

            <Section id="how-it-works" title="Como Funciona o CAP.PRO" icon={BookOpen}>
                <div className="space-y-4 text-gray-300 leading-relaxed">
                    <p>
                        O <strong>CAP.PRO (Quantum HFT Terminal)</strong> é sua plataforma completa de trading automatizado.
                        Ele se conecta à sua conta na Binance Futures, analisa o mercado em tempo real e executa ordens automaticamente.
                    </p>
                    <p className="text-sm text-gray-400">
                        📌 <strong>Pense assim:</strong> O CAP.PRO é como ter um trader profissional trabalhando 24 horas por dia para você. 
                        Ele analisa gráficos, identifica oportunidades e executa operações — tudo automaticamente!
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                        <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                            <div className="text-primary font-bold mb-2">1. Conexão Segura</div>
                            <p className="text-sm text-gray-400">Suas API Keys ficam criptografadas. Sem permissão de saque — 100% seguro.</p>
                        </div>
                        <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                            <div className="text-primary font-bold mb-2">2. Perfis de Margem</div>
                            <p className="text-sm text-gray-400">Defina capital, alavancagem máxima e Stop Loss para cada estratégia.</p>
                        </div>
                        <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                            <div className="text-primary font-bold mb-2">3. Execução Automatizada</div>
                            <p className="text-sm text-gray-400">O motor calcula, valida e executa ordens na Exchange em milissegundos.</p>
                        </div>
                    </div>
                </div>
            </Section>

            <Section id="dashboard" title="Visão Geral (Dashboard)" icon={Eye}>
                <div className="space-y-4 text-gray-300 leading-relaxed">
                    <p>
                        A aba <strong>Visão Geral</strong> é o seu painel principal. Aqui você vê tudo que está acontecendo na sua conta em tempo real.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                            <div className="text-cyan-400 font-bold mb-2">💰 Saldo Total</div>
                            <p className="text-sm text-gray-400">Mostra quanto dinheiro total você tem na conta. Inclui margem disponível + margem usada nas posições.</p>
                        </div>
                        <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                            <div className="text-green-400 font-bold mb-2">📊 PnL Não Realizado</div>
                            <p className="text-sm text-gray-400">Quanto suas posições abertas estão ganhando ou perdendo agora. Esse valor muda em tempo real.</p>
                        </div>
                        <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                            <div className="text-purple-400 font-bold mb-2">🎯 Win Rate</div>
                            <p className="text-sm text-gray-400">Percentual de operações positivas. Se de 10 trades, 6 deram lucro, seu Win Rate é 60%.</p>
                        </div>
                        <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                            <div className="text-yellow-400 font-bold mb-2">📈 Melhor / Pior Trade</div>
                            <p className="text-sm text-gray-400">O maior lucro e a maior perda dentre suas operações recentes. Ajuda a entender seu risco.</p>
                        </div>
                        <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                            <div className="text-orange-400 font-bold mb-2">🎯 Meta Diária de Ganho</div>
                            <p className="text-sm text-gray-400">Defina um objetivo diário (ex: 10%). O sistema mostra o progresso e pode parar ao atingir a meta.</p>
                        </div>
                        <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                            <div className="text-red-400 font-bold mb-2">⚡ Posições Abertas</div>
                            <p className="text-sm text-gray-400">Lista todas as moedas que você está operando agora, com preço de entrada e lucro/perda atual.</p>
                        </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-3">
                        💡 <strong>Dica:</strong> Clique em "Personalizar" para escolher quais informações mostrar ou ocultar na tela.
                    </p>
                </div>
            </Section>

            <Section id="motor" title="Motor Algorítmico" icon={Zap}>
                <div className="space-y-4 text-gray-300 leading-relaxed">
                    <p>
                        O <strong>Motor Algorítmico</strong> é o cérebro do sistema. Ele recebe sinais de trading e executa ordens automaticamente.
                    </p>
                    <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl">
                        <p className="text-sm text-yellow-300">
                            🧠 <strong>Como funciona:</strong> O motor analisa centenas de indicadores técnicos por segundo (EMA, RSI, MACD, Bollinger Bands) 
                            e identifica padrões que indicam oportunidades de compra ou venda. Quando encontra um sinal forte, executa a ordem na Binance.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                            <div className="text-green-400 font-bold mb-2">▶️ Iniciar / ⏸ Pausar</div>
                            <p className="text-sm text-gray-400">O botão no topo da tela liga e desliga o motor. Quando ligado ele começa a executar trades automaticamente.</p>
                        </div>
                        <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                            <div className="text-purple-400 font-bold mb-2">📋 Perfis Ativos</div>
                            <p className="text-sm text-gray-400">Cada perfil é uma estratégia com seu próprio capital e configurações. Pode rodar vários ao mesmo tempo.</p>
                        </div>
                    </div>
                </div>
            </Section>

            <Section id="wallet" title="Carteira Real" icon={TrendingUp}>
                <div className="space-y-4 text-gray-300 leading-relaxed">
                    <p>
                        A aba <strong>Carteira Real</strong> mostra os ativos que você possui na Binance. 
                        Diferente da Visão Geral que mostra trades, aqui você vê suas moedas e seus saldos reais.
                    </p>
                    <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                        <p className="text-sm text-gray-400">
                            📌 Inclui saldo na conta <strong>Futures (USDT-M)</strong> e <strong>Spot</strong>. 
                            Mostra a alocação de cada ativo, quanto cada posição vale e o PnL de cada uma.
                        </p>
                    </div>
                </div>
            </Section>

            <Section id="history" title="Historial de Trades" icon={History}>
                <div className="space-y-4 text-gray-300 leading-relaxed">
                    <p>
                        O <strong>Historial</strong> mostra todas as suas operações realizadas nos últimos dias.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                            <div className="text-green-400 font-bold mb-2">✅ Trades Positivos</div>
                            <p className="text-sm text-gray-400">Operações que deram lucro. Mostra símbolo, lado (BUY/SELL), PnL e data/hora.</p>
                        </div>
                        <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                            <div className="text-red-400 font-bold mb-2">❌ Trades Negativos</div>
                            <p className="text-sm text-gray-400">Operações que deram perda. Use para aprender com os erros e melhorar suas estratégias.</p>
                        </div>
                    </div>
                </div>
            </Section>

            <Section id="flow" title="Análise de Fluxo" icon={BarChart3}>
                <div className="space-y-4 text-gray-300 leading-relaxed">
                    <p>
                        A <strong>Análise de Fluxo</strong> mostra dados avançados de volume, ordens grandes e movimentações significativas do mercado.
                    </p>
                    <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl">
                        <p className="text-sm text-blue-300">
                            📊 <strong>Pense assim:</strong> É como ver o que os "grandes jogadores" (baleias) estão fazendo. 
                            Se muitos estão comprando, é sinal de que o preço pode subir. Se estão vendendo, pode cair.
                        </p>
                    </div>
                </div>
            </Section>

            <Section id="agents" title="Agentes IA (PDCA)" icon={Brain}>
                <div className="space-y-4 text-gray-300 leading-relaxed">
                    <p>
                        Os <strong>Agentes IA</strong> são como consultores inteligentes que analisam seus trades e sugerem melhorias automaticamente.
                        Eles usam o ciclo <strong>PDCA</strong> (Plan, Do, Check, Act):
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                        <div className="bg-blue-500/10 p-3 rounded-xl text-center">
                            <div className="text-blue-400 font-bold">📋 Plan</div>
                            <div className="text-xs text-gray-400 mt-1">Analisa seus trades dos últimos 7 dias</div>
                        </div>
                        <div className="bg-yellow-500/10 p-3 rounded-xl text-center">
                            <div className="text-yellow-400 font-bold">⚡ Do</div>
                            <div className="text-xs text-gray-400 mt-1">Aplica os ajustes sugeridos</div>
                        </div>
                        <div className="bg-purple-500/10 p-3 rounded-xl text-center">
                            <div className="text-purple-400 font-bold">🔍 Check</div>
                            <div className="text-xs text-gray-400 mt-1">Verifica se os resultados melhoraram</div>
                        </div>
                        <div className="bg-green-500/10 p-3 rounded-xl text-center">
                            <div className="text-green-400 font-bold">✅ Act</div>
                            <div className="text-xs text-gray-400 mt-1">Mantém ou ajusta os parâmetros</div>
                        </div>
                    </div>
                    <div className="mt-4 space-y-3">
                        <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                            <div className="text-cyan-400 font-bold mb-2">🤖 Analisar Agora</div>
                            <p className="text-sm text-gray-400">Clique para o sistema buscar seus trades mais recentes e sugerir ajustes. Você pode revisar cada sugestão e escolher quais aplicar.</p>
                        </div>
                        <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                            <div className="text-green-400 font-bold mb-2">⏰ Auto 24h</div>
                            <p className="text-sm text-gray-400">Quando ativado, o sistema faz tudo sozinho a cada 24 horas: busca trades, analisa, e aplica os ajustes automaticamente. Sem precisar clicar em nada!</p>
                        </div>
                        <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                            <div className="text-purple-400 font-bold mb-2">📊 Tipos de Agentes</div>
                            <p className="text-sm text-gray-400">
                                <strong>Trend Hunter:</strong> Segue tendências usando EMA + MACD. <br />
                                <strong>Reversal Sniper:</strong> Identifica reversões com RSI + Bollinger. <br />
                                <strong>Scalp Machine:</strong> Operações rápidas em segundos. <br />
                                <strong>Sentiment Reader:</strong> Analisa sentimento do mercado.
                            </p>
                        </div>
                    </div>
                </div>
            </Section>

            <Section id="risk-management" title="Gestão de Riscos" icon={AlertTriangle}>
                <div className="space-y-6">
                    <p className="text-gray-300 leading-relaxed">
                        A <strong>Gestão de Riscos</strong> protege seu dinheiro. Configure limites de perda diária, stop loss global e circuit breaker.
                    </p>
                    <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-start gap-4">
                        <AlertTriangle className="text-red-400 shrink-0 mt-1" />
                        <div>
                            <h4 className="text-red-400 font-bold mb-1">Margem Insuficiente (-2019)</h4>
                            <p className="text-sm text-gray-300">
                                Esse erro acontece quando você não tem margem suficiente para abrir novas posições.
                                Solução: reduza a quantidade de posições simultâneas ou aumente o capital.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                            <h4 className="text-white font-bold mb-2">🛡 Stop Loss (SL)</h4>
                            <p className="text-sm text-gray-400">
                                Sua rede de segurança. Se uma operação cair X%, ela é encerrada automaticamente para evitar perdas maiores.
                            </p>
                        </div>
                        <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                            <h4 className="text-white font-bold mb-2">🔒 Stop Loss Diário</h4>
                            <p className="text-sm text-gray-400">
                                Se suas perdas do dia ultrapassarem o limite (ex: 5%), o sistema para de operar até o dia seguinte.
                            </p>
                        </div>
                        <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                            <h4 className="text-white font-bold mb-2">⚡ Circuit Breaker</h4>
                            <p className="text-sm text-gray-400">
                                Após 3 perdas consecutivas, o sistema pausa automaticamente por segurança. Evita espirais de perdas emocionais.
                            </p>
                        </div>
                        <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                            <h4 className="text-white font-bold mb-2">💰 Modo de Risco</h4>
                            <p className="text-sm text-gray-400">
                                Escolha entre Conservador, Moderado ou Agressivo. Cada modo ajusta automaticamente os limites de risco.
                            </p>
                        </div>
                    </div>
                </div>
            </Section>

            <Section id="vpn" title="VPN" icon={Lock}>
                <div className="space-y-4 text-gray-300 leading-relaxed">
                    <p>
                        A aba <strong>VPN</strong> permite configurar e gerenciar conexões VPN para garantir acesso seguro à Exchange, 
                        especialmente em regiões com restrições de acesso.
                    </p>
                    <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl">
                        <p className="text-sm text-green-300">
                            🔒 <strong>Quando usar:</strong> Se a Binance está bloqueada na sua região, ou se você quer mais segurança na conexão.
                            A VPN mascara sua localização e criptografa todo o tráfego.
                        </p>
                    </div>
                </div>
            </Section>

            <Section id="auditoria" title="Auditoria" icon={FileText}>
                <div className="space-y-4 text-gray-300 leading-relaxed">
                    <p>
                        A aba <strong>Auditoria</strong> registra todas as ações do sistema: ordens executadas, erros, 
                        conexões com a exchange, ajustes de parâmetros e mais.
                    </p>
                    <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                        <p className="text-sm text-gray-400">
                            📋 <strong>Pense como um diário:</strong> Tudo que o sistema faz fica registrado aqui. 
                            Se algo der errado, você pode verificar exatamente o que aconteceu e quando.
                        </p>
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
                                <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-1 rounded">Risco Baixo</span>
                                <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-1 rounded">Alta Assertividade</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <TrendingUp className="text-yellow-400 shrink-0" size={32} />
                        <div>
                            <h4 className="text-yellow-400 font-bold mb-1">Moderado (Moderate)</h4>
                            <p className="text-sm text-gray-400">
                                O equilíbrio perfeito. Busca lucros consistentes com risco controlado.
                                A estratégia padrão recomendada para a maioria.
                            </p>
                            <div className="flex gap-2 mt-2">
                                <span className="text-xs bg-yellow-500/10 text-yellow-400 px-2 py-1 rounded">Risco Médio</span>
                                <span className="text-xs bg-yellow-500/10 text-yellow-400 px-2 py-1 rounded">Equilibrado</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <Zap className="text-orange-400 shrink-0" size={32} />
                        <div>
                            <h4 className="text-orange-400 font-bold mb-1">Agressivo (Bold)</h4>
                            <p className="text-sm text-gray-400">
                                Busca capturar movimentos rápidos. Aceita maior volatilidade 
                                em troca de potenciais lucros maiores.
                            </p>
                            <div className="flex gap-2 mt-2">
                                <span className="text-xs bg-orange-500/10 text-orange-400 px-2 py-1 rounded">Risco Alto</span>
                                <span className="text-xs bg-orange-500/10 text-orange-400 px-2 py-1 rounded">Escalabilidade</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <Target className="text-purple-400 shrink-0" size={32} />
                        <div>
                            <h4 className="text-purple-400 font-bold mb-1">Especialista (Sniper)</h4>
                            <p className="text-sm text-gray-400">
                                Focado em reversões de tendência e padrões harmônicos.
                                Opera menos vezes, mas com altíssima precisão.
                            </p>
                            <div className="flex gap-2 mt-2">
                                <span className="text-xs bg-purple-500/10 text-purple-400 px-2 py-1 rounded">Risco Variável</span>
                                <span className="text-xs bg-purple-500/10 text-purple-400 px-2 py-1 rounded">Alta Precisão</span>
                            </div>
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
                            Não! O motor roda em segundo plano no servidor. Você pode fechar o navegador — as ordens continuarão sendo executadas 24/7.
                        </div>
                    </details>

                    <details className="group">
                        <summary className="flex items-center justify-between cursor-pointer p-4 bg-black/30 rounded-lg hover:bg-black/50 transition-colors">
                            <span className="font-medium text-white">Minhas API Keys estão seguras?</span>
                            <ChevronDown className="text-gray-500 group-open:rotate-180 transition-transform" />
                        </summary>
                        <div className="p-4 text-sm text-gray-400">
                            Sim! Suas chaves são salvas criptografadas no banco de dados com RLS (Row Level Security).
                            Além disso, apenas tem permissão de operar — sem permissão de saque.
                        </div>
                    </details>

                    <details className="group">
                        <summary className="flex items-center justify-between cursor-pointer p-4 bg-black/30 rounded-lg hover:bg-black/50 transition-colors">
                            <span className="font-medium text-white">Posso usar múltiplas estratégias ao mesmo tempo?</span>
                            <ChevronDown className="text-gray-500 group-open:rotate-180 transition-transform" />
                        </summary>
                        <div className="p-4 text-sm text-gray-400">
                            Sim! Cada perfil opera de forma independente com seu próprio capital.
                        </div>
                    </details>

                    <details className="group">
                        <summary className="flex items-center justify-between cursor-pointer p-4 bg-black/30 rounded-lg hover:bg-black/50 transition-colors">
                            <span className="font-medium text-white">O que é o Win Rate?</span>
                            <ChevronDown className="text-gray-500 group-open:rotate-180 transition-transform" />
                        </summary>
                        <div className="p-4 text-sm text-gray-400">
                            Win Rate é a porcentagem de trades que deram lucro. Se de 100 trades 60 foram positivos, seu Win Rate é 60%.
                            Um Win Rate acima de 50% é considerado bom.
                        </div>
                    </details>

                    <details className="group">
                        <summary className="flex items-center justify-between cursor-pointer p-4 bg-black/30 rounded-lg hover:bg-black/50 transition-colors">
                            <span className="font-medium text-white">O que o "Analisar Agora" faz nos Agentes IA?</span>
                            <ChevronDown className="text-gray-500 group-open:rotate-180 transition-transform" />
                        </summary>
                        <div className="p-4 text-sm text-gray-400">
                            Ele busca seus trades dos últimos 7 dias, calcula métricas (Win Rate, PnL, Sharpe Ratio) e sugere ajustes como:
                            reduzir alavancagem se está perdendo muito, aumentar cooldown entre operações, ou manter tudo se está indo bem.
                        </div>
                    </details>

                    <details className="group">
                        <summary className="flex items-center justify-between cursor-pointer p-4 bg-black/30 rounded-lg hover:bg-black/50 transition-colors">
                            <span className="font-medium text-white">O que é o Sharpe Ratio?</span>
                            <ChevronDown className="text-gray-500 group-open:rotate-180 transition-transform" />
                        </summary>
                        <div className="p-4 text-sm text-gray-400">
                            É uma medida de "lucro vs risco". Quanto maior o Sharpe, melhor — significa que você está ganhando mais com menos risco.
                            Acima de 1.0 é bom, acima de 2.0 é excelente.
                        </div>
                    </details>

                    <details className="group">
                        <summary className="flex items-center justify-between cursor-pointer p-4 bg-black/30 rounded-lg hover:bg-black/50 transition-colors">
                            <span className="font-medium text-white">Como personalizar o Dashboard?</span>
                            <ChevronDown className="text-gray-500 group-open:rotate-180 transition-transform" />
                        </summary>
                        <div className="p-4 text-sm text-gray-400">
                            Na aba Visão Geral, clique em "Personalizar" no canto superior direito. 
                            Você pode mostrar/ocultar widgets como Posições, Win Rate, Meta Diária, Curva de Patrimônio e mais.
                        </div>
                    </details>
                </div>
            </Section>
        </div>
    );
};

export default InformationTab;
