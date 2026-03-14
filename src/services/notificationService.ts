/**
 * Notification Service — Backend de notificações persistentes com IA
 * Categorias, prioridades, ações rápidas e histórico
 */

// ─── Types ───

export type NotificationCategory = 'TRADE' | 'RISK' | 'SYSTEM' | 'AI_INSIGHT' | 'VPN';

export type NotificationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface AppNotification {
  id: string;
  timestamp: Date;
  category: NotificationCategory;
  priority: NotificationPriority;
  title: string;
  message: string;
  read: boolean;
  actionLabel?: string;
  actionCallback?: string; // Nome da ação (executada via dispatcher)
  icon?: string;
  metadata?: Record<string, any>;
}

// ─── State ───

let notifications: AppNotification[] = [];
let listeners: Array<(notifs: AppNotification[]) => void> = [];

const MAX_NOTIFICATIONS = 200;

// ─── Persistência ───

function loadNotifications(): AppNotification[] {
  try {
    const saved = localStorage.getItem('cap_notifications');
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.map((n: any) => ({ ...n, timestamp: new Date(n.timestamp) }));
    }
  } catch { }
  return [];
}

function saveNotifications() {
  localStorage.setItem('cap_notifications', JSON.stringify(notifications.slice(-MAX_NOTIFICATIONS)));
}

function notifyListeners() {
  const snapshot = [...notifications];
  for (const listener of listeners) {
    try { listener(snapshot); } catch { }
  }
}

// ─── Prioridade por categoria ───

const CATEGORY_PRIORITY: Record<NotificationCategory, NotificationPriority> = {
  TRADE: 'HIGH',
  RISK: 'CRITICAL',
  SYSTEM: 'MEDIUM',
  AI_INSIGHT: 'MEDIUM',
  VPN: 'LOW',
};

const CATEGORY_ICONS: Record<NotificationCategory, string> = {
  TRADE: '📊',
  RISK: '⚠️',
  SYSTEM: '⚙️',
  AI_INSIGHT: '🤖',
  VPN: '🔒',
};

// ─── Public API ───

/**
 * Inicializa serviço de notificações
 */
export function initNotificationService() {
  notifications = loadNotifications();
}

/**
 * Adiciona uma notificação
 */
export function addNotification(
  category: NotificationCategory,
  title: string,
  message: string,
  options?: {
    priority?: NotificationPriority;
    actionLabel?: string;
    actionCallback?: string;
    metadata?: Record<string, any>;
  }
): AppNotification {
  const notif: AppNotification = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    timestamp: new Date(),
    category,
    priority: options?.priority || CATEGORY_PRIORITY[category],
    title,
    message,
    read: false,
    icon: CATEGORY_ICONS[category],
    actionLabel: options?.actionLabel,
    actionCallback: options?.actionCallback,
    metadata: options?.metadata,
  };

  notifications = [...notifications.slice(-(MAX_NOTIFICATIONS - 1)), notif];
  saveNotifications();
  notifyListeners();

  // Browser Notification para CRITICAL
  if (notif.priority === 'CRITICAL' && 'Notification' in window && Notification.permission === 'granted') {
    new Notification(`[CAP.PRO] ${title}`, { body: message, icon: '/logo.png' });
  }

  console.log(`[NOTIF] ${notif.icon} [${category}/${notif.priority}] ${title}`);
  return notif;
}

/**
 * Marca notificação como lida
 */
export function markAsRead(id: string) {
  notifications = notifications.map(n => n.id === id ? { ...n, read: true } : n);
  saveNotifications();
  notifyListeners();
}

/**
 * Marca todas como lidas
 */
export function markAllAsRead() {
  notifications = notifications.map(n => ({ ...n, read: true }));
  saveNotifications();
  notifyListeners();
}

/**
 * Remove uma notificação
 */
export function removeNotification(id: string) {
  notifications = notifications.filter(n => n.id !== id);
  saveNotifications();
  notifyListeners();
}

/**
 * Limpa todas as notificações
 */
export function clearAllNotifications() {
  notifications = [];
  saveNotifications();
  notifyListeners();
}

/**
 * Retorna todas as notificações
 */
export function getNotifications(): AppNotification[] {
  if (notifications.length === 0) {
    notifications = loadNotifications();
  }
  return [...notifications];
}

/**
 * Retorna contagem de não-lidas
 */
export function getUnreadCount(): number {
  return notifications.filter(n => !n.read).length;
}

/**
 * Filtra notificações por categoria e/ou prioridade
 */
export function filterNotifications(
  category?: NotificationCategory,
  priority?: NotificationPriority
): AppNotification[] {
  let result = [...notifications];
  if (category) result = result.filter(n => n.category === category);
  if (priority) result = result.filter(n => n.priority === priority);
  return result;
}

/**
 * Request browser notification permission
 */
export function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

/**
 * Subscribe para atualizações
 */
export function onNotificationsChange(cb: (notifs: AppNotification[]) => void): () => void {
  listeners.push(cb);
  return () => { listeners = listeners.filter(l => l !== cb); };
}
