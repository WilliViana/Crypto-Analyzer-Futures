import React, { useState, useEffect } from 'react';
import { LogEntry } from '../types';
import { FileText, Clock, AlertCircle, CheckCircle, Info, Shield, RefreshCw, Filter, Database } from 'lucide-react';
import { fetchAuditLogs, AuditLogEntry, toLogEntry, AUDIT_ACTIONS } from '../services/auditService';

interface AuditLogProps {
  logs: LogEntry[]; // Legacy local logs
}

const AuditLog: React.FC<AuditLogProps> = ({ logs: localLogs }) => {
  const [supabaseLogs, setSupabaseLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [showSupabase, setShowSupabase] = useState(true);

  useEffect(() => {
    if (showSupabase) {
      loadSupabaseLogs();
    }
  }, [showSupabase]);

  const loadSupabaseLogs = async () => {
    setLoading(true);
    try {
      const data = await fetchAuditLogs(200);
      setSupabaseLogs(data);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const getActionBadge = (action: string) => {
    const colors: Record<string, string> = {
      'SIGNAL_GENERATED': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      'ORDER_PLACED': 'bg-green-500/20 text-green-400 border-green-500/30',
      'ORDER_CLOSED': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'ORDER_FAILED': 'bg-red-500/20 text-red-400 border-red-500/30',
      'STRATEGY_UPDATED': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      'EXCHANGE_CONNECTED': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    };
    return <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${colors[action] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}>{action}</span>;
  };

  // Parse details to extract structured columns
  const parseDetails = (details: any) => {
    if (!details) return { profile: '-', value: '-', pair: '-', extra: '' };

    let parsed = details;
    if (typeof details === 'string') {
      try { parsed = JSON.parse(details); } catch { return { profile: '-', value: '-', pair: '-', extra: details }; }
    }

    const profile = parsed.profileName || parsed.profile || '-';
    const symbol = parsed.symbol || '-';
    const pair = symbol !== '-' ? symbol.replace('USDT', '/USDT').replace('BUSD', '/BUSD') : '-';

    // Value: quantity * price, or just quantity
    let value = '-';
    if (parsed.quantity) {
      value = `${parseFloat(parsed.quantity).toFixed(4)}`;
      if (parsed.leverage) value += ` (${parsed.leverage}x)`;
    }

    // Build extra info string
    const extraParts: string[] = [];
    if (parsed.side) extraParts.push(parsed.side);
    if (parsed.orderId) extraParts.push(`#${parsed.orderId}`);
    if (parsed.error) extraParts.push(`❌ ${parsed.error}`);
    if (parsed.action) extraParts.push(parsed.action);

    return { profile, value, pair, extra: extraParts.join(' | ') };
  };

  // Merge and format logs
  const combinedLogs = showSupabase
    ? supabaseLogs.map(log => {
      const { profile, value, pair, extra } = parseDetails(log.details);
      return {
        id: log.id,
        timestamp: new Date(log.created_at).toLocaleString('pt-BR'),
        level: log.level,
        action: log.action,
        profile,
        value,
        pair,
        message: extra || JSON.stringify(log.details),
        isSupabase: true
      };
    })
    : localLogs.map(log => ({
      ...log,
      action: 'LOCAL',
      profile: '-',
      value: '-',
      pair: '-',
      isSupabase: false
    }));

  const filteredLogs = activeFilter === 'all'
    ? combinedLogs
    : combinedLogs.filter(log => log.action === activeFilter || log.level === activeFilter);

  return (
    <div className="flex flex-col h-full animate-fade-in space-y-4 p-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gray-800/50 rounded-xl border border-gray-700/50">
            <FileText className="text-gray-400" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Logs de Auditoria</h2>
            <p className="text-sm text-gray-500">Eventos do sistema e relatórios de execução.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSupabase(!showSupabase)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${showSupabase ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-gray-700/50 text-gray-400 border border-gray-600'}`}
          >
            <Database size={14} />
            {showSupabase ? 'Supabase' : 'Local'}
          </button>
          <button
            onClick={loadSupabaseLogs}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 transition-all text-xs font-bold border border-white/10"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter size={14} className="text-gray-500" />
        {['all', 'INFO', 'WARN', 'ERROR', 'SUCCESS', 'SIGNAL_GENERATED', 'ORDER_PLACED', 'ORDER_CLOSED'].map(filter => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${activeFilter === filter ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-black/20 text-gray-500 border border-transparent hover:border-gray-600'}`}
          >
            {filter === 'all' ? 'Todos' : filter}
          </button>
        ))}
      </div>

      <div className="bg-[#151A25] border border-[#2A303C] rounded-xl shadow-lg flex-1 overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="bg-black/20 text-xs uppercase font-bold text-gray-500 border-b border-[#2A303C]">
              <tr>
                <th className="p-3 w-36">Horário</th>
                <th className="p-3 w-24">Nível</th>
                <th className="p-3 w-32">Ação</th>
                <th className="p-3 w-28">Perfil</th>
                <th className="p-3 w-28">Par</th>
                <th className="p-3 w-32">Valor</th>
                <th className="p-3">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A303C]/50 font-mono">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-600 italic">
                    {loading ? 'Carregando logs...' : 'Nenhum log encontrado.'}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/5 transition-colors group">
                    <td className="p-3 text-xs text-gray-500 flex items-center gap-1">
                      <Clock size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                      {log.timestamp}
                    </td>
                    <td className="p-3">{getLevelBadge(log.level)}</td>
                    <td className="p-3">{getActionBadge(log.action || 'LOCAL')}</td>
                    <td className="p-3 text-xs">
                      {log.profile !== '-' ? (
                        <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[10px] font-bold">
                          {log.profile}
                        </span>
                      ) : (
                        <span className="text-gray-600">-</span>
                      )}
                    </td>
                    <td className="p-3 text-xs font-bold text-yellow-400">
                      {log.pair !== '-' ? log.pair : <span className="text-gray-600">-</span>}
                    </td>
                    <td className="p-3 text-xs text-cyan-400">
                      {log.value !== '-' ? log.value : <span className="text-gray-600">-</span>}
                    </td>
                    <td className={`p-3 text-xs ${log.level === 'ERROR' ? 'text-red-400' : log.level === 'SUCCESS' ? 'text-green-400' : 'text-gray-300'}`}>
                      {log.message}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Stats Footer */}
        <div className="px-4 py-2 border-t border-[#2A303C] bg-black/20 flex items-center justify-between text-xs text-gray-500">
          <span>Total: {filteredLogs.length} logs</span>
          <span>{showSupabase ? 'Fonte: Supabase' : 'Fonte: Sessão Local'}</span>
        </div>
      </div>
    </div>
  );
};

export default AuditLog;