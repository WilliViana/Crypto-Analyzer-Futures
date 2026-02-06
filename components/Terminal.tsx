
import React, { useEffect, useRef } from 'react';
import { LogEntry, Language } from '../types';
import { Terminal as TerminalIcon } from 'lucide-react';
import { translations } from '../utils/translations';

interface TerminalProps {
  logs: LogEntry[];
  lang: Language;
}

const Terminal: React.FC<TerminalProps> = ({ logs, lang }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const t = translations[lang].terminal;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'INFO': return 'text-blue-400';
      case 'WARN': return 'text-yellow-500';
      case 'ERROR': return 'text-red-500';
      case 'SUCCESS': return 'text-green-400';
      case 'SYSTEM': return 'text-purple-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="bg-[#0B0E14] border border-card-border rounded-xl overflow-hidden flex flex-col h-80 font-mono text-[11px] md:text-[12px] shadow-2xl relative">
      <div className="bg-[#151A25]/90 backdrop-blur-md px-4 py-2 border-b border-card-border flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
            <TerminalIcon size={14} className="text-primary" />
            <span className="text-gray-200 font-bold uppercase tracking-widest text-[10px]">{t.title}</span>
        </div>
        <div className="flex gap-1.5 items-center">
            <span className="text-[9px] text-gray-500 uppercase mr-2 font-bold tracking-tighter">Real-Time Engine</span>
            <div className="w-1.5 h-1.5 rounded-full bg-red-500/30"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500/30"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-green-500/30"></div>
        </div>
      </div>
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-hide bg-black/40"
      >
        {logs.length === 0 && <div className="text-gray-600 italic">Sincronização estabelecida. Aguardando gatilhos do motor...</div>}
        {logs.map((log) => (
          <div key={log.id} className="flex gap-3 hover:bg-white/5 p-0.5 rounded transition-colors group">
            <span className="text-gray-600 font-bold shrink-0 opacity-50">[{log.timestamp}]</span>
            <span className={`break-all font-medium leading-relaxed ${getLevelColor(log.level)}`}>
                {log.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Terminal;
