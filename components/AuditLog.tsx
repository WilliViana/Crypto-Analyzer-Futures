import React from 'react';
import { LogEntry } from '../types';
import { FileText, Clock, AlertCircle, CheckCircle, Info, Shield } from 'lucide-react';

interface AuditLogProps {
  logs: LogEntry[];
}

const AuditLog: React.FC<AuditLogProps> = ({ logs }) => {
  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'INFO': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-1"><Info size={10} /> INFO</span>;
      case 'WARN': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 flex items-center gap-1"><AlertCircle size={10} /> WARN</span>;
      case 'ERROR': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1"><AlertCircle size={10} /> ERROR</span>;
      case 'SUCCESS': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/20 text-green-400 border border-green-500/30 flex items-center gap-1"><CheckCircle size={10} /> SUCCESS</span>;
      case 'SYSTEM': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center gap-1"><Shield size={10} /> SYSTEM</span>;
      default: return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-500/20 text-gray-400">{level}</span>;
    }
  };

  return (
    <div className="flex flex-col h-full animate-fade-in space-y-4 p-6">
      <div className="flex items-center gap-3 mb-2">
         <div className="p-3 bg-gray-800/50 rounded-xl border border-gray-700/50">
            <FileText className="text-gray-400" size={24} />
         </div>
         <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">System Audit Logs</h2>
            <p className="text-sm text-gray-500">Real-time system events and execution reports.</p>
         </div>
      </div>

      <div className="bg-[#151A25] border border-[#2A303C] rounded-xl shadow-lg flex-1 overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="bg-black/20 text-xs uppercase font-bold text-gray-500 border-b border-[#2A303C]">
              <tr>
                <th className="p-4 w-40">Time</th>
                <th className="p-4 w-32">Level</th>
                <th className="p-4">Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A303C]/50 font-mono">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-gray-600 italic">No logs recorded in this session.</td>
                </tr>
              ) : (
                [...logs].reverse().map((log) => (
                  <tr key={log.id} className="hover:bg-white/5 transition-colors group">
                    <td className="p-4 text-xs text-gray-500 flex items-center gap-2">
                        <Clock size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        {log.timestamp}
                    </td>
                    <td className="p-4">{getLevelBadge(log.level)}</td>
                    <td className={`p-4 ${log.level === 'ERROR' ? 'text-red-400' : log.level === 'SUCCESS' ? 'text-green-400' : 'text-gray-300'}`}>
                        {log.message}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AuditLog;