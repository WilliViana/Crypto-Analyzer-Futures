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
        if (error.name === 'AbortError') {
            // Silently fail on abort
            return [];
        }
        console.error('[SYNC] Load exchanges error:', error);
        return [];
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
        return [];
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
        return [];
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
            .single();

        if (signal) (query as any).abortSignal(signal);

        const { data, error } = await query;

        if (error || !data) return null;

        return {
            selectedPairs: data.selected_pairs || ['BTCUSDT'],
            isRunning: (data as any).is_running || false
        };
    } catch (error: any) {
        if (error.name === 'AbortError') return null;
        return null;
    }
};

export const saveUserSettings = async (userId: string, settings: { selectedPairs: string[], isRunning: boolean }): Promise<boolean> => {
    const { error } = await supabase
        .from('user_settings')
        .upsert({
            user_id: userId,
            selected_pairs: settings.selectedPairs,
            is_running: settings.isRunning,
            updated_at: new Date().toISOString()
        } as any, { onConflict: 'user_id' });

    return !error;
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

        console.log('[SYNC] Loaded:', {
            exchanges: exchanges.length,
            strategies: strategies.length,
            trades: trades.length
        });

        return {
            exchanges,
            strategies,
            trades,
            settings: settings || { selectedPairs: ['BTCUSDT'], isRunning: false }
        };
    } catch (error: any) {
        if (error.name === 'AbortError') {
            throw error;
        }
        console.error('[SYNC] loadAllUserData error:', error);
        throw error;
    }
};
