
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

// Supabase credentials
const DIRECT_SUPABASE_URL = 'https://bhigvgfkttvjibvlyqpl.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoaWd2Z2ZrdHR2amlidmx5cXBsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNDg4NTgsImV4cCI6MjA4MzkyNDg1OH0.t6QoUfSlZcF18Zi6l_ZHivLa8GzZcgITxd0cgnAwn8s';

const isDev = typeof window === 'undefined' || (import.meta as any).env?.DEV === true;

// In PRODUCTION: all requests go as POST to /api/supabase (body contains the real URL/method/headers)
// This bypasses ISP/WAF that blocks GET requests with SQL-like query params (select=*, eq.)
const PROXY_ENDPOINT = typeof window !== 'undefined' ? `${window.location.origin}/api/supabase` : '';

const proxyFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const method = init?.method || 'GET';
    const headers: Record<string, string> = {};

    if (init?.headers) {
        if (init.headers instanceof Headers) {
            init.headers.forEach((v, k) => { headers[k] = v; });
        } else if (Array.isArray(init.headers)) {
            init.headers.forEach(([k, v]) => { headers[k] = v; });
        } else {
            Object.assign(headers, init.headers);
        }
    }

    // Send everything as a simple POST to the proxy — no query params in the URL
    const res = await fetch(PROXY_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            targetUrl: url,
            targetMethod: method,
            targetHeaders: headers,
            targetBody: init?.body || null,
        }),
    });

    return res;
};

export const SUPABASE_URL: string = DIRECT_SUPABASE_URL;
export const SUPABASE_ANON_KEY: string = ANON_KEY;

// In production, use proxyFetch to route all traffic through serverless proxy as POST
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'crypto-analyzer-auth',
    },
    global: isDev ? {} : { fetch: proxyFetch },
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
