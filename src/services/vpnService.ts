/**
 * VPN Service — Monitor de IP/Status para ambiente browser
 * Como é frontend React, não pode fazer proxy real.
 * Funciona como monitor de IP + alerta de mudanças.
 * Proxy real é delegado ao backend (Vercel/Supabase Edge Functions).
 */

import {
  VPNConnectionStatus,
  VPNConfig,
  VPNEvent,
  VPNMetrics,
  DEFAULT_VPN_CONFIG,
  DEFAULT_VPN_STATUS,
} from '../types/vpn';

// ─── State ───

let currentConfig: VPNConfig = { ...DEFAULT_VPN_CONFIG };
let currentStatus: VPNConnectionStatus = { ...DEFAULT_VPN_STATUS };
let events: VPNEvent[] = [];
let metrics: VPNMetrics = {
  totalConnections: 0,
  totalDisconnections: 0,
  averageLatency: 0,
  uptime: 100,
  ipChanges: 0,
};

let monitorInterval: ReturnType<typeof setInterval> | null = null;
let listeners: Array<(status: VPNConnectionStatus) => void> = [];

// ─── Persistência local ───

function loadConfig(): VPNConfig {
  try {
    const saved = localStorage.getItem('cap_vpn_config');
    return saved ? { ...DEFAULT_VPN_CONFIG, ...JSON.parse(saved) } : { ...DEFAULT_VPN_CONFIG };
  } catch {
    return { ...DEFAULT_VPN_CONFIG };
  }
}

function saveConfig(config: VPNConfig) {
  localStorage.setItem('cap_vpn_config', JSON.stringify(config));
}

function loadEvents(): VPNEvent[] {
  try {
    const saved = localStorage.getItem('cap_vpn_events');
    return saved ? JSON.parse(saved).slice(-50) : [];
  } catch {
    return [];
  }
}

function saveEvents(evts: VPNEvent[]) {
  localStorage.setItem('cap_vpn_events', JSON.stringify(evts.slice(-50)));
}

// ─── IP Detection ───

interface IPInfo {
  ip: string;
  country: string;
  countryCode: string;
  city?: string;
  isp?: string;
  isProxy?: boolean;
}

/**
 * Detecta IP externo usando APIs públicas
 */
async function detectExternalIP(): Promise<IPInfo> {
  // Tenta ipapi.co (gratuito, sem chave)
  try {
    const res = await fetch('https://ipapi.co/json/', {
      signal: AbortSignal.timeout(5000)
    });
    if (res.ok) {
      const data = await res.json();
      return {
        ip: data.ip || '',
        country: data.country_name || '',
        countryCode: data.country_code || '',
        city: data.city || '',
        isp: data.org || '',
        isProxy: false
      };
    }
  } catch { /* fallback */ }

  // Fallback: ip-api.com (gratuito)
  try {
    const res = await fetch('http://ip-api.com/json/?fields=status,query,country,countryCode,city,isp,proxy', {
      signal: AbortSignal.timeout(5000)
    });
    if (res.ok) {
      const data = await res.json();
      if (data.status === 'success') {
        return {
          ip: data.query || '',
          country: data.country || '',
          countryCode: data.countryCode || '',
          city: data.city || '',
          isp: data.isp || '',
          isProxy: data.proxy || false
        };
      }
    }
  } catch { /* fallback */ }

  // Último fallback: simples
  try {
    const res = await fetch('https://api.ipify.org?format=json', {
      signal: AbortSignal.timeout(5000)
    });
    if (res.ok) {
      const data = await res.json();
      return { ip: data.ip || '', country: '', countryCode: '', isProxy: false };
    }
  } catch { /* nada */ }

  return { ip: 'unknown', country: '', countryCode: '', isProxy: false };
}

/**
 * Mede latência para um endpoint
 */
async function measureLatency(url: string = 'https://api.binance.com/api/v3/time'): Promise<number> {
  const start = performance.now();
  try {
    await fetch(url, { signal: AbortSignal.timeout(5000), method: 'HEAD' });
    return Math.round(performance.now() - start);
  } catch {
    return -1;
  }
}

// ─── Core Functions ───

function addEvent(type: VPNEvent['type'], details: string, extra?: Partial<VPNEvent>) {
  const evt: VPNEvent = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    timestamp: new Date(),
    type,
    details,
    ...extra
  };
  events = [...events.slice(-49), evt];
  saveEvents(events);
  console.log(`[VPN] ${type}: ${details}`);
}

function notifyListeners() {
  for (const listener of listeners) {
    try { listener({ ...currentStatus }); } catch { }
  }
}

/**
 * Verifica status atual do IP e atualiza
 */
async function checkStatus(): Promise<VPNConnectionStatus> {
  try {
    const [ipInfo, latency] = await Promise.all([
      detectExternalIP(),
      measureLatency()
    ]);

    const previousIP = currentStatus.currentIP;

    currentStatus = {
      state: ipInfo.ip ? 'connected' : 'error',
      currentIP: ipInfo.ip,
      country: ipInfo.country,
      countryCode: ipInfo.countryCode,
      city: ipInfo.city,
      isp: ipInfo.isp,
      latency: latency > 0 ? latency : currentStatus.latency,
      isVPN: ipInfo.isProxy || false,
      provider: currentConfig.provider,
      connectedSince: currentStatus.connectedSince || new Date()
    };

    // Detecta mudança de IP
    if (previousIP && previousIP !== ipInfo.ip && previousIP !== '') {
      metrics.ipChanges++;
      metrics.lastIPChange = new Date();
      addEvent('ip_changed', `IP mudou de ${previousIP} para ${ipInfo.ip}`, {
        previousIP,
        newIP: ipInfo.ip,
        country: ipInfo.country
      });
    }

    // Atualiza latência média
    if (latency > 0) {
      metrics.averageLatency = metrics.averageLatency === 0
        ? latency
        : Math.round((metrics.averageLatency * 0.8) + (latency * 0.2));
    }

    notifyListeners();
    return { ...currentStatus };
  } catch (err: any) {
    console.error('[VPN] Check status error:', err.message);
    currentStatus.state = 'error';
    notifyListeners();
    return { ...currentStatus };
  }
}

// ─── Public API ───

export function getVPNConfig(): VPNConfig {
  if (currentConfig.provider === 'none' && !currentConfig.enabled) {
    currentConfig = loadConfig();
    events = loadEvents();
  }
  return { ...currentConfig };
}

export function updateVPNConfig(update: Partial<VPNConfig>): VPNConfig {
  currentConfig = { ...currentConfig, ...update };
  saveConfig(currentConfig);
  return { ...currentConfig };
}

export function getVPNStatus(): VPNConnectionStatus {
  return { ...currentStatus };
}

export function getVPNMetrics(): VPNMetrics {
  return { ...metrics };
}

export function getVPNEvents(): VPNEvent[] {
  if (events.length === 0) events = loadEvents();
  return [...events];
}

/**
 * Inicia monitoramento periódico de IP
 */
export function startVPNMonitor(intervalMs: number = 60000): void {
  if (monitorInterval) return; // Já ativo

  console.log(`[VPN] Monitor iniciado (intervalo: ${intervalMs / 1000}s)`);
  addEvent('connected', 'Monitor de IP iniciado');
  metrics.totalConnections++;

  // Check imediato
  checkStatus();

  monitorInterval = setInterval(() => {
    checkStatus();
  }, intervalMs);
}

/**
 * Para o monitoramento
 */
export function stopVPNMonitor(): void {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
    addEvent('disconnected', 'Monitor de IP parado');
    metrics.totalDisconnections++;
    console.log('[VPN] Monitor parado');
  }
}

/**
 * Força refresh do IP
 */
export async function refreshVPNStatus(): Promise<VPNConnectionStatus> {
  return await checkStatus();
}

/**
 * Registra listener para mudanças de status
 */
export function onVPNStatusChange(callback: (status: VPNConnectionStatus) => void): () => void {
  listeners.push(callback);
  return () => {
    listeners = listeners.filter(l => l !== callback);
  };
}

/**
 * Inicializa VPN Manager
 */
export function initVPNService(): void {
  currentConfig = loadConfig();
  events = loadEvents();

  if (currentConfig.enabled) {
    startVPNMonitor(currentConfig.rotateInterval * 1000);
  }
}
