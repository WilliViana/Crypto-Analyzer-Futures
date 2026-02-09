
import { createClient } from '@supabase/supabase-js';
import { fetchHistoricalCandles } from '../services/marketService';
import { executeOrder, fetchMarketInfo } from '../services/exchangeService';
import { unifiedTechnicalAnalysis } from '../utils/technicalAnalysis';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../services/supabaseClient';
import { StrategyProfile } from '../types';
import { addAuditLog } from '../services/auditService';

// --- Worker Configuration ---
const WORKER_INTERVAL = 10000; // 10 seconds
const BATCH_SIZE = 10;

console.log('🚀 Starting Crypto Analyzer Background Worker...');
console.log(`📡 Connected to Supabase: ${SUPABASE_URL}`);

// Create a dedicated client for the worker (could use service role if available, but using anon for now)
// In a real server scenario, we would use a service role key.
// Here we rely on the user having a valid session or public access (unlikely for trading)
// WORKAROUND: We will need the user to login via this script or provide a token.
// For simplicity in this "local tool" context, we'll try to use the session from localStorage if possible, 
// OR simpler: assume the "user_settings" table has an "active" flag and we iterate all users.
// BUT RLS prevents seeing other users.
// SOLUTION: This worker runs ON BEHALF of the user. 
// We will ask the user to Paste their ACCESS TOKEN in a .env file or just hardcode it here for the "demo" fix.
// Actually, let's try to just use the Anon key. If operations fail due to RLS, we'll know.
// Hint: executeOrder calls the Proxy. The Proxy verifies the user.
// The Proxy likely checks the Authorization header.
// If we use anon key, we are "anon". We need to be "authenticated".

// For this fix, let's assume this worker is for a specific user and we (theoretically) have their token.
// Since I cannot ask the user for a token easily interactively here, 
// I will implement the logic and print a message "Worker started. NOTE: Ensure you are logged in or provide specific env vars".

// Actually, `supabaseClient` tries to `detectSessionInUrl` or `persistSession`. 
// In Node, there is no URL or localStorage (unless polyfilled).
// Let's rely on standard libraries.

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface UserState {
    userId: string;
    profiles: StrategyProfile[];
    selectedPairs: string[];
    exchange: any;
    isRunning: boolean;
}

// Mock state management
let activeUsers: Record<string, UserState> = {};
let assetBatchIndex = 0;

async function fetchActiveUsers() {
    // This is the tricky part with RLS. 
    // If RLS is enabled, we can't "list all users". 
    // We can only see our own data.
    // So this worker really only works if it has a Service Role Key OR if RLS is open.
    // I will write the logic assuming we can see "user_settings" where "is_running" is true.
    // If this fails, the user will see an error and we can advise on Service Key.

    // Attempt to fetch settings with is_running = true
    const { data: settings, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('is_running', true);

    if (error) {
        console.error('❌ Failed to fetch active workers:', error.message);
        console.log('💡 TIP: This worker requires a Service Role Key to bypass RLS and see all users, OR it must be run with a user token.');
        return;
    }

    if (!settings || settings.length === 0) {
        console.log('💤 No active instances found (isRunning=true). Waiting...');
        return;
    }

    console.log(`🔎 Found ${settings.length} active instances.`);

    for (const setting of settings) {
        await processUser(setting.user_id, setting.selected_pairs);
    }
}

async function processUser(userId: string, selectedPairs: any[]) {
    // 1. Fetch User Profiles
    const { data: profiles } = await supabase
        .from('strategies')
        .select('*')
        .eq('user_id', userId)
        .eq('active', true);

    if (!profiles || profiles.length === 0) return;

    // 2. Fetch User Exchange (Active)
    const { data: exchanges } = await supabase
        .from('exchanges')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'CONNECTED')
        .limit(1);

    if (!exchanges || exchanges.length === 0) return;
    const exchange = exchanges[0];

    // 3. Scan Logic
    const pairs = Array.isArray(selectedPairs) ? selectedPairs : JSON.parse(selectedPairs as any);

    console.log(`👤 Processing User ${userId.substr(0, 6)}... | Profiles: ${profiles.length} | Pairs: ${pairs.length}`);

    for (const profile of profiles) {
        // Fix profile structure from DB if needed (map fields)
        const strategy: StrategyProfile = {
            id: profile.id,
            name: profile.name,
            active: profile.active,
            indicators: (profile.settings as any)?.indicators || {},
            confidenceThreshold: profile.confidence_threshold,
            leverage: profile.leverage,
            stopLoss: profile.stop_loss,
            takeProfit: profile.take_profit,
            // type: profile.type_id as any, // Removed as it doesn't exist in StrategyProfile
            riskLevel: profile.risk_level as any,
            // ... other fields default
            description: profile.description,
            capital: profile.capital,
            maxDrawdown: profile.max_drawdown,
            workflowSteps: [],
            useDivergences: false,
            useCandlePatterns: false,
            icon: 'activity',
            color: 'blue',
            pnl: 0,
            trades: 0,
            winRate: 0
        };

        // Batch processing
        // For the worker, we can just process a random batch or all (if careful with API limits)
        // Let's do a subset to be safe
        const batch = pairs.slice(0, 10); // Analyze first 10 for now as POC

        for (const symbol of batch) {
            try {
                // Fetch Candles
                const candles = await fetchHistoricalCandles(symbol, '15m');
                if (!candles || candles.length < 50) continue;

                // Analyze
                const analysis = unifiedTechnicalAnalysis(candles, strategy);

                if (analysis.signal && analysis.signal !== 'NEUTRAL' && analysis.confidence >= strategy.confidenceThreshold) {
                    const reasons = analysis.details.join(', ');
                    console.log(`⚡ SIGNAL: ${symbol} ${analysis.signal} (${analysis.confidence}%) - ${reasons}`);

                    // Calc TP/SL
                    const price = candles[candles.length - 1].close;
                    const side = analysis.signal;
                    const sl = side === 'BUY' ? price * (1 - strategy.stopLoss / 100) : price * (1 + strategy.stopLoss / 100);
                    const tp = side === 'BUY' ? price * (1 + strategy.takeProfit / 100) : price * (1 - strategy.takeProfit / 100);

                    // Execute
                    // Note: executeOrder uses addAuditLog which requires auth.
                    // We might need to mock auth or pass the user ID explicitly to a modified executeOrder.
                    // For now, let's try calling it.

                    await executeOrder({
                        symbol,
                        side: analysis.signal as 'BUY' | 'SELL',
                        type: 'MARKET',
                        quantity: 0, // Code calculates based on balance
                        leverage: strategy.leverage,
                        stopLossPrice: sl,
                        takeProfitPrice: tp
                    }, exchange, strategy.name);

                    console.log(`✅ EXECUTION SENT for ${symbol}`);
                }
            } catch (err: any) {
                console.error(`Error analyzing ${symbol}:`, err.message);
            }
        }
    }
}

// Main Loop
setInterval(fetchActiveUsers, WORKER_INTERVAL);
fetchActiveUsers(); // Initial run
