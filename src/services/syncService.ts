/**
 * Supabase Sync Service
 * Sincroniza dados entre dispositivos via Supabase
 */

import { supabase } from './supabaseClient';
import { StrategyProfile, Exchange, Trade } from '../types';

// ============ EXCHANGES ============

export const loadExchanges = async (userId: string, signal?: AbortSignal): Promise<Exchange[]> => {
    console.log('[SYNC] loadExchanges called for user:', userId);
    try {
        const query = supabase
            .from('exchanges')
            .select('*')
            .eq('user_id', userId);

        if (signal) (query as any).abortSignal(signal);

        const { data, error } = await query;

        if (error) throw error;

        console.log('[SYNC] Raw exchanges from DB:', data);

        const mapped = (data || []).map(row => ({
            id: row.id,
            name: row.name || 'Binance Futures',
            type: row.type as any || 'CEX',
            apiKey: row.api_key || '',
            apiSecret: row.api_secret || '',
            isTestnet: row.is_testnet || false,
            status: row.status as any || 'DISCONNECTED'
        }));

        console.log('[SYNC] Mapped exchanges:', mapped);
        return mapped;
    } catch (error: any) {
        if (error.name === 'AbortError') return [];
        console.error('[SYNC] Load exchanges error:', error);
        // Re-throw network errors so Promise.allSettled detects failure
        throw error;
    }
};

export const saveExchange = async (userId: string, exchange: Exchange): Promise<boolean> => {
    const { error } = await supabase
        .from('exchanges')
        .upsert({
            id: exchange.id,
            user_id: userId,
            name: exchange.name,
            type: exchange.type,
            api_key: exchange.apiKey,
            api_secret: exchange.apiSecret,
            is_testnet: exchange.isTestnet,
            status: exchange.status,
            created_at: new Date().toISOString()
        }, { onConflict: 'id' });

    if (error) {
        console.error('[SYNC] Save exchange error:', error);
        return false;
    }
    return true;
};

export const deleteExchange = async (exchangeId: string): Promise<boolean> => {
    const { error } = await supabase
        .from('exchanges')
        .delete()
        .eq('id', exchangeId);

    return !error;
};

// ============ STRATEGIES ============

export const loadStrategies = async (userId: string, signal?: AbortSignal): Promise<StrategyProfile[]> => {
    try {
        const query = supabase
            .from('strategies')
            .select('*')
            .eq('user_id', userId);

        if (signal) (query as any).abortSignal(signal);

        const { data, error } = await query;

        if (error) throw error;

        return (data || []).map(row => ({
            id: row.id,
            name: row.name || 'Perfil',
            description: row.description || '',
            active: row.active || false,
            riskLevel: (row.risk_level || 'Medium') as any,
            confidenceThreshold: Number(row.confidence_threshold) || 50,
            leverage: Number(row.leverage) || 5,
            capital: Number(row.capital) || 1000,
            stopLoss: Number(row.stop_loss) || 2,
            takeProfit: Number(row.take_profit) || 4,
            maxDrawdown: Number(row.max_drawdown) || 10,
            // Default values for fields not in DB yet
            icon: 'activity',
            color: 'blue',
            pnl: 0,
            trades: 0,
            winRate: 0,
            workflowSteps: (row as any).workflow_steps || ['Analisar Mercado', 'Verificar Indicadores', 'Executar Trade'],
            indicators: (row.settings as any)?.indicators || {},
            useDivergences: (row.settings as any)?.useDivergences || false,
            useCandlePatterns: (row.settings as any)?.useCandlePatterns || false
        } as StrategyProfile));
    } catch (error: any) {
        if (error.name === 'AbortError') return [];
        console.error('[SYNC] Load strategies error:', error);
        throw error;
    }
};

export const saveStrategy = async (userId: string, strategy: StrategyProfile): Promise<boolean> => {
    const { error } = await supabase
        .from('strategies')
        .upsert({
            id: strategy.id,
            user_id: userId,
            name: strategy.name,
            risk_level: strategy.riskLevel,
            active: strategy.active,
            description: strategy.description,
            confidence_threshold: strategy.confidenceThreshold,
            leverage: strategy.leverage,
            capital: strategy.capital,
            stop_loss: strategy.stopLoss,
            take_profit: strategy.takeProfit,
            max_drawdown: strategy.maxDrawdown,
            settings: {
                indicators: strategy.indicators,
                useDivergences: strategy.useDivergences,
                useCandlePatterns: strategy.useCandlePatterns
            },
            updated_at: new Date().toISOString()
        } as any, { onConflict: 'id' });

    if (error) {
        console.error('[SYNC] Save strategy error:', error);
        return false;
    }
    return true;
};

// ============ TRADES ============

export const loadTrades = async (userId: string, signal?: AbortSignal): Promise<Trade[]> => {
    try {
        const query = supabase
            .from('trade_logs')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(100);

        if (signal) (query as any).abortSignal(signal);

        const { data, error } = await query;

        if (error) throw error;

        return (data || []).map(row => ({
            id: row.id,
            symbol: row.symbol,
            side: row.side as any, // Cast to match Trade type
            amount: Number(row.amount) || 0,
            entryPrice: Number(row.entry_price) || 0,
            exitPrice: (row as any).exit_price ? Number((row as any).exit_price) : undefined,
            pnl: Number(row.pnl) || 0,
            status: row.status as 'OPEN' | 'CLOSED',
            strategyId: row.strategy_id || undefined,
            strategyName: row.strategy_name || undefined,
            timestamp: row.created_at || new Date().toISOString()
        } as Trade));
    } catch (error: any) {
        if (error.name === 'AbortError') return [];
        console.error('[SYNC] Load trades error:', error);
        throw error;
    }
};

export const saveTrade = async (userId: string, trade: Partial<Trade> & { symbol: string; side: string }): Promise<string | null> => {
    const { data, error } = await supabase
        .from('trade_logs')
        .insert({
            user_id: userId,
            exchange_id: 'binance',
            symbol: trade.symbol,
            side: trade.side,
            amount: trade.amount || 0,
            entry_price: trade.entryPrice || 0,
            strategy_id: trade.strategyId || null,
            strategy_name: trade.strategyName || null,
            status: trade.status || 'OPEN',
            pnl: trade.pnl || 0,
            client_order_id: trade.id || null
        })
        .select('id')
        .single();

    if (error) {
        console.error('[SYNC] Save trade error:', error);
        return null;
    }
    return data?.id || null;
};

export const updateTrade = async (tradeId: string, updates: Partial<{ status: string; pnl: number; exitPrice: number }>): Promise<boolean> => {
    const { error } = await supabase
        .from('trade_logs')
        .update({
            status: updates.status,
            pnl: updates.pnl,
            exit_price: updates.exitPrice
        } as any)
        .eq('id', tradeId);

    return !error;
};

// ============ USER SETTINGS ============

export const loadUserSettings = async (userId: string, signal?: AbortSignal): Promise<{ selectedPairs: string[], isRunning: boolean } | null> => {
    try {
        const query = supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        if (signal) (query as any).abortSignal(signal);

        const { data, error } = await query;

        if (error) {
            console.error('[SYNC] Load settings error:', error);
            throw error;
        }
        if (!data) return null;

        return {
            selectedPairs: data.selected_pairs || ['BTCUSDT'],
            isRunning: (data as any).is_running || false
        };
    } catch (error: any) {
        if (error.name === 'AbortError') return null;
        console.error('[SYNC] Load settings error (catch):', error);
        throw error;
    }
};

export const saveUserSettings = async (userId: string, settings: { selectedPairs: string[], isRunning: boolean }): Promise<boolean> => {
    try {
        // Check if settings already exist for this user
        const { data: existing } = await supabase
            .from('user_settings')
            .select('id')
            .eq('user_id', userId)
            .maybeSingle();

        if (existing) {
            // Update existing record
            const { error } = await supabase
                .from('user_settings')
                .update({
                    selected_pairs: settings.selectedPairs,
                    is_running: settings.isRunning,
                    updated_at: new Date().toISOString()
                } as any)
                .eq('user_id', userId);
            if (error) {
                console.error('[SYNC] Update settings error:', error);
                return false;
            }
        } else {
            // Insert new record
            const { error } = await supabase
                .from('user_settings')
                .insert({
                    user_id: userId,
                    selected_pairs: settings.selectedPairs,
                    is_running: settings.isRunning,
                    updated_at: new Date().toISOString()
                } as any);
            if (error) {
                console.error('[SYNC] Insert settings error:', error);
                return false;
            }
        }
        return true;
    } catch (err) {
        console.error('[SYNC] saveUserSettings exception:', err);
        return false;
    }
};

// ============ LOCAL CACHE ============

const CACHE_KEY = 'crypto-analyzer-data-cache';
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

const saveToCache = (userId: string, data: UserData): void => {
    try {
        const cacheEntry = { userId, data, timestamp: Date.now() };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cacheEntry));
        console.log('[CACHE] Data saved to local cache');
    } catch { /* localStorage full or unavailable */ }
};

const loadFromCache = (userId: string): UserData | null => {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const entry = JSON.parse(raw);
        if (entry.userId !== userId) return null;
        if (Date.now() - entry.timestamp > CACHE_TTL) return null;
        console.log('[CACHE] Loaded data from local cache');
        return entry.data;
    } catch {
        return null;
    }
};

// ============ FULL SYNC ============

export interface UserData {
    exchanges: Exchange[];
    strategies: StrategyProfile[];
    trades: Trade[];
    settings: { selectedPairs: string[], isRunning: boolean };
}

export const loadAllUserData = async (userId: string, signal?: AbortSignal): Promise<UserData> => {
    console.log('[SYNC] Loading all data in parallel for user:', userId);

    const defaultData: UserData = {
        exchanges: [],
        strategies: [],
        trades: [],
        settings: { selectedPairs: ['BTCUSDT'], isRunning: false }
    };

    try {
        // Parallel loading with Promise.allSettled — fast and failure-tolerant
        const [exchangesResult, strategiesResult, tradesResult, settingsResult] = await Promise.allSettled([
            loadExchanges(userId, signal),
            loadStrategies(userId, signal),
            loadTrades(userId, signal),
            loadUserSettings(userId, signal)
        ]);

        if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

        const exchanges = exchangesResult.status === 'fulfilled' ? exchangesResult.value : [];
        const strategies = strategiesResult.status === 'fulfilled' ? strategiesResult.value : [];
        const trades = tradesResult.status === 'fulfilled' ? tradesResult.value : [];
        const settings = settingsResult.status === 'fulfilled' ? settingsResult.value : null;

        const hasData = exchanges.length > 0 || strategies.length > 0 || trades.length > 0;
        const allFailed = exchangesResult.status === 'rejected' && strategiesResult.status === 'rejected';

        console.log('[SYNC] Loaded:', {
            exchanges: exchanges.length,
            strategies: strategies.length,
            trades: trades.length,
            allFailed
        });

        // If ALL fetches failed, try local cache
        if (allFailed) {
            console.warn('[SYNC] All Supabase fetches failed — loading from local cache');
            const cached = loadFromCache(userId);
            if (cached) return cached;
            return defaultData;
        }

        const result: UserData = {
            exchanges,
            strategies,
            trades,
            settings: settings || { selectedPairs: ['BTCUSDT'], isRunning: false }
        };

        // Cache successful data for offline/fallback use
        if (hasData) {
            saveToCache(userId, result);
        }

        return result;
    } catch (error: any) {
        if (error.name === 'AbortError') {
            throw error;
        }
        console.error('[SYNC] loadAllUserData error:', error);

        // Fallback to cache on any error
        const cached = loadFromCache(userId);
        if (cached) {
            console.log('[SYNC] Using cached data after error');
            return cached;
        }

        return defaultData;
    }
};
