
import React, { useState } from 'react';
import { LayoutDashboard, LineChart, Settings, Activity, FileText, Lock, Wallet, Layers, ShieldCheck, Mail, Hexagon, History, Info } from 'lucide-react';
import { Language } from '../types';
import { translations } from '../utils/translations';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  lang: Language;
  isAdmin: boolean;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = React.memo(({ activeTab, setActiveTab, lang, isAdmin, onLogout }) => {
  const t = translations[lang].sidebar;
  const [imgError, setImgError] = useState(false);

  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: t.dashboard },
    { id: 'strategies', icon: Layers, label: t.strategies },
    { id: 'wallet', icon: Wallet, label: t.wallet },
    { id: 'history', icon: History, label: t.history },
    { id: 'analysis', icon: LineChart, label: t.analysis },
    { id: 'backtest', icon: Activity, label: t.backtest },
    { id: 'logs', icon: FileText, label: t.logs },
    { id: 'settings', icon: Settings, label: t.settings },
    { id: 'info', icon: Info, label: 'Info' },
    { id: 'profile', icon: Lock, label: 'Perfil' },
  ];

  if (isAdmin) {
    menuItems.splice(7, 0, { id: 'admin', icon: ShieldCheck, label: t.admin });
  }

  return (
    <div className="w-20 lg:w-64 h-screen bg-surface border-r border-card-border flex flex-col flex-shrink-0 transition-all duration-300">
      {/* Brand Header */}
      <div className="h-20 flex items-center justify-center border-b border-card-border relative overflow-hidden">
        <div className="relative w-full h-full flex items-center justify-center px-4">
          {!imgError ? (
            <img
              src="/logo.png"
              alt="CAP"
              className="max-w-[140px] max-h-[40px] object-contain filter drop-shadow-[0_0_8px_rgba(34,211,238,0.3)] transition-all duration-300"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="flex items-center gap-2 group cursor-default">
              <div className="relative">
                <Hexagon className="text-primary fill-primary/20 animate-pulse" size={32} strokeWidth={1.5} />
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">CP</span>
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 hidden lg:block tracking-tight">
                CAP<span className="text-primary">.PRO</span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 flex flex-col gap-2 px-2 overflow-y-auto scrollbar-hide">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center justify-center lg:justify-start px-4 py-3 rounded-lg transition-colors group relative ${isActive
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                }`}
            >
              <Icon size={20} className={isActive ? 'text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]' : ''} />
              <span className="ml-3 text-sm font-medium hidden lg:block">{item.label}</span>

              {/* Tooltip for collapsed view */}
              <div className="lg:hidden absolute left-14 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none whitespace-nowrap border border-gray-700">
                {item.label}
              </div>
            </button>
          );
        })}
      </nav>

      {/* User / Footer */}
      <div className="p-4 border-t border-card-border">
        <div className="flex items-center gap-3 justify-center lg:justify-start p-2 rounded-lg bg-black/20 border border-white/5 hover:border-white/10 transition-colors cursor-pointer group">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg ${isAdmin ? 'bg-gradient-to-br from-red-500 to-orange-500' : 'bg-gradient-to-br from-cyan-400 to-purple-600'}`}>
            {isAdmin ? 'AD' : 'CT'}
          </div>
          <div className="hidden lg:block overflow-hidden">
            <div className="text-sm font-medium text-gray-200 truncate group-hover:text-white transition-colors">{isAdmin ? 'Administrator' : t.role}</div>
            <div className="text-xs text-gray-500 truncate">{isAdmin ? 'admin@crypto.com' : 'user@crypto.com'}</div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <button onClick={onLogout} className="text-xs text-red-400 hover:text-white hover:bg-red-500/20 py-2 rounded text-center transition-colors border border-transparent hover:border-red-500/30">
            Logout
          </button>
        </div>
      </div>
    </div>
  );
});

export default Sidebar;
