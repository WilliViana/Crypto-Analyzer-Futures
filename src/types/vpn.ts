/**
 * VPN Types — Tipos e interfaces para o VPN Manager
 */

export type VPNProviderType = 'mullvad' | 'tor' | 'custom' | 'none';

export type VPNConnectionState = 'connected' | 'disconnected' | 'connecting' | 'error' | 'unknown';

export interface VPNServer {
  id: string;
  country: string;
  countryCode: string;
  city?: string;
  hostname?: string;
  latency?: number; // ms
  load?: number; // 0-100%
}

export interface VPNConfig {
  enabled: boolean;
  provider: VPNProviderType;
  preferredCountry: string;
  autoConnect: boolean;
  rotateInterval: number; // minutos entre rotações de IP
  killSwitch: boolean;
  servers: VPNServer[];
}

export interface VPNConnectionStatus {
  state: VPNConnectionState;
  currentIP: string;
  country: string;
  countryCode: string;
  city?: string;
  isp?: string;
  latency: number; // ms
  connectedSince?: Date;
  isVPN: boolean; // detecta se está usando VPN
  provider: VPNProviderType;
}

export interface VPNMetrics {
  totalConnections: number;
  totalDisconnections: number;
  averageLatency: number;
  uptime: number; // porcentagem
  ipChanges: number;
  lastIPChange?: Date;
}

export interface VPNEvent {
  id: string;
  timestamp: Date;
  type: 'connected' | 'disconnected' | 'ip_changed' | 'error' | 'country_changed';
  details: string;
  previousIP?: string;
  newIP?: string;
  country?: string;
}

export const DEFAULT_VPN_CONFIG: VPNConfig = {
  enabled: false,
  provider: 'none',
  preferredCountry: 'US',
  autoConnect: false,
  rotateInterval: 30,
  killSwitch: false,
  servers: []
};

export const DEFAULT_VPN_STATUS: VPNConnectionStatus = {
  state: 'unknown',
  currentIP: '',
  country: '',
  countryCode: '',
  latency: 0,
  isVPN: false,
  provider: 'none'
};

// Lista de países disponíveis
export const VPN_COUNTRIES = [
  { code: 'US', name: 'Estados Unidos', flag: '🇺🇸' },
  { code: 'GB', name: 'Reino Unido', flag: '🇬🇧' },
  { code: 'DE', name: 'Alemanha', flag: '🇩🇪' },
  { code: 'NL', name: 'Holanda', flag: '🇳🇱' },
  { code: 'CH', name: 'Suíça', flag: '🇨🇭' },
  { code: 'SG', name: 'Singapura', flag: '🇸🇬' },
  { code: 'JP', name: 'Japão', flag: '🇯🇵' },
  { code: 'CA', name: 'Canadá', flag: '🇨🇦' },
  { code: 'AU', name: 'Austrália', flag: '🇦🇺' },
  { code: 'SE', name: 'Suécia', flag: '🇸🇪' },
  { code: 'BR', name: 'Brasil', flag: '🇧🇷' },
];
