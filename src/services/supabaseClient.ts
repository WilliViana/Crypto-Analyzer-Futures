
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

// Supabase credentials
const DIRECT_SUPABASE_URL = 'https://bhigvgfkttvjibvlyqpl.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoaWd2Z2ZrdHR2amlidmx5cXBsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNDg4NTgsImV4cCI6MjA4MzkyNDg1OH0.t6QoUfSlZcF18Zi6l_ZHivLa8GzZcgITxd0cgnAwn8s';

// Detect environment
const isDev = typeof window === 'undefined' || (import.meta as any).env?.DEV === true;

// In PRODUCTION: use Vercel serverless proxy (/api/supabase)
// Reason: user's network/ISP blocks Supabase REST calls after CORS preflight
// (OPTIONS returns 200 but GET/POST never arrives — confirmed via Supabase logs)
// The proxy makes the request server-side from Vercel, bypassing the local network block
export const SUPABASE_URL: string = isDev
    ? DIRECT_SUPABASE_URL
    : `${window.location.origin}/api/supabase`;
export const SUPABASE_ANON_KEY: string = ANON_KEY;

// Supabase client — uses localStorage for session persistence
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'crypto-analyzer-auth',
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
