-- Create table for storing portfolio history
CREATE TABLE IF NOT EXISTS balance_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    total_balance NUMERIC NOT NULL,
    unrealized_pnl NUMERIC DEFAULT 0,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);
-- Enable RLS
ALTER TABLE balance_history ENABLE ROW LEVEL SECURITY;
-- Policy: Users can only see their own history
CREATE POLICY "Users own balance history" ON balance_history FOR ALL USING (auth.uid() = user_id);
-- Index for faster querying by time
CREATE INDEX idx_balance_history_user_time ON balance_history(user_id, timestamp DESC);