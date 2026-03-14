/**
 * Notification Center — Painel lateral de notificações
 */
import React, { useState, useEffect } from 'react';
import { Bell, X, Check, CheckCheck, Trash2, Filter, AlertTriangle, Bot, Activity, Shield, Settings2 } from 'lucide-react';
import {
  AppNotification,
  NotificationCategory,
  getNotifications,
  markAsRead,
  markAllAsRead,
  removeNotification,
  clearAllNotifications,
  getUnreadCount,
  onNotificationsChange,
  requestNotificationPermission,
} from '../services/notificationService';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORY_COLORS: Record<NotificationCategory, string> = {
  TRADE: 'text-cyan-400 bg-cyan-500/10',
  RISK: 'text-red-400 bg-red-500/10',
  SYSTEM: 'text-gray-400 bg-gray-500/10',
  AI_INSIGHT: 'text-purple-400 bg-purple-500/10',
  VPN: 'text-green-400 bg-green-500/10',
};

const CATEGORY_ICONS: Record<NotificationCategory, React.ReactNode> = {
  TRADE: <Activity size={14} />,
  RISK: <AlertTriangle size={14} />,
  SYSTEM: <Settings2 size={14} />,
  AI_INSIGHT: <Bot size={14} />,
  VPN: <Shield size={14} />,
};

const PRIORITY_COLORS = {
  LOW: 'border-l-gray-600',
  MEDIUM: 'border-l-blue-500',
  HIGH: 'border-l-yellow-500',
  CRITICAL: 'border-l-red-500',
};

export default function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<AppNotification[]>(getNotifications);
  const [filter, setFilter] = useState<NotificationCategory | null>(null);

  useEffect(() => {
    requestNotificationPermission();
    const unsub = onNotificationsChange(setNotifications);
    return unsub;
  }, []);

  if (!isOpen) return null;

  const filtered = filter ? notifications.filter(n => n.category === filter) : notifications;
  const sorted = [...filtered].reverse(); // Mais recentes primeiro
  const unreadCount = getUnreadCount();

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/40 z-[200]" onClick={onClose} />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-[#0B0E14] border-l border-[#2A303C] z-[201] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2A303C]">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-cyan-400" />
            <h2 className="text-sm font-bold text-white">Notificações</h2>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 rounded-full text-[10px] font-bold">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => markAllAsRead()} className="p-1.5 rounded text-gray-500 hover:text-gray-300 hover:bg-white/5" title="Marcar tudo como lido">
              <CheckCheck size={16} />
            </button>
            <button onClick={() => clearAllNotifications()} className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-red-500/10" title="Limpar tudo">
              <Trash2 size={16} />
            </button>
            <button onClick={onClose} className="p-1.5 rounded text-gray-500 hover:text-white hover:bg-white/5" title="Fechar">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-1 px-3 py-2 border-b border-[#2A303C]/50 overflow-x-auto">
          <button
            onClick={() => setFilter(null)}
            className={`px-2 py-1 rounded text-[10px] font-bold uppercase whitespace-nowrap ${!filter ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Todas ({notifications.length})
          </button>
          {(['TRADE', 'RISK', 'AI_INSIGHT', 'SYSTEM', 'VPN'] as NotificationCategory[]).map(cat => {
            const count = notifications.filter(n => n.category === cat).length;
            if (count === 0) return null;
            return (
              <button
                key={cat}
                onClick={() => setFilter(filter === cat ? null : cat)}
                className={`px-2 py-1 rounded text-[10px] font-bold uppercase whitespace-nowrap flex items-center gap-1 ${filter === cat ? CATEGORY_COLORS[cat] : 'text-gray-500 hover:text-gray-300'}`}
              >
                {CATEGORY_ICONS[cat]} {cat} ({count})
              </button>
            );
          })}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-600">
              <Bell size={40} className="mb-2 opacity-30" />
              <p className="text-sm">Nenhuma notificação</p>
            </div>
          ) : (
            sorted.map(notif => (
              <div
                key={notif.id}
                className={`px-4 py-3 border-b border-[#2A303C]/30 border-l-2 ${PRIORITY_COLORS[notif.priority]} hover:bg-white/[0.02] transition-all ${!notif.read ? 'bg-white/[0.03]' : ''}`}
                onClick={() => { if (!notif.read) markAsRead(notif.id); }}
              >
                <div className="flex items-start gap-2">
                  <div className={`mt-0.5 p-1 rounded ${CATEGORY_COLORS[notif.category]}`}>
                    {CATEGORY_ICONS[notif.category]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-xs font-bold truncate ${notif.read ? 'text-gray-400' : 'text-white'}`}>
                        {notif.title}
                      </p>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeNotification(notif.id); }}
                        className="text-gray-600 hover:text-red-400 p-0.5"
                      >
                        <X size={12} />
                      </button>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{notif.message}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] text-gray-600">
                        {new Date(notif.timestamp).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                      </span>
                      {!notif.read && <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
