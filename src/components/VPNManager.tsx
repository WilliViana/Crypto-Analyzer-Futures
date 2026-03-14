/**
 * VPN Manager — Dashboard de monitoramento VPN
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Shield, ShieldCheck, ShieldAlert, Globe, RefreshCw, Activity, Clock, MapPin, Wifi, WifiOff, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';
import {
  VPNConnectionStatus,
  VPNConfig,
  VPNMetrics,
  VPNEvent,
  VPN_COUNTRIES,
  DEFAULT_VPN_CONFIG,
} from '../types/vpn';
import {
  getVPNConfig,
  updateVPNConfig,
  getVPNStatus,
  getVPNMetrics,
  getVPNEvents,
  startVPNMonitor,
  stopVPNMonitor,
  refreshVPNStatus,
  onVPNStatusChange,
} from '../services/vpnService';

export default function VPNManager() {
  const [config, setConfig] = useState<VPNConfig>(getVPNConfig);
  const [status, setStatus] = useState<VPNConnectionStatus>(getVPNStatus);
  const [metrics, setMetrics] = useState<VPNMetrics>(getVPNMetrics);
  const [events, setEvents] = useState<VPNEvent[]>(getVPNEvents);
  const [refreshing, setRefreshing] = useState(false);
  const [showIP, setShowIP] = useState(false);
  const [showEvents, setShowEvents] = useState(false);

  useEffect(() => {
    const unsub = onVPNStatusChange((s) => {
      setStatus(s);
      setMetrics(getVPNMetrics());
      setEvents(getVPNEvents());
    });
    return unsub;
  }, []);

  const handleToggle = useCallback(() => {
    if (config.enabled) {
      stopVPNMonitor();
      setConfig(updateVPNConfig({ enabled: false }));
    } else {
      startVPNMonitor(config.rotateInterval * 1000);
      setConfig(updateVPNConfig({ enabled: true }));
    }
  }, [config]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshVPNStatus();
    setMetrics(getVPNMetrics());
    setRefreshing(false);
  }, []);

  const handleCountryChange = (countryCode: string) => {
    setConfig(updateVPNConfig({ preferredCountry: countryCode }));
  };

  const stateColor = {
    connected: 'text-green-400',
    disconnected: 'text-red-400',
    connecting: 'text-yellow-400',
    error: 'text-red-500',
    unknown: 'text-gray-400'
  };

  const stateLabel = {
    connected: 'Conectado',
    disconnected: 'Desconectado',
    connecting: 'Conectando...',
    error: 'Erro',
    unknown: 'Desconhecido'
  };

  const countryFlag = VPN_COUNTRIES.find(c => c.code === status.countryCode)?.flag || '🌐';

  return (
    <div className="space-y-4 pb-20">
      {/* Header Card */}
      <div className="bg-[#151A25] border border-[#2A303C] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${config.enabled ? 'bg-green-500/10' : 'bg-gray-500/10'}`}>
              {config.enabled ? <ShieldCheck className="text-green-400" size={24} /> : <ShieldAlert className="text-gray-400" size={24} />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">VPN Monitor</h2>
              <p className="text-xs text-gray-500">Monitoramento de IP e Segurança</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 rounded-lg bg-[#2A303C] hover:bg-[#353C4B] text-gray-400 transition-all"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={handleToggle}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                config.enabled
                  ? 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20'
                  : 'bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/20'
              }`}
            >
              {config.enabled ? 'Parar' : 'Iniciar'}
            </button>
          </div>
        </div>

        {/* Status Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-[#0B0E14] rounded-lg p-3">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
              {status.state === 'connected' ? <Wifi size={12} /> : <WifiOff size={12} />}
              Status
            </div>
            <div className={`text-sm font-bold ${stateColor[status.state]}`}>
              {stateLabel[status.state]}
            </div>
          </div>

          <div className="bg-[#0B0E14] rounded-lg p-3">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
              <Globe size={12} />
              IP
            </div>
            <div className="flex items-center gap-1">
              <span className="text-sm font-mono text-white">
                {showIP ? (status.currentIP || '—') : '••••••••••'}
              </span>
              <button onClick={() => setShowIP(!showIP)} className="text-gray-500 hover:text-gray-300">
                {showIP ? <EyeOff size={12} /> : <Eye size={12} />}
              </button>
            </div>
          </div>

          <div className="bg-[#0B0E14] rounded-lg p-3">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
              <MapPin size={12} />
              Localização
            </div>
            <div className="text-sm text-white">
              {countryFlag} {status.country || '—'} {status.city ? `(${status.city})` : ''}
            </div>
          </div>

          <div className="bg-[#0B0E14] rounded-lg p-3">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
              <Activity size={12} />
              Latência
            </div>
            <div className={`text-sm font-bold ${
              status.latency < 100 ? 'text-green-400' :
              status.latency < 300 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {status.latency > 0 ? `${status.latency}ms` : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Configurações */}
      <div className="bg-[#151A25] border border-[#2A303C] rounded-xl p-5">
        <h3 className="text-sm font-bold text-gray-400 uppercase mb-3">Configurações</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">País Preferido</label>
            <select
              value={config.preferredCountry}
              onChange={(e) => handleCountryChange(e.target.value)}
              className="w-full bg-[#0B0E14] border border-[#2A303C] rounded-lg px-3 py-2 text-sm text-white"
            >
              {VPN_COUNTRIES.map(c => (
                <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Intervalo de Verificação (s)</label>
            <input
              type="number"
              value={config.rotateInterval}
              onChange={(e) => setConfig(updateVPNConfig({ rotateInterval: Math.max(10, parseInt(e.target.value) || 60) }))}
              min={10}
              max={600}
              className="w-full bg-[#0B0E14] border border-[#2A303C] rounded-lg px-3 py-2 text-sm text-white"
            />
          </div>
        </div>
      </div>

      {/* Métricas */}
      <div className="bg-[#151A25] border border-[#2A303C] rounded-xl p-5">
        <h3 className="text-sm font-bold text-gray-400 uppercase mb-3">Métricas</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="text-center">
            <div className="text-2xl font-bold text-cyan-400">{metrics.ipChanges}</div>
            <div className="text-xs text-gray-500">Mudanças de IP</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">{metrics.averageLatency}ms</div>
            <div className="text-xs text-gray-500">Latência Média</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400">{metrics.totalConnections}</div>
            <div className="text-xs text-gray-500">Conexões</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400">{metrics.uptime.toFixed(0)}%</div>
            <div className="text-xs text-gray-500">Uptime</div>
          </div>
        </div>
      </div>

      {/* Histórico de Eventos */}
      <div className="bg-[#151A25] border border-[#2A303C] rounded-xl p-5">
        <button
          onClick={() => setShowEvents(!showEvents)}
          className="flex items-center justify-between w-full text-left"
        >
          <h3 className="text-sm font-bold text-gray-400 uppercase">
            Histórico ({events.length})
          </h3>
          {showEvents ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
        </button>

        {showEvents && (
          <div className="mt-3 max-h-60 overflow-y-auto space-y-1 scrollbar-hide">
            {events.length === 0 ? (
              <p className="text-xs text-gray-600 text-center py-4">Nenhum evento registrado</p>
            ) : (
              events.slice().reverse().map(evt => (
                <div key={evt.id} className="flex items-start gap-2 py-1.5 border-b border-[#2A303C]/50">
                  <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                    evt.type === 'connected' ? 'bg-green-400' :
                    evt.type === 'disconnected' ? 'bg-red-400' :
                    evt.type === 'ip_changed' ? 'bg-yellow-400' :
                    evt.type === 'error' ? 'bg-red-500' : 'bg-purple-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-300 truncate">{evt.details}</p>
                    <p className="text-[10px] text-gray-600">
                      {new Date(evt.timestamp).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
