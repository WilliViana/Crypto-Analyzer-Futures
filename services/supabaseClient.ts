
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
// Uses chunked cookies to handle large JWT tokens (>4KB limit per cookie)
// Also syncs to localStorage for reliability (cookies as primary, localStorage as backup)
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const CHUNK_SIZE = 3500; // Safe limit per cookie (below 4KB browser limit)

const CookieStorage = {
    getItem(key: string): string | null {
        if (typeof document === 'undefined') return null;
        try {
            // Try to read chunked cookies first
            const countMatch = document.cookie.match(new RegExp('(^| )' + encodeURIComponent(key + '.count') + '=([^;]+)'));
            if (countMatch) {
                const count = parseInt(decodeURIComponent(countMatch[2]), 10);
                let value = '';
                for (let i = 0; i < count; i++) {
                    const chunkMatch = document.cookie.match(new RegExp('(^| )' + encodeURIComponent(key + '.' + i) + '=([^;]+)'));
                    if (chunkMatch) {
                        value += decodeURIComponent(chunkMatch[2]);
                    } else {
                        // Chunk missing, fall back to localStorage
                        return localStorage.getItem(key);
                    }
                }
                return value || null;
            }
            // Fallback: try single cookie (migration from old format)
            const singleMatch = document.cookie.match(new RegExp('(^| )' + encodeURIComponent(key) + '=([^;]+)'));
            if (singleMatch) return decodeURIComponent(singleMatch[2]);
            // Final fallback: localStorage
            return localStorage.getItem(key);
        } catch {
            return localStorage.getItem(key);
        }
    },
    setItem(key: string, value: string): void {
        if (typeof document === 'undefined') return;
        try {
            const isSecure = location.protocol === 'https:';
            const secureSuffix = isSecure ? '; Secure' : '';

            // Clear old cookies first
            this.removeItem(key);

            // Split value into chunks
            const chunks: string[] = [];
            for (let i = 0; i < value.length; i += CHUNK_SIZE) {
                chunks.push(value.substring(i, i + CHUNK_SIZE));
            }

            // Store chunk count
            document.cookie = `${encodeURIComponent(key + '.count')}=${chunks.length}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax${secureSuffix}`;

            // Store each chunk
            for (let i = 0; i < chunks.length; i++) {
                document.cookie = `${encodeURIComponent(key + '.' + i)}=${encodeURIComponent(chunks[i])}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax${secureSuffix}`;
            }

            // Also sync to localStorage as backup
            localStorage.setItem(key, value);
        } catch {
            // If cookies fail, at least save to localStorage
            localStorage.setItem(key, value);
        }
    },
    removeItem(key: string): void {
        if (typeof document === 'undefined') return;
        try {
            // Remove chunk count
            document.cookie = `${encodeURIComponent(key + '.count')}=; path=/; max-age=0`;
            // Remove up to 10 possible chunks
            for (let i = 0; i < 10; i++) {
                document.cookie = `${encodeURIComponent(key + '.' + i)}=; path=/; max-age=0`;
            }
            // Remove single-value cookie (old format)
            document.cookie = `${encodeURIComponent(key)}=; path=/; max-age=0`;
            // Also remove from localStorage
            localStorage.removeItem(key);
        } catch { /* ignore */ }
    },
};

// Typed Supabase client with cookie-based auth persistence
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'crypto-analyzer-auth',
        storage: CookieStorage,            // Use cookies + localStorage sync
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
