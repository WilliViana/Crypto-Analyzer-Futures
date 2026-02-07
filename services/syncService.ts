/**
 * Supabase Sync Service
 * Sincroniza dados entre dispositivos via Supabase
 */

import { supabase } from './supabaseClient';
import { StrategyProfile, Exchange, Trade } from '../types';

// ============ EXCHANGES ============

export const loadExchanges = async (userId: string): Promise<Exchange[]> => {
    console.log('[SYNC] loadExchanges called for user:', userId);
    const { data, error } = await supabase
        .from('exchanges')
        .select('*')
        .eq('user_id', userId);

    if (error) {
        console.error('[SYNC] Load exchanges error:', error);
        return [];
    }

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

export const loadStrategies = async (userId: string): Promise<StrategyProfile[]> => {
    const { data, error } = await supabase
        .from('strategies')
        .select('*')
        .eq('user_id', userId);

    if (error) {
        console.error('[SYNC] Load strategies error:', error);
        return [];
    }

    return (data || []).map(row => ({
        id: row.id,
        name: row.name || 'Perfil',
        type: row.type_id as any || 'scalper',
        riskLevel: row.risk_level as any || 'medium',
        active: row.active || false,
        description: row.description || '',
        confidenceThreshold: Number(row.confidence_threshold) || 50,
        leverage: Number(row.leverage) || 5,
        capital: Number(row.capital) || 1000,
        stopLoss: Number(row.stop_loss) || 2,
        takeProfit: Number(row.take_profit) || 4,
        maxDrawdown: Number(row.max_drawdown) || 10,
        settings: row.settings || {}
    }));
};

export const saveStrategy = async (userId: string, strategy: StrategyProfile): Promise<boolean> => {
    const { error } = await supabase
        .from('strategies')
        .upsert({
            id: strategy.id,
            user_id: userId,
            name: strategy.name,
            type_id: strategy.type,
            risk_level: strategy.riskLevel,
            active: strategy.active,
            description: strategy.description,
            confidence_threshold: strategy.confidenceThreshold,
            leverage: strategy.leverage,
            capital: strategy.capital,
            stop_loss: strategy.stopLoss,
            take_profit: strategy.takeProfit,
            max_drawdown: strategy.maxDrawdown,
            settings: strategy.settings || {},
            updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

    if (error) {
        console.error('[SYNC] Save strategy error:', error);
        return false;
    }
    return true;
};

// ============ TRADES ============

export const loadTrades = async (userId: string): Promise<Trade[]> => {
    const { data, error } = await supabase
        .from('trade_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

    if (error) {
        console.error('[SYNC] Load trades error:', error);
        return [];
    }

    return (data || []).map(row => ({
        id: row.id,
        symbol: row.symbol,
        side: row.side as 'BUY' | 'SELL',
        amount: Number(row.amount) || 0,
        entryPrice: Number(row.entry_price) || 0,
        exitPrice: row.exit_price ? Number(row.exit_price) : undefined,
        pnl: Number(row.pnl) || 0,
        status: row.status as 'OPEN' | 'CLOSED' || 'OPEN',
        strategyId: row.strategy_id || undefined,
        strategyName: row.strategy_name || undefined,
        timestamp: row.created_at || new Date().toISOString()
    }));
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
        })
        .eq('id', tradeId);

    return !error;
};

// ============ USER SETTINGS ============

export const loadUserSettings = async (userId: string): Promise<{ selectedPairs: string[] } | null> => {
    const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (error || !data) return null;

    return {
        selectedPairs: data.selected_pairs || ['BTCUSDT']
    };
};

export const saveUserSettings = async (userId: string, settings: { selectedPairs: string[] }): Promise<boolean> => {
    const { error } = await supabase
        .from('user_settings')
        .upsert({
            user_id: userId,
            selected_pairs: settings.selectedPairs,
            updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

    return !error;
};

// ============ FULL SYNC ============

export interface UserData {
    exchanges: Exchange[];
    strategies: StrategyProfile[];
    trades: Trade[];
    settings: { selectedPairs: string[] };
}

export const loadAllUserData = async (userId: string): Promise<UserData> => {
    console.log('[SYNC] Loading all data for user:', userId);

    const [exchanges, strategies, trades, settings] = await Promise.all([
        loadExchanges(userId),
        loadStrategies(userId),
        loadTrades(userId),
        loadUserSettings(userId)
    ]);

    console.log('[SYNC] Loaded:', {
        exchanges: exchanges.length,
        strategies: strategies.length,
        trades: trades.length
    });

    return {
        exchanges,
        strategies,
        trades,
        settings: settings || { selectedPairs: ['BTCUSDT'] }
    };
};
