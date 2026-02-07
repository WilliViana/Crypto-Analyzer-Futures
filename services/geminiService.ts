
// Gemini Service - Lazy loading to prevent initialization errors
import { MarketData, StrategyProfile, Language } from "../types";

// Type definitions (imported types only, not the library itself)
type GoogleGenAI = any;
type Chat = any;
type GenerateContentResponse = any;

// Lazy-loaded client cache
let _aiClient: GoogleGenAI | null = null;
let _initAttempted = false;

// Get API key from Vite environment
const getApiKey = (): string | null => {
  try {
    const key = (import.meta as any).env?.VITE_GEMINI_API_KEY;
    return key || null;
  } catch {
    return null;
  }
};

// Lazily initialize the AI client (only when first needed)
const getAIClient = async (): Promise<GoogleGenAI | null> => {
  if (_initAttempted) return _aiClient;
  _initAttempted = true;

  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn('VITE_GEMINI_API_KEY not set. Gemini features disabled.');
    return null;
  }

  try {
    // Dynamic import - only load the library when we have an API key
    const { GoogleGenAI } = await import('@google/genai');
    _aiClient = new GoogleGenAI({ apiKey });
    return _aiClient;
  } catch (error) {
    console.error('Failed to initialize Gemini:', error);
    return null;
  }
};

const SYSTEM_INSTRUCTION = `
You are "CAP.PRO AI Guide", an elite crypto trading assistant.
Your goal is to assist traders with the CAP.PRO HFT Terminal.

PLATFORM CAPABILITIES:
1. **HFT Engine**: Micro-second execution, liquidation hunting.
2. **Strategies**:
   - Alpha Predator: Extreme risk, 70x+ lev.
   - Specialist: Technical confluences.
   - Safe: Capital preservation.
3. **Data**: Real-time RSI, MACD, Bollinger Bands, and Order Flow.

RULES:
- Be concise, technical, and professional (Institutional Trader Persona).
- Analyze the provided "Market Context" (RSI, Price, Trends) in every response if relevant.
- Do not hallucinate prices; strictly use the provided context.
- Format responses with Markdown (bolding key metrics).
`;

export class TradingChatSession {
  private chat: Chat | null = null;
  private model: string = 'gemini-3-flash-preview';
  private lang: Language;
  private initialized: boolean = false;

  constructor(lang: Language) {
    this.lang = lang;
    // Don't initialize here - do it lazily on first message
  }

  private async ensureInitialized(): Promise<boolean> {
    if (this.initialized) return this.chat !== null;
    this.initialized = true;

    const ai = await getAIClient();
    if (!ai) return false;

    this.chat = ai.chats.create({
      model: this.model,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION + `\nRespond in ${this.lang === 'pt' ? 'Portuguese' : this.lang === 'es' ? 'Spanish' : 'English'}.`,
        temperature: 0.7,
      },
    });
    return true;
  }

  async sendMessage(userMessage: string, marketContext?: MarketData, symbol?: string): Promise<string> {
    const ready = await this.ensureInitialized();
    if (!ready || !this.chat) {
      return "Chat AI não disponível. Configure a API Key do Gemini.";
    }

    try {
      let prompt = userMessage;

      if (marketContext && symbol) {
        prompt += `\n\n[SYSTEM DATA INJECTION - HIDDEN FROM USER]
        Current Asset: ${symbol}
        Price: ${marketContext.price}
        RSI (14): ${marketContext.rsi.toFixed(2)}
        MACD: ${marketContext.macd.toFixed(4)}
        Bollinger Status: ${marketContext.bollingerState}
        Volume: ${marketContext.volume}
        Trend Recommendation: Based on RSI ${marketContext.rsi > 70 ? 'Overbought' : marketContext.rsi < 30 ? 'Oversold' : 'Neutral'}, provide a micro-analysis.
        [/SYSTEM DATA]`;
      }

      const response = await this.chat.sendMessage({ message: prompt });
      return response.text || "No response from neural network.";
    } catch (error) {
      console.error("Chat Error:", error);
      return "Connection to AI Core unstable. Please try again.";
    }
  }
}

// Legacy stateless functions for specific tools
export const analyzeMarket = async (
  marketData: MarketData,
  activeProfiles: StrategyProfile[],
  lang: Language
): Promise<string> => {
  try {
    const ai = await getAIClient();
    if (!ai) return "Análise de mercado indisponível. Configure a API Key do Gemini.";

    const btcPrice = marketData.price > 0 ? `$${marketData.price.toFixed(2)}` : "Unavailable";

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `
        Act as a Senior Futures Analyst.
        Asset Data (BTC/USDT):
        - Price: ${btcPrice}
        - RSI: ${marketData.rsi.toFixed(2)}
        - MACD: ${marketData.macd.toFixed(4)}
        - Bollinger: ${marketData.bollingerState}

        Active Strategies:
        ${activeProfiles.map(p => `- ${p.name} (Risk: ${p.riskLevel}, Lev: ${p.leverage}x)`).join('\n')}

        Provide a concise (max 100 words) immediate trend analysis and suggest which strategy to prioritize. Respond in ${lang}.
      `,
    });

    return response.text || "Analysis unavailable.";
  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return "Technical analysis module offline.";
  }
};

export const getMarketNews = async (symbol: string, lang: Language): Promise<{ text: string, sources: any[] }> => {
  try {
    const ai = await getAIClient();
    if (!ai) return { text: "Notícias indisponíveis. Configure a API Key do Gemini.", sources: [] };

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Search for breaking news, whale flows, and sentiment for ${symbol} crypto. Respond in ${lang}.`,
      config: {
        tools: [{ googleSearch: {} }],
      }
    });

    const text = response.text || "No news data.";
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    return { text, sources };
  } catch (error) {
    console.error("News search failed:", error);
    return { text: "Error fetching real-time news.", sources: [] };
  }
};

export const runDeepAnalysis = async (marketData: MarketData, lang: Language): Promise<string> => {
  try {
    const ai = await getAIClient();
    if (!ai) return "Análise profunda indisponível. Configure a API Key do Gemini.";

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Perform a 'Chain of Thought' deep strategy analysis for BTC/USDT. Price: $${marketData.price.toFixed(2)}. Consider liquidity zones, traps, and order block theory. Respond in ${lang}.`,
      config: {
        thinkingConfig: { thinkingBudget: 24576 }
      }
    });

    return response.text || "Deep analysis failed.";
  } catch (error) {
    console.error("Deep thinking failed:", error);
    return "Deep Analysis unavailable.";
  }
};
