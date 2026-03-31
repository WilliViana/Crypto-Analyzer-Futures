
import React, { useState } from 'react';
import { 
  BookOpen, Shield, TrendingUp, Zap, Target, AlertTriangle, HelpCircle, 
  ChevronDown, Brain, Eye, History, BarChart3, Lock, FileText, 
  Rocket, Play, Search, ChevronRight, Sparkles, CheckCircle2, Info
} from 'lucide-react';
import { Language } from '../types';

interface InformationTabProps {
    lang: Language;
    onStartTour?: () => void;
}

const InformationTab: React.FC<InformationTabProps> = ({ lang, onStartTour }) => {
    const [openSection, setOpenSection] = useState<string | null>('how-it-works');
    const [openFaq, setOpenFaq] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const toggleSection = (id: string) => {
        setOpenSection(openSection === id ? null : id);
    };

    const toggleFaq = (id: string) => {
        setOpenFaq(openFaq === id ? null : id);
    };

    // Section accordion component
    const Section = ({ id, title, icon: Icon, children, badge }: { id: string; title: string; icon: any; children: React.ReactNode; badge?: string }) => (
        <div className="bg-surface rounded-2xl border border-card-border overflow-hidden transition-all duration-300 hover:border-white/10">
            <button
                onClick={() => toggleSection(id)}
                className={`w-full flex items-center justify-between p-5 md:p-6 ${openSection === id ? 'bg-primary/5' : 'hover:bg-white/5'} transition-all`}
            >
                <div className="flex items-center gap-3 md:gap-4">
                    <div className={`p-2.5 md:p-3 rounded-xl transition-all ${openSection === id ? 'bg-primary/20 text-primary shadow-lg shadow-primary/10' : 'bg-black/30 text-gray-400'}`}>
                        <Icon size={22} />
                    </div>
                    <div className="text-left">
                        <h3 className={`text-base md:text-lg font-bold transition-colors ${openSection === id ? 'text-white' : 'text-gray-300'}`}>{title}</h3>
                        {badge && <span className="text-[10px] font-bold uppercase text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full mt-1 inline-block">{badge}</span>}
                    </div>
                </div>
                <ChevronDown className={`transition-transform duration-300 ${openSection === id ? 'rotate-180 text-primary' : 'text-gray-500'}`} size={20} />
            </button>

            <div className={`overflow-hidden transition-all duration-300 ${openSection === id ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="p-5 md:p-6 border-t border-card-border bg-black/10">
                    {children}
                </div>
            </div>
        </div>
    );

    // FAQ Item component - uses React state instead of HTML details
    const FaqItem = ({ id, question, answer }: { id: string; question: string; answer: string }) => {
        const isOpen = openFaq === id;
        return (
            <div className="border border-white/5 rounded-xl overflow-hidden transition-all hover:border-white/10">
                <button
                    onClick={() => toggleFaq(id)}
                    className={`w-full flex items-center justify-between p-4 text-left transition-all ${isOpen ? 'bg-cyan-500/5' : 'bg-black/20 hover:bg-black/30'}`}
                >
                    <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${isOpen ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-gray-500'}`}>
                            ?
                        </div>
                        <span className={`font-medium text-sm md:text-base transition-colors ${isOpen ? 'text-white' : 'text-gray-300'}`}>{question}</span>
                    </div>
                    <ChevronDown className={`transition-transform duration-300 shrink-0 ml-2 ${isOpen ? 'rotate-180 text-cyan-400' : 'text-gray-500'}`} size={16} />
                </button>
                <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="px-4 pb-4 pt-2 text-sm text-gray-400 leading-relaxed border-t border-white/5">
                        {answer}
                    </div>
                </div>
            </div>
        );
    };

    // Info card component
    const InfoCard = ({ icon, title, description, color }: { icon: string; title: string; description: string; color: string }) => (
        <div className="bg-black/30 p-4 rounded-xl border border-white/5 hover:border-white/10 transition-all group">
            <div className={`font-bold mb-2 flex items-center gap-2 text-${color}-400`}>
                <span>{icon}</span> {title}
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">{description}</p>
        </div>
    );

    // Quick Start checklist
    const QuickStart = () => (
        <div className="bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 rounded-2xl p-5 md:p-6">
            <div className="flex items-center gap-3 mb-4">
                <Rocket className="text-cyan-400" size={24} />
                <div>
                    <h3 className="font-bold text-white text-lg">Início Rápido</h3>
                    <p className="text-xs text-gray-400">Siga estes passos para começar a operar</p>
                </div>
            </div>
            <div className="space-y-3">
                {[
                    { step: '1', text: 'Cadastre suas API Keys da Binance na aba "API"', color: 'yellow' },
                    { step: '2', text: 'Escolha e ative seus perfis de estratégia no "Motor"', color: 'blue' },
                    { step: '3', text: 'Configure seus limites na "Gestão de Riscos"', color: 'red' },
                    { step: '4', text: 'Clique no botão verde "INICIAR" no topo da tela', color: 'green' },
                    { step: '5', text: 'Acompanhe seus resultados no "Dashboard" e "Histórico"', color: 'purple' },
                ].map((item) => (
                    <div key={item.step} className="flex items-center gap-3 p-3 bg-black/20 rounded-xl border border-white/5">
                        <div className={`w-8 h-8 rounded-full bg-${item.color}-500/20 text-${item.color}-400 flex items-center justify-center text-sm font-bold shrink-0`}
                            style={{
                                backgroundColor: item.color === 'yellow' ? 'rgba(234,179,8,0.2)' : item.color === 'blue' ? 'rgba(59,130,246,0.2)' : item.color === 'red' ? 'rgba(239,68,68,0.2)' : item.color === 'green' ? 'rgba(34,197,94,0.2)' : 'rgba(168,85,247,0.2)',
                                color: item.color === 'yellow' ? '#facc15' : item.color === 'blue' ? '#60a5fa' : item.color === 'red' ? '#f87171' : item.color === 'green' ? '#4ade80' : '#a78bfa'
                            }}
                        >
                            {item.step}
                        </div>
                        <span className="text-sm text-gray-300">{item.text}</span>
                    </div>
                ))}
            </div>
            {onStartTour && (
                <button
                    onClick={onStartTour}
                    className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm transition-all shadow-lg shadow-cyan-500/20"
                >
                    <Play size={16} />
                    Fazer Tour Guiado Completo
                </button>
            )}
        </div>
    );

    // FAQ data
    const faqItems = [
        { id: 'faq-1', q: 'Preciso deixar a aba do navegador aberta?', a: 'Não! O motor roda em segundo plano no servidor. Você pode fechar o navegador tranquilamente — as ordens continuarão sendo executadas 24 horas por dia, 7 dias por semana.' },
        { id: 'faq-2', q: 'Minhas API Keys estão seguras?', a: 'Sim! Suas chaves são salvas criptografadas no banco de dados com RLS (Row Level Security). Além disso, as chaves devem ter apenas permissão de operar — sem permissão de saque. Ninguém consegue retirar seu dinheiro.' },
        { id: 'faq-3', q: 'Posso usar múltiplas estratégias ao mesmo tempo?', a: 'Sim! Cada perfil de estratégia opera de forma totalmente independente, com seu próprio capital reservado. Você pode ter o "Seguro" com $100, o "Moderado" com $200 e o "Ousado" com $50, todos rodando ao mesmo tempo.' },
        { id: 'faq-4', q: 'O que é o Win Rate?', a: 'Win Rate é a porcentagem de trades que deram lucro. Por exemplo: se de 100 operações, 60 foram positivas, seu Win Rate é 60%. Um Win Rate acima de 50% é considerado bom. Acima de 60% é excelente!' },
        { id: 'faq-5', q: 'O que o "Analisar Agora" faz nos Agentes IA?', a: 'Ele busca seus trades dos últimos 7 dias, calcula métricas importantes (Win Rate, PnL, Sharpe Ratio) e sugere ajustes como: reduzir alavancagem se está perdendo muito, aumentar intervalo entre operações, ou manter tudo se está indo bem.' },
        { id: 'faq-6', q: 'O que é o Sharpe Ratio?', a: 'É uma medida de "quanto lucro por unidade de risco". Quanto maior, melhor — significa que você está ganhando mais correndo menos risco. Acima de 1.0 é bom, acima de 2.0 é excelente. Pense nele como uma nota de eficiência.' },
        { id: 'faq-7', q: 'Como personalizar o Dashboard?', a: 'Na aba Visão Geral (Dashboard), clique no botão "Personalizar" no canto superior direito. Você pode mostrar ou ocultar widgets como: Posições Abertas, Win Rate, Meta Diária, Curva de Patrimônio e muito mais.' },
        { id: 'faq-8', q: 'O que acontece se a internet cair?', a: 'As posições que já estão abertas continuam na exchange com os Stop Loss e Take Profit configurados. Quando a conexão voltar, o motor retoma automaticamente. Seus trades ficam protegidos mesmo offline.' },
        { id: 'faq-9', q: 'Quanto de capital eu preciso para começar?', a: 'Recomendamos no mínimo $100 USDT na Binance Futures. Com esse valor, o perfil "Seguro" ou "Moderado" consegue operar normalmente. Quanto mais capital, mais pares de moedas o sistema faz simultaneamente.' },
        { id: 'faq-10', q: 'O sistema garante lucro?', a: 'Não! Nenhum sistema de trading garante lucro. O mercado de criptomoedas é muito volátil e há riscos reais de perda. O CAP.PRO ajuda a tomar decisões mais informadas e a gerenciar riscos, mas resultados passados não garantem resultados futuros.' },
    ];

    const filteredFaqs = searchQuery.trim()
        ? faqItems.filter(f => 
            f.q.toLowerCase().includes(searchQuery.toLowerCase()) || 
            f.a.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : faqItems;

    return (
        <div className="max-w-4xl mx-auto space-y-5 pb-20">
            {/* Header */}
            <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold uppercase mb-4">
                    <BookOpen size={14} />
                    Central de Conhecimento
                </div>
                <h1 className="text-2xl md:text-3xl font-black text-white mb-3 bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-500">
                    Como usar o CAP.PRO
                </h1>
                <p className="text-gray-400 text-sm md:text-base max-w-xl mx-auto">
                    Entenda cada funcionalidade da plataforma de forma simples e clara. 
                    Mesmo que você nunca tenha feito trading, vai entender tudo!
                </p>
            </div>

            {/* Quick Start */}
            <QuickStart />

            {/* Sections */}
            <Section id="how-it-works" title="Como Funciona o CAP.PRO" icon={BookOpen} badge="Essencial">
                <div className="space-y-4 text-gray-300 leading-relaxed">
                    <p>
                        O <strong>CAP.PRO (Quantum HFT Terminal)</strong> é sua plataforma completa de trading automatizado.
                        Ele se conecta à sua conta na Binance Futures, analisa o mercado em tempo real e executa ordens automaticamente.
                    </p>
                    <div className="bg-cyan-500/5 border border-cyan-500/20 p-4 rounded-xl">
                        <p className="text-sm text-cyan-300">
                            📌 <strong>Pense assim:</strong> O CAP.PRO é como ter um trader profissional trabalhando 24 horas por dia para você. 
                            Ele analisa gráficos, identifica oportunidades e executa operações — tudo automaticamente!
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                        <InfoCard icon="🔐" title="1. Conexão Segura" description="Suas API Keys ficam criptografadas. Sem permissão de saque — 100% seguro." color="cyan" />
                        <InfoCard icon="📊" title="2. Perfis de Margem" description="Defina capital, alavancagem máxima e Stop Loss para cada estratégia." color="blue" />
                        <InfoCard icon="⚡" title="3. Execução Automática" description="O motor calcula, valida e executa ordens na Exchange em milissegundos." color="purple" />
                    </div>
                </div>
            </Section>

            <Section id="dashboard" title="Visão Geral (Dashboard)" icon={Eye}>
                <div className="space-y-4 text-gray-300 leading-relaxed">
                    <p>
                        A aba <strong>Visão Geral</strong> é o seu painel principal. Aqui você vê tudo que está acontecendo na sua conta em tempo real.
                        É como o painel de um carro — mostra "velocidade", "combustível" e tudo que você precisa saber.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <InfoCard icon="💰" title="Saldo Total" description="Mostra quanto dinheiro total você tem na conta. Inclui margem disponível + margem usada nas posições." color="cyan" />
                        <InfoCard icon="📊" title="PnL Não Realizado" description="Quanto suas posições abertas estão ganhando ou perdendo agora. Esse valor muda em tempo real." color="green" />
                        <InfoCard icon="🎯" title="Win Rate" description="Percentual de operações positivas. Se de 10 trades, 6 deram lucro, seu Win Rate é 60%." color="purple" />
                        <InfoCard icon="📈" title="Melhor / Pior Trade" description="O maior lucro e a maior perda dentre suas operações recentes. Ajuda a entender seu risco." color="yellow" />
                        <InfoCard icon="🎯" title="Meta Diária de Ganho" description="Defina um objetivo diário (ex: 10%). O sistema mostra o progresso e pode parar ao atingir a meta." color="orange" />
                        <InfoCard icon="⚡" title="Posições Abertas" description="Lista todas as moedas que você está operando agora, com preço de entrada e lucro/perda atual." color="red" />
                    </div>
                    <div className="bg-blue-500/5 border border-blue-500/20 p-4 rounded-xl mt-3">
                        <p className="text-sm text-blue-300">
                            💡 <strong>Dica:</strong> Clique em "Personalizar" para escolher quais informações mostrar ou ocultar na tela.
                        </p>
                    </div>
                </div>
            </Section>

            <Section id="motor" title="Motor Algorítmico" icon={Zap} badge="Importante">
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
                        <InfoCard icon="▶️" title="Iniciar / ⏸ Pausar" description="O botão no topo da tela liga e desliga o motor. Quando ligado, começa a executar trades automaticamente." color="green" />
                        <InfoCard icon="📋" title="Perfis Ativos" description="Cada perfil é uma estratégia com seu próprio capital e configurações. Pode rodar vários ao mesmo tempo." color="purple" />
                    </div>
                </div>
            </Section>

            <Section id="wallet" title="Carteira Real" icon={TrendingUp}>
                <div className="space-y-4 text-gray-300 leading-relaxed">
                    <p>
                        A aba <strong>Carteira Real</strong> mostra os ativos que você possui na Binance. 
                        Diferente da Visão Geral que mostra trades, aqui você vê suas moedas e seus saldos reais.
                    </p>
                    <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl">
                        <p className="text-sm text-green-300">
                            📌 Inclui saldo na conta <strong>Futures (USDT-M)</strong> e <strong>Spot</strong>. 
                            Mostra a alocação de cada ativo, quanto cada posição vale e o PnL de cada uma.
                        </p>
                    </div>
                </div>
            </Section>

            <Section id="history" title="Histórico de Trades" icon={History}>
                <div className="space-y-4 text-gray-300 leading-relaxed">
                    <p>
                        O <strong>Histórico</strong> mostra todas as suas operações realizadas.
                        É como seu extrato bancário — tudo que entrou e saiu fica registrado aqui.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InfoCard icon="✅" title="Trades Positivos" description="Operações que deram lucro. Mostra símbolo, lado (BUY/SELL), PnL e data/hora." color="green" />
                        <InfoCard icon="❌" title="Trades Negativos" description="Operações que deram perda. Use para aprender com os erros e melhorar suas estratégias." color="red" />
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
                        Eles usam o ciclo <strong>PDCA</strong> (Planejar, Fazer, Checar, Agir):
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                        {[
                            { label: '📋 Planejar', desc: 'Analisa seus trades dos últimos 7 dias', color: 'rgba(59,130,246,0.1)' },
                            { label: '⚡ Fazer', desc: 'Aplica os ajustes sugeridos', color: 'rgba(234,179,8,0.1)' },
                            { label: '🔍 Checar', desc: 'Verifica se os resultados melhoraram', color: 'rgba(168,85,247,0.1)' },
                            { label: '✅ Agir', desc: 'Mantém ou ajusta os parâmetros', color: 'rgba(34,197,94,0.1)' },
                        ].map((item, i) => (
                            <div key={i} className="p-3 rounded-xl text-center" style={{ backgroundColor: item.color }}>
                                <div className="font-bold text-sm">{item.label}</div>
                                <div className="text-xs text-gray-400 mt-1">{item.desc}</div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 space-y-3">
                        <InfoCard icon="🤖" title="Analisar Agora" description="Clique para o sistema buscar seus trades mais recentes e sugerir ajustes. Você pode revisar cada sugestão e escolher quais aplicar." color="cyan" />
                        <InfoCard icon="⏰" title="Auto 24h" description="Quando ativado, o sistema faz tudo sozinho a cada 24 horas: busca trades, analisa, e aplica os ajustes automaticamente." color="green" />
                        <InfoCard icon="📊" title="Tipos de Agentes" description="Trend Hunter (segue tendências), Reversal Sniper (identifica reversões), Scalp Machine (operações rápidas), Sentiment Reader (analisa sentimento)." color="purple" />
                    </div>
                </div>
            </Section>

            <Section id="risk-management" title="Gestão de Riscos" icon={AlertTriangle} badge="Crítico">
                <div className="space-y-6">
                    <p className="text-gray-300 leading-relaxed">
                        A <strong>Gestão de Riscos</strong> protege seu dinheiro. Configure limites de perda diária, stop loss global e circuit breaker.
                        <span className="text-red-400 font-bold"> NUNCA invista mais do que pode perder!</span>
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
                        <InfoCard icon="🛡" title="Stop Loss (SL)" description="Sua rede de segurança. Se uma operação cair X%, ela é encerrada automaticamente para evitar perdas maiores." color="blue" />
                        <InfoCard icon="🔒" title="Stop Loss Diário" description="Se suas perdas do dia ultrapassarem o limite (ex: 5%), o sistema para de operar até o dia seguinte." color="yellow" />
                        <InfoCard icon="⚡" title="Circuit Breaker" description="Após 3 perdas consecutivas, o sistema pausa automaticamente por segurança." color="red" />
                        <InfoCard icon="💰" title="Modo de Risco" description="Escolha entre Conservador, Moderado ou Agressivo. Cada modo ajusta automaticamente os limites." color="green" />
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
                    <div className="bg-purple-500/10 border border-purple-500/20 p-4 rounded-xl">
                        <p className="text-sm text-purple-300">
                            📋 <strong>Pense como um diário:</strong> Tudo que o sistema faz fica registrado aqui. 
                            Se algo der errado, você pode verificar exatamente o que aconteceu e quando.
                        </p>
                    </div>
                </div>
            </Section>

            <Section id="strategies" title="Perfis de Estratégia" icon={Target}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[
                        { name: 'Conservador (Safe)', desc: 'Foca na preservação de capital. Entra apenas em tendências muito confirmadas. Ideal para iniciantes.', icon: Shield, color: '#60a5fa', tags: ['Risco Baixo', 'Alta Assertividade'] },
                        { name: 'Moderado (Moderate)', desc: 'O equilíbrio perfeito. Busca lucros consistentes com risco controlado. Recomendado para a maioria.', icon: TrendingUp, color: '#facc15', tags: ['Risco Médio', 'Equilibrado'] },
                        { name: 'Agressivo (Bold)', desc: 'Busca capturar movimentos rápidos. Aceita maior volatilidade em troca de potenciais lucros maiores.', icon: Zap, color: '#fb923c', tags: ['Risco Alto', 'Escalabilidade'] },
                        { name: 'Especialista (Sniper)', desc: 'Focado em reversões de tendência. Opera menos vezes, mas com altíssima precisão.', icon: Target, color: '#a78bfa', tags: ['Risco Variável', 'Alta Precisão'] },
                    ].map((strategy) => {
                        const StratIcon = strategy.icon;
                        return (
                            <div key={strategy.name} className="flex gap-4 p-4 bg-black/20 rounded-xl border border-white/5 hover:border-white/10 transition-all">
                                <StratIcon className="shrink-0" size={28} style={{ color: strategy.color }} />
                                <div>
                                    <h4 className="font-bold mb-1" style={{ color: strategy.color }}>{strategy.name}</h4>
                                    <p className="text-sm text-gray-400 mb-2">{strategy.desc}</p>
                                    <div className="flex gap-2 flex-wrap">
                                        {strategy.tags.map(tag => (
                                            <span key={tag} className="text-xs px-2 py-0.5 rounded-full border" style={{ 
                                                borderColor: `${strategy.color}33`,
                                                backgroundColor: `${strategy.color}15`,
                                                color: strategy.color 
                                            }}>{tag}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Section>

            {/* FAQ Section - completely independent from Section accordion */}
            <div className="bg-surface rounded-2xl border border-card-border overflow-hidden">
                <div className="p-5 md:p-6 bg-gradient-to-r from-cyan-500/5 to-purple-500/5">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400">
                                <HelpCircle size={22} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">Perguntas Frequentes</h3>
                                <p className="text-xs text-gray-400">{filteredFaqs.length} perguntas disponíveis</p>
                            </div>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="relative mb-4">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar pergunta..."
                            className="w-full pl-10 pr-4 py-2.5 bg-black/30 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
                        />
                    </div>

                    {/* FAQ Items */}
                    <div className="space-y-2">
                        {filteredFaqs.length > 0 ? (
                            filteredFaqs.map(faq => (
                                <FaqItem key={faq.id} id={faq.id} question={faq.q} answer={faq.a} />
                            ))
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                <Search size={24} className="mx-auto mb-2 opacity-50" />
                                <p className="text-sm">Nenhuma pergunta encontrada para "{searchQuery}"</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="text-center py-6 text-gray-600 text-xs">
                <p>CAP.PRO Terminal © 2025 — Todos os direitos reservados</p>
                <p className="mt-1">Criptomoedas envolvem risco. Opere com responsabilidade.</p>
            </div>
        </div>
    );
};

export default InformationTab;
