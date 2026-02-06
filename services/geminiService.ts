
// Fix: Updated initialization and types to follow @google/genai guidelines
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { MarketData, StrategyProfile, Language } from "../types";

const getAIClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

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
  private chat: Chat;
  private model: string = 'gemini-3-flash-preview';

  constructor(lang: Language) {
    const ai = getAIClient();
    this.chat = ai.chats.create({
      model: this.model,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION + `\nRespond in ${lang === 'pt' ? 'Portuguese' : lang === 'es' ? 'Spanish' : 'English'}.`,
        temperature: 0.7,
      },
    });
  }

  async sendMessage(userMessage: string, marketContext?: MarketData, symbol?: string): Promise<string> {
    try {
      let prompt = userMessage;
      
      // Inject Invisible Context
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
    const ai = getAIClient();
    const btcPrice = marketData.price > 0 ? `$${marketData.price.toFixed(2)}` : "Unavailable";

    const response: GenerateContentResponse = await ai.models.generateContent({
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

export const getMarketNews = async (symbol: string, lang: Language): Promise<{text: string, sources: any[]}> => {
  try {
    const ai = getAIClient();
    const response: GenerateContentResponse = await ai.models.generateContent({
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
    const ai = getAIClient();
    const response: GenerateContentResponse = await ai.models.generateContent({
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
