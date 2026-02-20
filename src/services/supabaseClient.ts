
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

// Supabase credentials with hardcoded fallbacks to prevent 'Invalid supabaseUrl' errors
// Vite statically replaces import.meta.env.VITE_* at build time
const FALLBACK_URL = 'https://bhigvgfkttvjibvlyqpl.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoaWd2Z2ZrdHR2amlidmx5cXBsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNDg4NTgsImV4cCI6MjA4MzkyNDg1OH0.t6QoUfSlZcF18Zi6l_ZHivLa8GzZcgITxd0cgnAwn8s';

export const SUPABASE_URL: string = (import.meta as any).env?.VITE_SUPABASE_URL || FALLBACK_URL;
export const SUPABASE_ANON_KEY: string = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || FALLBACK_KEY;

// Clean up any leftover cookies from previous cookie-based storage
// This prevents 494 REQUEST_HEADER_TOO_LARGE errors on Vercel
if (typeof document !== 'undefined') {
    try {
        const cookiesToClear = document.cookie.split(';')
            .map(c => c.trim().split('=')[0])
            .filter(name => name.startsWith('crypto-analyzer'));
        cookiesToClear.forEach(name => {
            document.cookie = `${name}=; path=/; max-age=0`;
        });
        if (cookiesToClear.length > 0) console.log('[AUTH] Cleaned', cookiesToClear.length, 'leftover cookies');
    } catch { /* ignore */ }
}

// Custom fetch wrapper to prevent HTTP/2 connection reuse issues
// Browser keeps stale HTTP/2 connections that Supabase gateway closes → ERR_CONNECTION_CLOSED
const customFetch: typeof fetch = (input, init) => {
    const headers = new Headers(init?.headers);
    headers.set('Cache-Control', 'no-cache');
    return fetch(input, {
        ...init,
        headers,
        cache: 'no-store',
        keepalive: true,
    });
};

// Supabase client — uses localStorage (default) for session persistence
// DO NOT use cookies for auth in SPAs — cookies are sent with every HTTP request
// and large JWTs will cause 494 REQUEST_HEADER_TOO_LARGE errors on Vercel
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'crypto-analyzer-auth',
    },
    global: {
        fetch: customFetch,
    },
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
