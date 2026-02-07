
// Gemini Service - STUB VERSION (Gemini disabled to prevent crash)
// The @google/genai library throws error without API key, so we provide mock responses.

import { MarketData, StrategyProfile, Language } from "../types";

const GEMINI_DISABLED_MSG = "🔒 AI features temporarily disabled. Configure VITE_GEMINI_API_KEY to enable.";

export class TradingChatSession {
  constructor(_lang: Language) {
    console.log('TradingChatSession: Gemini disabled in this build.');
  }

  async sendMessage(_userMessage: string, _marketContext?: MarketData, _symbol?: string): Promise<string> {
    return GEMINI_DISABLED_MSG;
  }
}

export const analyzeMarket = async (
  _marketData: MarketData,
  _activeProfiles: StrategyProfile[],
  _lang: Language
): Promise<string> => {
  return GEMINI_DISABLED_MSG;
};

export const getMarketNews = async (_symbol: string, _lang: Language): Promise<{ text: string, sources: any[] }> => {
  return { text: GEMINI_DISABLED_MSG, sources: [] };
};

export const runDeepAnalysis = async (_marketData: MarketData, _lang: Language): Promise<string> => {
  return GEMINI_DISABLED_MSG;
};
