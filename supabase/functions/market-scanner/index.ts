
// Follow this setup guide to integrate the Deno runtime into your application:
// https://deno.land/manual/getAllGettingStarted

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

// --- Technical Analysis Logic (Copied for Deno compatibility) ---
// We copy this here to avoid complex relative imports in Edge Functions
interface StrategyProfile {
    id: string;
    name: string;
    active: boolean;
    confidenceThreshold: number;
    leverage: number;
    stopLoss: number;
    takeProfit: number;
    indicators: any;
    // ... minimal fields needed for analysis
}

function calculateRSI(closes: number[], period: number = 14): number {
    if (closes.length < period + 1) return 50;
    let gains = 0;
    let losses = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
        const diff = closes[i] - closes[i - 1];
        if (diff >= 0) gains += diff;
        else losses -= diff;
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
}

function calculateEMA(data: number[], period: number): number[] {
    const k = 2 / (period + 1);
    const emaArray = [data[0]];
    for (let i = 1; i < data.length; i++) {
        emaArray.push(data[i] * k + emaArray[i - 1] * (1 - k));
    }
    return emaArray;
}

const unifiedTechnicalAnalysis = (candles: any[], profile: StrategyProfile): { signal: 'BUY' | 'SELL' | 'NEUTRAL', confidence: number, details: string[] } => {
    if (!candles || candles.length < 50) {
        return { signal: 'NEUTRAL', confidence: 0, details: ['Dados insuficientes'] };
    }

    const closes = candles.map((c: any) => parseFloat(c[4]));
    const currentPrice = closes[closes.length - 1];

    const rsi = calculateRSI(closes, profile.indicators.rsi?.period || 14);
    const ema12 = calculateEMA(closes, 12);
    const ema26 = calculateEMA(closes, 26);
    const macdLine = ema12[ema12.length - 1] - ema26[ema26.length - 1];

    let scoreBuy = 0;
    let scoreSell = 0;
    const details: string[] = [];

    if (profile.indicators.rsi?.enabled) {
        const low = profile.indicators.rsi.thresholdLow || 30;
        const high = profile.indicators.rsi.thresholdHigh || 70;
        if (rsi < low) {
            scoreBuy += profile.indicators.rsi.weight;
            details.push(`RSI ${rsi.toFixed(1)} (Sobrevenda)`);
        } else if (rsi > high) {
            scoreSell += profile.indicators.rsi.weight;
            details.push(`RSI ${rsi.toFixed(1)} (Sobrecompra)`);
        }
    }

    if (profile.indicators.macd?.enabled) {
        if (macdLine > 0) scoreBuy += profile.indicators.macd.weight;
        else scoreSell += profile.indicators.macd.weight;
    }

    if (profile.indicators.bollinger?.enabled) {
        // Simple Bollinger approximation
        const sum = closes.slice(-20).reduce((a, b) => a + b, 0);
        const sma20 = sum / 20;
        if (currentPrice < sma20 * 0.98) {
            scoreBuy += profile.indicators.bollinger.weight;
            details.push("Dip abaixo da média");
        } else if (currentPrice > sma20 * 1.02) {
            scoreSell += profile.indicators.bollinger.weight;
        }
    }

    const totalActiveWeight = Object.values(profile.indicators).reduce((acc: number, ind: any) => acc + (ind.enabled ? ind.weight : 0), 0) || 1;
    const confidenceBuy = Math.min((scoreBuy / totalActiveWeight) * 100, 100);
    const confidenceSell = Math.min((scoreSell / totalActiveWeight) * 100, 100);

    if (confidenceBuy > confidenceSell && confidenceBuy >= profile.confidenceThreshold) {
        return { signal: 'BUY', confidence: confidenceBuy, details };
    }
    if (confidenceSell > confidenceBuy && confidenceSell >= profile.confidenceThreshold) {
        return { signal: 'SELL', confidence: confidenceSell, details };
    }
    return { signal: 'NEUTRAL', confidence: 0, details: [] };
};

// --- Helper Functions ---

async function fetchHistoricalCandles(symbol: string) {
    try {
        const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=15m&limit=50`);
        if (!res.ok) return [];
        return await res.json();
    } catch { return []; }
}

// --- Main Handler ---

Deno.serve(async (req) => {
    // 1. Setup Supabase Client
    // Use SERVICE_ROLE_KEY to bypass RLS and see all users' settings
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("🤖 Market Scanner Triggered");

    // 2. Fetch Active Users
    const { data: settings, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('is_running', true);

    if (error || !settings || settings.length === 0) {
        return new Response(JSON.stringify({ message: "No active users found or error", error }), { headers: { 'Content-Type': 'application/json' } });
    }

    const results = [];

    // ... (previous code)

    // Helper for Binance Signature
    const encoder = new TextEncoder();
    async function sign(message: string, secret: string) {
        const key = await crypto.subtle.importKey(
            "raw",
            encoder.encode(secret),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["sign"]
        );
        const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
        return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async function fetchBinanceBalance(apiKey: string, apiSecret: string, isTestnet: boolean) {
        try {
            const baseUrl = isTestnet ? 'https://testnet.binancefuture.com' : 'https://fapi.binance.com';
            const endpoint = '/fapi/v2/account';
            const timestamp = Date.now();
            const query = `timestamp=${timestamp}`;
            const signature = await sign(query, apiSecret);

            const res = await fetch(`${baseUrl}${endpoint}?${query}&signature=${signature}`, {
                headers: { 'X-MBX-APIKEY': apiKey }
            });

            if (!res.ok) return null;
            const data = await res.json();
            return parseFloat(data.totalWalletBalance);
        } catch (e) {
            console.error("Balance fetch error:", e);
            return null;
        }
    }

    // 3. Process Each User
    for (const setting of settings) {
        const { data: profiles } = await supabase.from('strategies').select('*').eq('user_id', setting.user_id).eq('active', true);
        const { data: exchanges } = await supabase.from('exchanges').select('*').eq('user_id', setting.user_id).eq('status', 'CONNECTED').limit(1);

        if (!exchanges?.length) continue;

        // --- UPDATE BALANCE HISTORY ---
        const exchange = exchanges[0];
        const currentBalance = await fetchBinanceBalance(exchange.api_key, exchange.api_secret, exchange.is_testnet);

        if (currentBalance !== null) {
            // Check if we need to save history (e.g. only once per hour to save space? or every run?)
            // For now, let's save every run but maybe we can limit it in frontend query or cleanup later.
            // Or better: ensure we don't spam. Let's just save it. 
            // Optional: Check last entry timestamp to avoid dupes if running too fast.
            await supabase.from('balance_history').insert({
                user_id: setting.user_id,
                total_balance: currentBalance,
                unrealized_pnl: 0 // We'd need to calculate this from positions, strict balance is enough for now
            });
        }
        // ------------------------------

        if (!profiles?.length) continue;

        const pairs = Array.isArray(setting.selected_pairs)
            ? setting.selected_pairs
            : JSON.parse(setting.selected_pairs as any || '[]');

        // ... (rest of analysis logic)
        const batch = pairs.slice(0, 5);
        for (const profile of profiles) {
            // ... existing logic ...
            // Re-inserting the loop body here to strictly match replacing the block if needed, 
            // but since I'm in replace_file_content for a chunk, I should be careful.
            // Actually, the user's file content is structure.
            // I will use multi-replace or just replace the loop part.
            // Wait, I am replacing the END of the file.
            // I need to be careful about not deleting the `profile` loop if I don't include it. 
            // The Instruction says "Add balance fetching". 

            // Let's rewrite the logic inside the loop properly.
            const strategy = { ...profile, indicators: (profile.settings as any)?.indicators };
            for (const symbol of batch) {
                const candles = await fetchHistoricalCandles(symbol);
                const analysis = unifiedTechnicalAnalysis(candles, strategy);

                if (analysis.signal !== 'NEUTRAL' && analysis.confidence >= profile.confidence_threshold) {
                    console.log(`⚡ SIGNAL: ${symbol} ${analysis.signal} for ${setting.user_id}`);
                    await supabase.from('audit_logs').insert({
                        user_id: setting.user_id,
                        action: 'SCAN_SIGNAL',
                        details: { symbol, signal: analysis.signal, confidence: analysis.confidence, profile: profile.name },
                        level: 'INFO'
                    });
                    results.push({ user: setting.user_id, symbol, signal: analysis.signal });
                }
            }
        }
    }

    return new Response(
        JSON.stringify({ success: true, processed: settings.length, signals: results }),
        { headers: { "Content-Type": "application/json" } },
    )
})
