-- Enable RLS and create policies for all user data tables
-- ============================================================
-- 1. EXCHANGES
-- ============================================================
create table if not exists exchanges (
    id uuid primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    name text,
    type text,
    api_key text,
    api_secret text,
    is_testnet boolean default false,
    status text,
    created_at timestamptz default now()
);
alter table exchanges enable row level security;
create policy "Users can view own exchanges" on exchanges for
select using (auth.uid() = user_id);
create policy "Users can insert own exchanges" on exchanges for
insert with check (auth.uid() = user_id);
create policy "Users can update own exchanges" on exchanges for
update using (auth.uid() = user_id);
create policy "Users can delete own exchanges" on exchanges for delete using (auth.uid() = user_id);
-- ============================================================
-- 2. STRATEGIES
-- ============================================================
create table if not exists strategies (
    id text primary key,
    -- Strategy IDs are strings like 'SAFE', 'custom_123'
    user_id uuid references auth.users(id) on delete cascade not null,
    name text,
    description text,
    active boolean default false,
    risk_level text,
    confidence_threshold numeric,
    leverage numeric,
    capital numeric,
    stop_loss numeric,
    take_profit numeric,
    max_drawdown numeric,
    config jsonb default '{}'::jsonb,
    settings jsonb default '{}'::jsonb,
    updated_at timestamptz default now()
);
alter table strategies enable row level security;
create policy "Users can view own strategies" on strategies for
select using (auth.uid() = user_id);
create policy "Users can insert own strategies" on strategies for
insert with check (auth.uid() = user_id);
create policy "Users can update own strategies" on strategies for
update using (auth.uid() = user_id);
create policy "Users can delete own strategies" on strategies for delete using (auth.uid() = user_id);
-- ============================================================
-- 3. TRADE LOGS
-- ============================================================
create table if not exists trade_logs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    exchange_id text,
    symbol text,
    side text,
    amount numeric,
    entry_price numeric,
    exit_price numeric,
    pnl numeric,
    status text,
    strategy_id text,
    strategy_name text,
    client_order_id text,
    created_at timestamptz default now()
);
alter table trade_logs enable row level security;
create policy "Users can view own trade logs" on trade_logs for
select using (auth.uid() = user_id);
create policy "Users can insert own trade logs" on trade_logs for
insert with check (auth.uid() = user_id);
create policy "Users can update own trade logs" on trade_logs for
update using (auth.uid() = user_id);
-- ============================================================
-- 4. USER SETTINGS
-- ============================================================
create table if not exists user_settings (
    user_id uuid references auth.users(id) on delete cascade not null primary key,
    selected_pairs jsonb default '["BTCUSDT"]'::jsonb,
    -- Storing as JSON array or text array
    is_running boolean default false,
    updated_at timestamptz default now()
);
-- Note: schema in syncService suggests specific columns, but arrays can be tricky.
-- syncService expects: selected_pairs (text[] or json)
-- Ideally use text[] if supported, but JSONB is safer for flexibility.
-- Let's check syncService usage: .from('user_settings').upsert(...)
-- It sends { selected_pairs: string[] }
-- Postgres text[] is compatible.
alter table user_settings enable row level security;
create policy "Users can view own settings" on user_settings for
select using (auth.uid() = user_id);
create policy "Users can insert own settings" on user_settings for
insert with check (auth.uid() = user_id);
create policy "Users can update own settings" on user_settings for
update using (auth.uid() = user_id);
-- ============================================================
-- 5. BALANCE HISTORY (Ensure policies exist)
-- ============================================================
-- Assuming table exists from balance_history.sql, but ensuring policies:
alter table balance_history enable row level security;
drop policy if exists "Users can view own balance history" on balance_history;
create policy "Users can view own balance history" on balance_history for
select using (auth.uid() = user_id);
drop policy if exists "Users/Service can insert balance history" on balance_history;
create policy "Users can insert balance history" on balance_history for
insert with check (auth.uid() = user_id);
-- Note: Service role (Edge Function) bypasses RLS, so this policy is for client-side or constrained access.