
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

// Safe access to environment variables to prevent runtime crashes
// Supports both Vite (import.meta.env) and Node.js (process.env)
const getEnv = (key: string, fallback: string): string => {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env[key]) {
        return (import.meta as any).env[key];
    }
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
        return process.env[key] as string;
    }
    return fallback;
};

// Use environment variables if available, otherwise fallback to the provided keys.
export const SUPABASE_URL = getEnv('VITE_SUPABASE_URL', 'https://bhigvgfkttvjibvlyqpl.supabase.co');
export const SUPABASE_ANON_KEY = getEnv('VITE_SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoaWd2Z2ZrdHR2amlidmx5cXBsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNDg4NTgsImV4cCI6MjA4MzkyNDg1OH0.t6QoUfSlZcF18Zi6l_ZHivLa8GzZcgITxd0cgnAwn8s');

// Cookie-based storage adapter for Supabase auth
// Stores session in cookies like modern web apps (survives across tabs, more reliable than localStorage)
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days in seconds

const CookieStorage = {
    getItem(key: string): string | null {
        if (typeof document === 'undefined') return null;
        const match = document.cookie.match(new RegExp('(^| )' + encodeURIComponent(key) + '=([^;]+)'));
        return match ? decodeURIComponent(match[2]) : null;
    },
    setItem(key: string, value: string): void {
        if (typeof document === 'undefined') return;
        const isSecure = location.protocol === 'https:';
        document.cookie = `${encodeURIComponent(key)}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax${isSecure ? '; Secure' : ''}`;
    },
    removeItem(key: string): void {
        if (typeof document === 'undefined') return;
        document.cookie = `${encodeURIComponent(key)}=; path=/; max-age=0`;
    },
};

// Migrate existing localStorage session to cookies (one-time)
const migrateLocalStorageToCookies = () => {
    const LS_KEY = 'crypto-analyzer-auth';
    try {
        const existing = localStorage.getItem(LS_KEY);
        if (existing && !CookieStorage.getItem(LS_KEY)) {
            CookieStorage.setItem(LS_KEY, existing);
            localStorage.removeItem(LS_KEY);
            console.log('[AUTH] Migrated session from localStorage to cookies');
        }
    } catch { /* SSR or restricted env */ }
};
migrateLocalStorageToCookies();

// Typed Supabase client with cookie-based auth persistence
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'crypto-analyzer-auth',
        storage: CookieStorage,            // Use cookies instead of localStorage
    }
});

// Helper function to get user profile
export const getUserProfile = async (userId: string) => {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
    return { data, error };
};

// Helper to check if user is admin (uses RPC function)
export const isUserAdmin = async (): Promise<boolean> => {
    try {
        const { data, error } = await supabase.rpc('is_admin_user');
        return !error && data === true;
    } catch {
        return false;
    }
};

// Helper to fetch all profiles (for admin)
export const getAllProfiles = async () => {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
    return { data: data || [], error };
};

// Helper to fetch audit logs (for admin)
export const getAuditLogs = async (limit: number = 10) => {
    const { data, error } = await supabase
        .from('auth_audit')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
    return { data: data || [], error };
};
