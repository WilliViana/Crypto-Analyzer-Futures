-- CHECK AND FIX AUDIT_LOGS TABLE
-- 1. Ensure table exists
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    level TEXT DEFAULT 'INFO',
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- 2. Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
-- 3. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users own audit_logs" ON audit_logs;
DROP POLICY IF EXISTS "Service role can insert audit logs" ON audit_logs;
-- 4. Re-create policies
-- Allow users to view their own logs
CREATE POLICY "Users own audit_logs" ON audit_logs FOR
SELECT USING (auth.uid() = user_id);
-- Allow service role (Edge Functions) to insert logs
CREATE POLICY "Service role can insert audit logs" ON audit_logs FOR
INSERT WITH CHECK (true);
-- Allow users to insert their own logs (for client-side logging if needed)
CREATE POLICY "Users can insert own logs" ON audit_logs FOR
INSERT WITH CHECK (auth.uid() = user_id);
-- 5. Create indexes
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
-- 6. Insert a test log to verify functionality
-- This will only work if run from SQL Editor (which has admin privileges)
-- We can't insert for a specific user without their ID, so we skip the test insert here
-- and rely on the policy fixes.