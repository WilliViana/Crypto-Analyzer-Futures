
import React, { useState, useEffect } from 'react';
import { Language } from '../types';
import { translations } from '../utils/translations';
import { Mail, Lock, ArrowRight, TrendingUp, Zap, User, Hexagon, AlertTriangle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useNotification } from '../contexts/NotificationContext';

interface LoginScreenProps {
  onLogin: (email: string, role: 'admin' | 'user') => void;
  lang: Language;
  setLang: (lang: Language) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, lang, setLang }) => {
  const t = translations[lang].login;
  const { notify } = useNotification();
  const [mode, setMode] = useState<'login' | 'register'>('login'); 
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [adminCode, setAdminCode] = useState(''); 
  const [showPassword, setShowPassword] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    setErrorMsg(null);
    
    try {
      if (mode === 'register') {
        if (password.length < 6) throw new Error("A senha deve ter pelo menos 6 caracteres.");
        if (password !== confirmPassword) throw new Error("As senhas não coincidem.");

        // Define o cargo baseado no código de convite master ou padrão trader
        const role = adminCode === 'admin-master' ? 'admin' : 'user';

        // Injetamos o 'role' nos metadados do Auth. 
        // Se a trigger do Supabase falhar ao salvar na tabela 'profiles',
        // o frontend ainda saberá o cargo do usuário via JWT.
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { 
              full_name: name, 
              role: role 
            }
          }
        });

        if (error) {
           // Caso ocorra o erro clássico de trigger do Supabase
           if (error.message.includes("Database error saving new user")) {
               notify('warning', 'Quase pronto!', 'Seu acesso foi criado via metadados de segurança. Por favor, faça login agora.');
               setMode('login');
               return;
           }
           throw error;
        }
        
        notify('success', 'Registro Concluído', 'Sua conta de trader foi configurada. Acesse o terminal.');
        setMode('login');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            if (error.message.includes('Invalid login credentials')) throw new Error("E-mail ou senha inválidos.");
            throw error;
        }
        notify('success', 'Bem-vindo ao Terminal', 'Sincronizando ambiente de trading...');
        // Manual trigger to skip wait time for onAuthStateChange
        onLogin(email, 'user');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
      notify('error', 'Falha na Operação', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0E14] flex flex-col md:flex-row text-gray-200 font-sans selection:bg-primary/30">
      {/* Lado Esquerdo - Branding */}
      <div className="hidden md:flex flex-1 bg-surface relative overflow-hidden items-center justify-center p-12">
          <div className="absolute inset-0">
               <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] animate-pulse"></div>
               <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
          </div>

          <div className="relative z-10 max-w-lg flex flex-col items-start w-full">
             <div className="mb-12">
                <div className="flex items-center gap-4">
                    <Hexagon className="text-primary animate-pulse" size={64} strokeWidth={1.5} />
                    <div>
                        <span className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 tracking-tight">CAP<span className="text-primary">.PRO</span></span>
                        <span className="text-[10px] text-gray-500 tracking-[0.4em] uppercase block font-mono">Quantum HFT Terminal</span>
                    </div>
                </div>
             </div>

             <div className="space-y-6 w-full">
                 <div className="flex gap-5 items-center bg-black/40 p-6 rounded-2xl border border-white/5 backdrop-blur-md hover:border-primary/30 transition-all group">
                     <div className="p-4 bg-green-500/10 rounded-xl group-hover:scale-110 transition-transform"><TrendingUp className="text-green-400" size={28} /></div>
                     <div><h3 className="font-bold text-white text-lg">Execução HFT Real</h3><p className="text-gray-400 text-sm">Ordens processadas em milissegundos via API direta.</p></div>
                 </div>
                 <div className="flex gap-5 items-center bg-black/40 p-6 rounded-2xl border border-white/5 backdrop-blur-md hover:border-purple-500/30 transition-all group">
                     <div className="p-4 bg-purple-500/10 rounded-xl group-hover:scale-110 transition-transform"><Zap className="text-purple-400" size={28} /></div>
                     <div><h3 className="font-bold text-white text-lg">Shadow Profile Auth</h3><p className="text-gray-400 text-sm">Resiliência total contra falhas de banco de dados.</p></div>
                 </div>
             </div>
          </div>
      </div>

      {/* Lado Direito - Formulário */}
      <div className="flex-1 flex flex-col justify-center px-8 md:px-24 bg-[#0B0E14] relative">
           <div className="max-w-md w-full mx-auto">
               <div className="mb-10 text-center md:text-left">
                   <h2 className="text-4xl font-bold text-white mb-3 tracking-tighter uppercase">{mode === 'login' ? 'Terminal Login' : 'Novo Trader'}</h2>
                   <p className="text-gray-400 text-sm leading-relaxed">{mode === 'login' ? 'Acesse o núcleo de inteligência preditiva para futuros.' : 'Crie sua identidade digital de trading e acesse os algoritmos.'}</p>
               </div>

               <form onSubmit={handleSubmit} className="space-y-6">
                   {mode === 'register' && (
                       <div className="animate-fade-in space-y-6">
                           <div>
                               <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2 tracking-widest">Nome Completo</label>
                               <div className="relative group">
                                   <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-primary transition-colors" size={18} />
                                   <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-[#151A25] border border-card-border rounded-xl py-3.5 pl-12 pr-4 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" placeholder="Seu nome" required />
                               </div>
                           </div>
                           <div>
                               <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2 tracking-widest">Código Admin (Opcional)</label>
                               <div className="relative group">
                                   <Hexagon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
                                   <input type="text" value={adminCode} onChange={(e) => setAdminCode(e.target.value)} className="w-full bg-[#151A25] border border-card-border rounded-xl py-3.5 pl-12 pr-4 text-white focus:border-primary outline-none transition-all" placeholder="Código de Convite" />
                               </div>
                           </div>
                       </div>
                   )}

                   <div>
                       <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2 tracking-widest">Identificador de E-mail</label>
                       <div className="relative group">
                           <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-primary transition-colors" size={18} />
                           <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-[#151A25] border border-card-border rounded-xl py-3.5 pl-12 pr-4 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" placeholder="exemplo@trading.com" required />
                       </div>
                   </div>

                   <div>
                       <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2 tracking-widest">Chave de Acesso (Senha)</label>
                       <div className="relative group">
                           <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-primary transition-colors" size={18} />
                           <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-[#151A25] border border-card-border rounded-xl py-3.5 pl-12 pr-12 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" placeholder="••••••••" required />
                           <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white">
                                {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                           </button>
                       </div>
                   </div>

                   {mode === 'register' && (
                       <div className="animate-fade-in">
                           <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2 tracking-widest">Confirmar Chave</label>
                           <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full bg-[#151A25] border border-card-border rounded-xl py-3.5 px-4 text-white focus:border-primary outline-none" placeholder="Repita a senha" required />
                       </div>
                   )}

                   {errorMsg && (
                       <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3 text-xs animate-shake shadow-lg">
                           <AlertTriangle size={20} className="shrink-0" /> {errorMsg}
                       </div>
                   )}

                   <button type="submit" disabled={isLoading} className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-xl shadow-xl shadow-primary/20 flex items-center justify-center gap-3 transition-all transform active:scale-[0.98] disabled:opacity-50">
                        {isLoading ? <Loader2 className="animate-spin" size={20} /> : <>{mode === 'login' ? 'Entrar no Kernel' : 'Configurar Perfil'} <ArrowRight size={18} /></>}
                   </button>
               </form>

               {/* Demo Access Button */}
               {mode === 'login' && (
                   <button 
                       type="button" 
                       onClick={() => onLogin('visitante@demo.com', 'user')} 
                       className="w-full mt-4 bg-transparent border border-white/10 text-gray-400 hover:text-white py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all hover:bg-white/5"
                   >
                       Acesso Demonstração (Sem Login)
                   </button>
               )}

               <div className="mt-10 text-center text-xs text-gray-500 uppercase font-black tracking-[0.2em]">
                   {mode === 'login' ? (
                       <>Ainda sem credenciais? <button onClick={() => setMode('register')} className="text-primary hover:text-white transition-colors border-b border-primary/20">Solicitar Acesso</button></>
                   ) : (
                       <>Já possui registro? <button onClick={() => setMode('login')} className="text-primary hover:text-white transition-colors border-b border-primary/20">Voltar ao Login</button></>
                   )}
               </div>
           </div>
      </div>
    </div>
  );
};

export default LoginScreen;
