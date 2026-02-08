import { supabase } from './supabaseClient';
import { LogEntry } from '../types';

export interface AuditLogEntry {
    id: string;
    user_id: string;
    action: string;
    level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
    details: Record<string, any>;
    created_at: string;
}

/**
 * Add a new audit log entry
 */
export const addAuditLog = async (
    action: string,
    level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS' = 'INFO',
    details: Record<string, any> = {}
): Promise<void> => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) return;

        await supabase.from('audit_logs').insert({
            user_id: session.user.id,
            action,
            level,
            details
        });
    } catch (error) {
        console.error('[AUDIT] Failed to save log:', error);
    }
};

/**
 * Fetch audit logs for current user
 */
export const fetchAuditLogs = async (
    limit: number = 100,
    offset: number = 0
): Promise<AuditLogEntry[]> => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) return [];

        const { data, error } = await supabase
            .from('audit_logs')
            .select('*')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('[AUDIT] Failed to fetch logs:', error);
        return [];
    }
};

/**
 * Fetch audit logs by action type
 */
export const fetchAuditLogsByAction = async (
    action: string,
    limit: number = 50
): Promise<AuditLogEntry[]> => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) return [];

        const { data, error } = await supabase
            .from('audit_logs')
            .select('*')
            .eq('user_id', session.user.id)
            .eq('action', action)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('[AUDIT] Failed to fetch logs by action:', error);
        return [];
    }
};

/**
 * Convert AuditLogEntry to LogEntry for UI compatibility
 */
export const toLogEntry = (audit: AuditLogEntry): LogEntry => ({
    id: audit.id,
    timestamp: audit.created_at,
    level: audit.level,
    message: `[${audit.action}] ${JSON.stringify(audit.details)}`
});

/**
 * Predefined actions for type safety
 */
export const AUDIT_ACTIONS = {
    SIGNAL_GENERATED: 'SIGNAL_GENERATED',
    ORDER_PLACED: 'ORDER_PLACED',
    ORDER_CLOSED: 'ORDER_CLOSED',
    ORDER_FAILED: 'ORDER_FAILED',
    STRATEGY_UPDATED: 'STRATEGY_UPDATED',
    STRATEGY_ACTIVATED: 'STRATEGY_ACTIVATED',
    STRATEGY_DEACTIVATED: 'STRATEGY_DEACTIVATED',
    EXCHANGE_CONNECTED: 'EXCHANGE_CONNECTED',
    EXCHANGE_DISCONNECTED: 'EXCHANGE_DISCONNECTED',
    USER_LOGIN: 'USER_LOGIN',
    USER_LOGOUT: 'USER_LOGOUT',
    SETTINGS_CHANGED: 'SETTINGS_CHANGED'
} as const;
