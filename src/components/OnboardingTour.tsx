
import React, { useState, useEffect } from 'react';
import { 
  Rocket, LayoutDashboard, Layers, Wallet, History, Brain, 
  ShieldAlert, Settings, ChevronRight, ChevronLeft, X, Sparkles,
  Play, Target, BookOpen, CheckCircle2, ArrowRight, Info
} from 'lucide-react';

interface OnboardingTourProps {
  onComplete: () => void;
  onNavigate: (tab: string) => void;
}

interface TourStep {
  id: string;
  icon: React.ElementType;
  title: string;
  subtitle: string;
  description: string;
  tips: string[];
  color: string;
  bgGradient: string;
  navigateTo?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    icon: Rocket,
    title: 'Bem-vindo ao CAP.PRO! 🚀',
    subtitle: 'Seu Terminal de Trading Automatizado',
    description: 'O CAP.PRO é como ter um trader profissional trabalhando 24 horas por dia para você. Ele analisa o mercado, identifica oportunidades e executa operações — tudo automaticamente!',
    tips: [
      'Não se preocupe, vamos te guiar passo a passo',
      'Você pode voltar a este tour a qualquer momento na aba Info',
      'Suas chaves ficam sempre criptografadas e seguras'
    ],
    color: 'cyan',
    bgGradient: 'from-cyan-500/20 to-blue-600/20',
  },
  {
    id: 'api-keys',
    icon: Settings,
    title: '1️⃣ Conecte sua Exchange',
    subtitle: 'Primeiro passo obrigatório',
    description: 'Para começar, você precisa conectar sua conta da Binance. Vá na aba "API / Exchange" e cadastre suas chaves API. Sem isso, o sistema não consegue operar.',
    tips: [
      'Use chaves com permissão apenas de "Trading" — NUNCA dê permissão de saque',
      'As chaves ficam criptografadas no banco de dados',
      'Após conectar, o símbolo ficará verde ✅'
    ],
    color: 'yellow',
    bgGradient: 'from-yellow-500/20 to-orange-600/20',
    navigateTo: 'settings',
  },
  {
    id: 'dashboard',
    icon: LayoutDashboard,
    title: '2️⃣ Visão Geral (Dashboard)',
    subtitle: 'Sua central de controle',
    description: 'Aqui você vê tudo num só lugar: saldo, lucro/perda, posições abertas e o desempenho das suas estratégias. É como o painel de um carro — mostra velocidade, combustível e tudo mais!',
    tips: [
      'Clique em "Personalizar" para escolher o que aparece na tela',
      'Arraste os cards para reorganizar como preferir',
      'Os valores se atualizam automaticamente a cada poucos segundos'
    ],
    color: 'blue',
    bgGradient: 'from-blue-500/20 to-indigo-600/20',
    navigateTo: 'dashboard',
  },
  {
    id: 'strategies',
    icon: Layers,
    title: '3️⃣ Motor Algorítmico',
    subtitle: 'O cérebro do sistema',
    description: 'Aqui ficam seus "perfis de estratégia". Cada perfil opera com seu próprio dinheiro e regras. É como ter vários robôs diferentes, cada um com uma especialidade!',
    tips: [
      '🛡️ Seguro — Risco baixo, poucos trades, alta precisão',
      '⚖️ Moderado — Equilíbrio entre risco e retorno (recomendado!)',
      '🚀 Ousado — Mais trades, mais risco, mais potencial de lucro',
      'Você pode ativar/desativar cada perfil individualmente'
    ],
    color: 'purple',
    bgGradient: 'from-purple-500/20 to-pink-600/20',
    navigateTo: 'strategies',
  },
  {
    id: 'start-motor',
    icon: Play,
    title: '4️⃣ Ligue o Motor!',
    subtitle: 'Comece a operar',
    description: 'Depois de conectar sua exchange e configurar pelo menos 1 perfil, clique no botão verde "INICIAR" no topo da tela. O motor vai começar a analisar e operar automaticamente!',
    tips: [
      'O botão verde "INICIAR" fica no canto superior direito',
      'Quando ligado, fica vermelho "PARAR" — clique para pausar',
      'Você pode fechar o navegador — as ordens continuam rodando!',
      'Comece com o perfil "Seguro" ou "Moderado" para aprender'
    ],
    color: 'green',
    bgGradient: 'from-green-500/20 to-emerald-600/20',
  },
  {
    id: 'risk',
    icon: ShieldAlert,
    title: '5️⃣ Proteja seu Dinheiro',
    subtitle: 'Gestão de Riscos',
    description: 'Configure limites de perda para não perder mais do que pode. O sistema tem Stop Loss automático, limite diário de perda e "circuit breaker" que para tudo se muitas operações derem errado seguidas.',
    tips: [
      'Defina um Stop Loss Diário (ex: 5% do saldo)',
      'O Circuit Breaker pausa o motor após 3 perdas seguidas',
      'Comece com o modo "Conservador" até entender o sistema',
      'NUNCA invista mais do que pode perder!'
    ],
    color: 'red',
    bgGradient: 'from-red-500/20 to-rose-600/20',
    navigateTo: 'risk',
  },
  {
    id: 'wallet',
    icon: Wallet,
    title: '6️⃣ Carteira e Histórico',
    subtitle: 'Acompanhe seus resultados',
    description: 'Na aba "Carteira" você vê seus ativos reais. Na aba "Histórico" vê todas as operações feitas. É como seu extrato bancário — mostra tudo que entrou e saiu!',
    tips: [
      'Filtre por data para ver desempenho em períodos específicos',
      'Trades verdes = lucro ✅, vermelhos = perda ❌',
      'Analise seus trades para aprender e melhorar'
    ],
    color: 'emerald',
    bgGradient: 'from-emerald-500/20 to-teal-600/20',
    navigateTo: 'wallet',
  },
  {
    id: 'agents',
    icon: Brain,
    title: '7️⃣ Agentes IA',
    subtitle: 'Consultores inteligentes',
    description: 'Os Agentes IA analisam suas operações e sugerem melhorias automaticamente. Eles usam inteligência artificial para otimizar suas estratégias ao longo do tempo!',
    tips: [
      'Clique em "Analisar Agora" para uma análise imediata',
      'Ative o "Auto 24h" para otimização contínua automática',
      'Revise as sugestões antes de aplicar — você tem controle total'
    ],
    color: 'violet',
    bgGradient: 'from-violet-500/20 to-purple-600/20',
    navigateTo: 'agents',
  },
  {
    id: 'done',
    icon: CheckCircle2,
    title: 'Tudo Pronto! 🎉',
    subtitle: 'Você está preparado para começar',
    description: 'Agora você conhece todas as funcionalidades do CAP.PRO! Lembre-se: comece devagar, com pouco capital, e vá aumentando conforme ganha confiança. Se tiver dúvidas, acesse a aba "Info" a qualquer momento.',
    tips: [
      '✅ Conecte sua Exchange (API Keys)',
      '✅ Escolha seus perfis de estratégia',
      '✅ Configure a Gestão de Riscos',
      '✅ Clique em INICIAR e acompanhe!',
      '📖 Dúvidas? Consulte a aba "Info" ou o Chat Bot'
    ],
    color: 'cyan',
    bgGradient: 'from-cyan-500/20 to-green-600/20',
  },
];

const OnboardingTour: React.FC<OnboardingTourProps> = ({ onComplete, onNavigate }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');

  const step = TOUR_STEPS[currentStep];
  const Icon = step.icon;
  const progress = ((currentStep + 1) / TOUR_STEPS.length) * 100;

  const goToStep = (newStep: number, dir: 'next' | 'prev') => {
    if (isAnimating || newStep < 0 || newStep >= TOUR_STEPS.length) return;
    setIsAnimating(true);
    setDirection(dir);
    setTimeout(() => {
      setCurrentStep(newStep);
      setIsAnimating(false);
    }, 250);
  };

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      goToStep(currentStep + 1, 'next');
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      goToStep(currentStep - 1, 'prev');
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const handleNavigate = () => {
    if (step.navigateTo) {
      onNavigate(step.navigateTo);
      onComplete();
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') handleNext();
      else if (e.key === 'ArrowLeft') handlePrev();
      else if (e.key === 'Escape') handleSkip();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [currentStep]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={handleSkip}
      />

      {/* Tour Card */}
      <div 
        className="relative w-full max-w-lg mx-4 bg-[#151A25] border border-[#2A303C] rounded-3xl shadow-2xl overflow-hidden"
        style={{ maxHeight: '90vh' }}
      >
        {/* Progress bar */}
        <div className="h-1 bg-black/30">
          <div 
            className="h-full bg-gradient-to-r from-cyan-400 to-purple-500 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Close / Skip button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
          title="Pular tour"
        >
          <X size={18} />
        </button>

        {/* Content */}
        <div 
          className={`transition-all duration-250 ${
            isAnimating 
              ? direction === 'next' 
                ? 'opacity-0 translate-x-8' 
                : 'opacity-0 -translate-x-8'
              : 'opacity-100 translate-x-0'
          }`}
        >
          {/* Header with icon */}
          <div className={`px-8 pt-8 pb-4 bg-gradient-to-br ${step.bgGradient}`}>
            <div className="flex items-center gap-4 mb-4">
              <div className={`p-4 rounded-2xl bg-${step.color}-500/20 border border-${step.color}-500/30`}
                style={{ 
                  backgroundColor: `color-mix(in srgb, var(--tw-color-${step.color}-500, #22d3ee) 15%, transparent)`,
                  borderColor: `color-mix(in srgb, var(--tw-color-${step.color}-500, #22d3ee) 25%, transparent)`
                }}
              >
                <Icon size={32} className={`text-${step.color}-400`} style={{ color: step.color === 'cyan' ? '#22d3ee' : step.color === 'yellow' ? '#facc15' : step.color === 'blue' ? '#60a5fa' : step.color === 'purple' ? '#a78bfa' : step.color === 'green' ? '#4ade80' : step.color === 'red' ? '#f87171' : step.color === 'emerald' ? '#34d399' : step.color === 'violet' ? '#8b5cf6' : '#22d3ee' }} />
              </div>
              <div>
                <h2 className="text-xl font-black text-white">{step.title}</h2>
                <p className="text-sm text-gray-400 font-medium">{step.subtitle}</p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="px-8 py-6 space-y-5 overflow-y-auto" style={{ maxHeight: '45vh' }}>
            <p className="text-gray-300 leading-relaxed text-[15px]">
              {step.description}
            </p>

            {/* Tips */}
            <div className="space-y-2.5">
              {step.tips.map((tip, i) => (
                <div 
                  key={i} 
                  className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <Sparkles size={14} className="text-cyan-400 mt-0.5 shrink-0" />
                  <span className="text-sm text-gray-400 leading-relaxed">{tip}</span>
                </div>
              ))}
            </div>

            {/* Navigate to section button */}
            {step.navigateTo && (
              <button
                onClick={handleNavigate}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-cyan-400 text-sm font-bold transition-all group"
              >
                <span>Ir para esta seção agora</span>
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-[#2A303C] bg-black/20 flex items-center justify-between">
          {/* Step indicators */}
          <div className="flex items-center gap-1.5">
            {TOUR_STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => goToStep(i, i > currentStep ? 'next' : 'prev')}
                title={`Passo ${i + 1}`}
                aria-label={`Ir para passo ${i + 1}`}
                className={`rounded-full transition-all duration-300 ${
                  i === currentStep 
                    ? 'w-6 h-2 bg-cyan-400' 
                    : i < currentStep 
                      ? 'w-2 h-2 bg-cyan-400/50' 
                      : 'w-2 h-2 bg-gray-600 hover:bg-gray-500'
                }`}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="flex items-center gap-1 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-sm font-medium transition-all"
              >
                <ChevronLeft size={16} />
                Voltar
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-sm font-bold transition-all shadow-lg shadow-cyan-500/20"
            >
              {currentStep === TOUR_STEPS.length - 1 ? (
                <>
                  <CheckCircle2 size={16} />
                  Começar!
                </>
              ) : (
                <>
                  Próximo
                  <ChevronRight size={16} />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Step count */}
        <div className="absolute top-4 left-6 text-xs text-gray-500 font-mono">
          {currentStep + 1}/{TOUR_STEPS.length}
        </div>
      </div>
    </div>
  );
};

export default OnboardingTour;
