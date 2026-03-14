/**
 * Sentiment Analysis Service — Integração com Gemini via REST API
 * Analisa notícias e contexto de mercado para gerar sentimento
 */

// ─── Types ───

export interface SentimentAnalysis {
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  confidence: number; // 0-100
  score: number; // -100 (bearish) a +100 (bullish)
  reasoning: string;
  keyFactors: string[];
  riskFactors: string[];
  timeframe: 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM';
}

export interface TradingRecommendation {
  recommendation: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
  confidence: number; // 0-100
  reasoning: string;
}

export interface NewsItem {
  title: string;
  summary?: string;
  source?: string;
  url?: string;
  publishedAt?: string;
}

// ─── Gemini REST API ───

function getGeminiApiKey(): string | null {
  const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[SENTIMENT] VITE_GEMINI_API_KEY não configurada. Sentimento desabilitado.');
    return null;
  }
  return apiKey;
}

async function callGemini(prompt: string): Promise<string | null> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return null;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 500 }
    }),
    signal: AbortSignal.timeout(15000)
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
}

// ─── Cache de notícias ───

const newsCache: Record<string, { data: NewsItem[]; timestamp: number }> = {};
const NEWS_CACHE_TTL = 5 * 60 * 1000; // 5 minutos

// ─── Funções de Notícias ───

/**
 * Busca notícias recentes sobre um símbolo cripto
 * Usa APIs públicas gratuitas
 */
export async function fetchRecentNews(symbol: string): Promise<NewsItem[]> {
  const cleanSymbol = symbol.replace('USDT', '').replace('USD', '');
  const cacheKey = cleanSymbol;
  const now = Date.now();

  if (newsCache[cacheKey] && (now - newsCache[cacheKey].timestamp < NEWS_CACHE_TTL)) {
    return newsCache[cacheKey].data;
  }

  const news: NewsItem[] = [];

  try {
    // CoinGecko search (gratuito, sem API key)
    const coinMap: Record<string, string> = {
      'BTC': 'bitcoin', 'ETH': 'ethereum', 'BNB': 'binancecoin', 'SOL': 'solana',
      'ADA': 'cardano', 'DOGE': 'dogecoin', 'XRP': 'ripple', 'DOT': 'polkadot',
      'AVAX': 'avalanche-2', 'MATIC': 'matic-network', 'LINK': 'chainlink',
      'ATOM': 'cosmos', 'UNI': 'uniswap', 'LTC': 'litecoin', 'NEAR': 'near',
    };

    const coinId = coinMap[cleanSymbol] || cleanSymbol.toLowerCase();

    // CoinGecko market data como proxy de "notícias"
    const cgRes = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false`,
      { signal: AbortSignal.timeout(5000) }
    );

    if (cgRes.ok) {
      const data = await cgRes.json();
      const desc = data.description?.en?.slice(0, 200) || '';
      const priceChange24h = data.market_data?.price_change_percentage_24h || 0;
      const priceChange7d = data.market_data?.price_change_percentage_7d || 0;
      const priceChange30d = data.market_data?.price_change_percentage_30d || 0;
      const marketCap = data.market_data?.market_cap?.usd || 0;
      const volume = data.market_data?.total_volume?.usd || 0;
      const sentiment = data.sentiment_votes_up_percentage || 50;

      news.push({
        title: `${cleanSymbol} Market Update`,
        summary: `Price change: 24h ${priceChange24h.toFixed(2)}%, 7d ${priceChange7d.toFixed(2)}%, 30d ${priceChange30d.toFixed(2)}%. Market Cap: $${(marketCap / 1e9).toFixed(2)}B. Volume 24h: $${(volume / 1e9).toFixed(2)}B. Community Sentiment: ${sentiment.toFixed(0)}% positive.`,
        source: 'CoinGecko'
      });

      if (desc) {
        news.push({ title: `${cleanSymbol} Overview`, summary: desc, source: 'CoinGecko' });
      }
    }
  } catch (err) {
    console.warn('[SENTIMENT] CoinGecko fetch error:', err);
  }

  try {
    // CryptoCompare News API (gratuito, sem API key para básico)
    const ccRes = await fetch(
      `https://min-api.cryptocompare.com/data/v2/news/?categories=${cleanSymbol}&excludeCategories=Sponsored`,
      { signal: AbortSignal.timeout(5000) }
    );

    if (ccRes.ok) {
      const data = await ccRes.json();
      const articles = (data.Data || []).slice(0, 5);
      for (const article of articles) {
        news.push({
          title: article.title,
          summary: article.body?.slice(0, 200),
          source: article.source,
          url: article.url,
          publishedAt: new Date(article.published_on * 1000).toISOString(),
        });
      }
    }
  } catch (err) {
    console.warn('[SENTIMENT] CryptoCompare fetch error:', err);
  }

  // Garante ao menos uma entrada
  if (news.length === 0) {
    news.push({
      title: `${cleanSymbol} - Sem notícias recentes disponíveis`,
      summary: 'Nenhuma fonte de notícias retornou dados. Análise baseada apenas em dados técnicos.',
      source: 'System'
    });
  }

  newsCache[cacheKey] = { data: news, timestamp: now };
  return news;
}

// ─── Análise de Sentimento com Gemini ───

/**
 * Analisa sentimento do mercado usando Gemini
 */
export async function analyzeSentimentWithGemini(
  symbol: string,
  recentNews: NewsItem[],
  technicalContext: string
): Promise<SentimentAnalysis> {
  // Se Gemini não disponível, retorna neutro
  if (!getGeminiApiKey()) {
    return {
      sentiment: 'NEUTRAL',
      confidence: 50,
      score: 0,
      reasoning: 'Gemini API key não configurada. Sentimento neutro por padrão.',
      keyFactors: [],
      riskFactors: [],
      timeframe: 'SHORT_TERM'
    };
  }

  try {
    const newsText = recentNews.map((n, i) =>
      `${i + 1}. [${n.source || 'Unknown'}] ${n.title}${n.summary ? ': ' + n.summary : ''}`
    ).join('\n');

    const prompt = `Você é um analista de mercado de criptomoedas. Analise o sentimento para ${symbol}.

NOTÍCIAS/DADOS RECENTES:
${newsText}

CONTEXTO TÉCNICO:
${technicalContext}

Responda SOMENTE com JSON válido (sem markdown, sem \`\`\`):
{
  "sentiment": "BULLISH" ou "BEARISH" ou "NEUTRAL",
  "confidence": número 0-100,
  "score": número -100 a +100,
  "reasoning": "explicação concisa em 1 frase",
  "keyFactors": ["fator1", "fator2"],
  "riskFactors": ["risco1", "risco2"],
  "timeframe": "SHORT_TERM" ou "MEDIUM_TERM" ou "LONG_TERM"
}`;

    const responseText = await callGemini(prompt);

    if (!responseText) {
      throw new Error('Gemini returned empty response');
    }

    // Extrai JSON da resposta
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('[SENTIMENT] Couldn\'t parse Gemini response:', responseText.slice(0, 200));
      throw new Error('Failed to parse Gemini response');
    }

    const analysis = JSON.parse(jsonMatch[0]) as SentimentAnalysis;

    // Valida campos
    if (!['BULLISH', 'BEARISH', 'NEUTRAL'].includes(analysis.sentiment)) {
      analysis.sentiment = 'NEUTRAL';
    }
    analysis.confidence = Math.max(0, Math.min(100, analysis.confidence || 50));
    analysis.score = Math.max(-100, Math.min(100, analysis.score || 0));
    analysis.keyFactors = analysis.keyFactors || [];
    analysis.riskFactors = analysis.riskFactors || [];
    analysis.timeframe = analysis.timeframe || 'SHORT_TERM';

    console.log(`[SENTIMENT] ${symbol}: ${analysis.sentiment} (${analysis.confidence}%) Score: ${analysis.score}`);
    return analysis;
  } catch (error: any) {
    console.error('[SENTIMENT] Gemini error:', error.message);
    return {
      sentiment: 'NEUTRAL',
      confidence: 30,
      score: 0,
      reasoning: `Erro na análise: ${error.message}`,
      keyFactors: [],
      riskFactors: [],
      timeframe: 'SHORT_TERM'
    };
  }
}

// ─── Recomendação Combinada ───

/**
 * Gera recomendação combinando sinal técnico + sentimento
 */
export async function generateTradingRecommendation(
  symbol: string,
  technicalSignal: 'BUY' | 'SELL' | 'NEUTRAL',
  technicalConfidence: number,
  sentimentAnalysis: SentimentAnalysis,
  currentPrice: number
): Promise<TradingRecommendation> {
  // Score combinado: 60% técnico + 40% sentimento
  const technicalScore = technicalSignal === 'BUY' ? technicalConfidence :
                         technicalSignal === 'SELL' ? -technicalConfidence : 0;

  const sentimentWeight = sentimentAnalysis.score; // -100 a +100

  const combinedScore = (technicalScore * 0.6) + (sentimentWeight * 0.4);
  const combinedConfidence = Math.abs(combinedScore);

  // Convergência técnico + sentimento = boost de confiança
  const isConvergent =
    (technicalSignal === 'BUY' && sentimentAnalysis.sentiment === 'BULLISH') ||
    (technicalSignal === 'SELL' && sentimentAnalysis.sentiment === 'BEARISH');

  const isDivergent =
    (technicalSignal === 'BUY' && sentimentAnalysis.sentiment === 'BEARISH') ||
    (technicalSignal === 'SELL' && sentimentAnalysis.sentiment === 'BULLISH');

  let recommendation: TradingRecommendation['recommendation'] = 'HOLD';
  let confidence = combinedConfidence;

  if (isConvergent) {
    confidence = Math.min(100, confidence * 1.2); // +20% boost por convergência
    if (combinedScore > 60) recommendation = 'STRONG_BUY';
    else if (combinedScore > 30) recommendation = 'BUY';
    else if (combinedScore < -60) recommendation = 'STRONG_SELL';
    else if (combinedScore < -30) recommendation = 'SELL';
  } else if (isDivergent) {
    confidence = confidence * 0.6; // -40% por divergência
    recommendation = 'HOLD'; // Quando diverge, é melhor esperar
  } else {
    // Sentimento neutro — segue técnico com cautela
    if (combinedScore > 40) recommendation = 'BUY';
    else if (combinedScore < -40) recommendation = 'SELL';
  }

  const reasoning = isConvergent
    ? `Convergência técnico (${technicalSignal}) + sentimento (${sentimentAnalysis.sentiment}). ${sentimentAnalysis.reasoning}`
    : isDivergent
    ? `Divergência: técnico ${technicalSignal} vs sentimento ${sentimentAnalysis.sentiment}. Cautela recomendada.`
    : `Sentimento neutro. Seguindo sinal técnico (${technicalSignal}) com cautela.`;

  console.log(`[RECOMMENDATION] ${symbol}: ${recommendation} (${confidence.toFixed(1)}%) - ${reasoning.slice(0, 80)}`);

  return {
    recommendation,
    confidence: Math.round(confidence),
    reasoning
  };
}

// ─── Rate Limiter ───

let lastSentimentCall = 0;
const SENTIMENT_COOLDOWN = 10000; // 10s entre chamadas (para respeitar rate limit Gemini)

/**
 * Analisa sentimento com rate limiting
 */
export async function analyzeSentimentThrottled(
  symbol: string,
  technicalContext: string
): Promise<SentimentAnalysis> {
  const now = Date.now();

  if (now - lastSentimentCall < SENTIMENT_COOLDOWN) {
    return {
      sentiment: 'NEUTRAL',
      confidence: 50,
      score: 0,
      reasoning: 'Rate limit: aguardando cooldown',
      keyFactors: [],
      riskFactors: [],
      timeframe: 'SHORT_TERM'
    };
  }

  lastSentimentCall = now;

  const news = await fetchRecentNews(symbol);
  return await analyzeSentimentWithGemini(symbol, news, technicalContext);
}
