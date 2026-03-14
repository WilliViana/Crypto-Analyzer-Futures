/**
 * VPN Status — Indicador compacto para a header
 */
import React, { useState, useEffect } from 'react';
import { Shield, ShieldCheck, ShieldAlert } from 'lucide-react';
import { VPNConnectionStatus } from '../types/vpn';
import { getVPNStatus, onVPNStatusChange, getVPNConfig } from '../services/vpnService';

interface VPNStatusProps {
  onClick?: () => void;
}

export default function VPNStatus({ onClick }: VPNStatusProps) {
  const [status, setStatus] = useState<VPNConnectionStatus>(getVPNStatus);
  const config = getVPNConfig();

  useEffect(() => {
    const unsub = onVPNStatusChange(setStatus);
    return unsub;
  }, []);

  if (!config.enabled) {
    return (
      <button
        onClick={onClick}
        className="flex items-center gap-1 px-2 py-1 rounded-md bg-gray-500/10 text-gray-500 hover:bg-gray-500/20 transition-all text-xs"
        title="VPN Monitor Desativado"
      >
        <Shield size={14} />
        <span className="hidden md:inline">VPN</span>
      </button>
    );
  }

  const colors = {
    connected: 'bg-green-500/10 text-green-400 border-green-500/30',
    disconnected: 'bg-red-500/10 text-red-400 border-red-500/30',
    connecting: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    error: 'bg-red-500/10 text-red-500 border-red-500/30',
    unknown: 'bg-gray-500/10 text-gray-400 border-gray-500/30'
  };

  const Icon = status.state === 'connected' ? ShieldCheck : ShieldAlert;

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2 py-1 rounded-md border transition-all text-xs ${colors[status.state]}`}
      title={`IP: ${status.currentIP || '?'} | ${status.country || 'Unknown'} | ${status.latency > 0 ? status.latency + 'ms' : '?'}`}
    >
      <Icon size={14} />
      <span className="hidden md:inline">
        {status.countryCode || 'VPN'}
      </span>
      {status.latency > 0 && (
        <span className="hidden lg:inline text-[10px] opacity-60">
          {status.latency}ms
        </span>
      )}
    </button>
  );
}
