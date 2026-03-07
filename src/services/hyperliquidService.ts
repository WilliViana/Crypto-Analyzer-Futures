import { Exchange, RealAccountData } from '../types';
import { callBinanceProxy } from './exchangeService';

/**
 * Hyperliquid DEX Service
 * Uses the same proxy infrastructure but routes to Hyperliquid API
 * API: POST https://api.hyperliquid.xyz/info
 */

// Fetch account data (balance, positions) from Hyperliquid
export async function fetchHLAccountData(exchange: Exchange): Promise<RealAccountData> {
    try {
        const data = await callBinanceProxy('clearinghouseState', 'POST', {}, {
            ...exchange,
            id: 'hyperliquid',
        });

        console.log('[HL] clearinghouseState response keys:', data ? Object.keys(data) : 'null');

        if (!data) {
            return { totalBalance: 0, unrealizedPnL: 0, assets: [], isSimulated: false };
        }

        // Hyperliquid returns crossMarginSummary (or marginSummary as fallback)
        const marginSummary = data.crossMarginSummary || data.marginSummary;
        console.log('[HL] marginSummary:', JSON.stringify(marginSummary));

        if (!marginSummary) {
            console.warn('[HL] No marginSummary or crossMarginSummary found in response');
            return { totalBalance: 0, unrealizedPnL: 0, assets: [], isSimulated: false };
        }

        const totalBalance = parseFloat(marginSummary.accountValue || '0');
        const totalNtlPos = parseFloat(marginSummary.totalNtlPos || '0');

        // Map positions to assets format
        const assets = (data.assetPositions || [])
            .filter((p: any) => {
                const pos = p.position || p;
                return pos && parseFloat(pos.szi || '0') !== 0;
            })
            .map((p: any) => {
                const pos = p.position || p;
                const amount = parseFloat(pos.szi || '0');
                const entryPrice = parseFloat(pos.entryPx || '0');
                const upnl = parseFloat(pos.unrealizedPnl || '0');
                const value = Math.abs(amount) * entryPrice;

                return {
                    symbol: (pos.coin || '') + 'USDC',
                    amount,
                    price: entryPrice,
                    value,
                    unrealizedPnL: upnl,
                    initialMargin: parseFloat(pos.marginUsed || '0'),
                    strategyName: undefined,
                };
            });

        const totalPnL = assets.reduce((sum: number, a: any) => sum + a.unrealizedPnL, 0);
        console.log('[HL] Parsed: totalBalance=', totalBalance, 'pnl=', totalPnL, 'positions=', assets.length);

        return {
            totalBalance,
            unrealizedPnL: totalPnL,
            assets,
            isSimulated: exchange.isTestnet,
        };
    } catch (e) {
        console.error('[HL] fetchHLAccountData error:', e);
        return { totalBalance: 0, unrealizedPnL: 0, assets: [], isSimulated: false };
    }
}

// Validate Hyperliquid wallet by fetching account state
export async function validateHLCredentials(exchange: Exchange): Promise<{ valid: boolean; balance?: number; error?: string }> {
    try {
        const data = await callBinanceProxy('clearinghouseState', 'POST', {}, {
            ...exchange,
            id: 'hyperliquid',
        });

        console.log('[HL validate] response:', data ? Object.keys(data) : 'null');
        const ms = data?.crossMarginSummary || data?.marginSummary;
        if (ms) {
            const balance = parseFloat(ms.accountValue || '0');
            console.log('[HL validate] accountValue =', balance);
            return { valid: true, balance };
        }
        // Even if no margin summary, if we got a response, the wallet exists
        if (data && typeof data === 'object') {
            return { valid: true, balance: 0 };
        }
        return { valid: false, error: 'Wallet não encontrada ou sem dados' };
    } catch (e: any) {
        return { valid: false, error: e.message || 'Erro de conexão' };
    }
}

// Fetch trade history (fills) from Hyperliquid
export async function fetchHLTradeHistory(exchange: Exchange): Promise<any[]> {
    try {
        const data = await callBinanceProxy('userFills', 'POST', {
            aggregateByTime: true,
        }, {
            ...exchange,
            id: 'hyperliquid',
        });

        if (!Array.isArray(data)) return [];

        return data.map((f: any) => ({
            symbol: f.coin + 'USDC',
            side: f.side === 'B' ? 'BUY' : 'SELL',
            pnl: parseFloat(f.closedPnl || '0'),
            qty: parseFloat(f.sz || '0'),
            price: parseFloat(f.px || '0'),
            time: f.time,
            realizedPnl: parseFloat(f.closedPnl || '0'),
            commission: parseFloat(f.fee || '0'),
        }));
    } catch (e) {
        console.error('[HL] fetchHLTradeHistory error:', e);
        return [];
    }
}

// Fetch all market pairs from Hyperliquid
export async function fetchHLMarketPairs(exchange: Exchange): Promise<any[]> {
    try {
        const data = await callBinanceProxy('metaAndAssetCtxs', 'POST', {}, {
            ...exchange,
            id: 'hyperliquid',
        });

        if (!data || !Array.isArray(data) || data.length < 2) return [];

        const meta = data[0]; // { universe: [...] }
        const assetCtxs = data[1]; // [ { ... } ]

        if (!meta?.universe || !Array.isArray(assetCtxs)) return [];

        return meta.universe.map((u: any, i: number) => {
            const ctx = assetCtxs[i] || {};
            return {
                symbol: u.name + 'USDC',
                baseAsset: u.name,
                quoteAsset: 'USDC',
                markPrice: parseFloat(ctx.markPx || '0'),
                fundingRate: parseFloat(ctx.funding || '0'),
                volume24h: parseFloat(ctx.dayNtlVlm || '0'),
                maxLeverage: u.maxLeverage,
            };
        });
    } catch (e) {
        console.error('[HL] fetchHLMarketPairs error:', e);
        return [];
    }
}

// Fetch all mid prices from Hyperliquid
export async function fetchHLAllMids(exchange: Exchange): Promise<Record<string, string>> {
    try {
        const data = await callBinanceProxy('allMids', 'POST', {}, {
            ...exchange,
            id: 'hyperliquid',
        });
        return data || {};
    } catch (e) {
        console.error('[HL] fetchHLAllMids error:', e);
        return {};
    }
}
