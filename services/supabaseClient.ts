
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

// Safe access to environment variables to prevent runtime crashes
// if import.meta.env is undefined in certain environments.
const env = (import.meta as any).env || {};

// Use environment variables if available, otherwise fallback to the provided keys.
export const SUPABASE_URL = env.VITE_SUPABASE_URL || 'https://bhigvgfkttvjibvlyqpl.supabase.co';
export const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_evRIn3L9b9XfvcfC6sCe2g_gjpkne1i';

// Typed Supabase client with auth persistence enabled
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,        // Store session in localStorage
        autoRefreshToken: true,      // Auto-refresh tokens before expiry
        detectSessionInUrl: true,    // Handle OAuth redirects
        storageKey: 'crypto-analyzer-auth', // Unique storage key
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
