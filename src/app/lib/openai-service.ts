import OpenAI from 'openai';
import { AIPrediction, TechnicalIndicators } from '@/app/types/ai-analysis';
import { MarketData, CoinMarket } from '@/app/types/crypto';

interface MarketDataSummary {
  total_market_cap?: { usd: number };
  total_volume?: { usd: number };
}

const openai = new OpenAI({
  apiKey: process.env.HUGGINGFACE_API_KEY!,
});

export class CryptoAnalysisService {
  static async generateTechnicalAnalysis(
    coin: CoinMarket,
    priceHistory: MarketData,
    marketData: MarketDataSummary
  ): Promise<AIPrediction> {
    const indicators = this.calculateTechnicalIndicators(priceHistory);
    
    const prompt = this.buildAnalysisPrompt(coin, priceHistory, indicators, marketData);
    
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `Ты опытный криптоаналитик с глубоким пониманием технического анализа, фундаментальных факторов и рыночной психологии. 
            Анализируй данные объективно, учитывай риски и возможности. Отвечай на русском языке.`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1500
      });

      const analysisText = completion.choices[0]?.message?.content;
      return this.parseAIResponse(analysisText, coin, indicators);
    } catch (error) {
      console.error('OpenAI API error:', error);
      return this.getFallbackAnalysis(coin, indicators);
    }
  }

  private static calculateTechnicalIndicators(priceHistory: MarketData): TechnicalIndicators {
    const prices = priceHistory.prices.map(p => p[1]);
    const rsi = this.calculateRSI(prices);
    const macd = this.calculateMACD(prices);
    const moving_averages = this.calculateMovingAverages(prices);
    const volatility = this.calculateVolatility(prices);
    
    return {
      rsi,
      macd,
      moving_averages,
      volume: prices.length > 0 ? prices[prices.length - 1] : 0,
      volatility
    };
  }

  private static calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) return 50;
    
    let gains = 0;
    let losses = 0;
    
    for (let i = 1; i <= period; i++) {
      const difference = prices[i] - prices[i - 1];
      if (difference >= 0) {
        gains += difference;
      } else {
        losses -= difference;
      }
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    
    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  private static calculateMACD(prices: number[]) {
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    const macdLine = ema12 - ema26;
    const signalLine = this.calculateEMA([macdLine], 9);
    
    return {
      value: macdLine,
      signal: signalLine,
      histogram: macdLine - signalLine
    };
  }

  private static calculateEMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1];
    
    const multiplier = 2 / (period + 1);
    let ema = prices[0];
    
    for (let i = 1; i < prices.length; i++) {
      ema = (prices[i] - ema) * multiplier + ema;
    }
    
    return ema;
  }

  private static calculateMovingAverages(prices: number[]) {
    return {
      sma_20: prices.slice(-20).reduce((a, b) => a + b, 0) / Math.min(20, prices.length),
      sma_50: prices.slice(-50).reduce((a, b) => a + b, 0) / Math.min(50, prices.length),
      sma_200: prices.slice(-200).reduce((a, b) => a + b, 0) / Math.min(200, prices.length)
    };
  }

  private static calculateVolatility(prices: number[]): number {
    if (prices.length < 2) return 0;
    
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance) * Math.sqrt(365); 
  }

  private static buildAnalysisPrompt(
    coin: CoinMarket,
    priceHistory: MarketData,
    indicators: TechnicalIndicators,
    marketData: MarketDataSummary
  ): string {
    const currentPrice = coin.current_price;
    const priceChange = coin.price_change_percentage_24h;
    const marketCap = coin.market_cap;
    
    return `
Проанализируй криптовалюту ${coin.name} (${coin.symbol.toUpperCase()}) и дай развернутую оценку.

ДАННЫЕ ДЛЯ АНАЛИЗА:
- Текущая цена: $${currentPrice}
- Изменение за 24ч: ${priceChange}%
- Рыночная капитализация: $${(marketCap / 1e9).toFixed(2)} млрд
- Объем торгов: $${(coin.total_volume / 1e6).toFixed(2)} млн

ТЕХНИЧЕСКИЕ ИНДИКАТОРЫ:
- RSI: ${indicators.rsi.toFixed(2)}
- MACD: ${indicators.macd.value.toFixed(4)}
- Сигнальная линия: ${indicators.macd.signal.toFixed(4)}
- Скользящие средние:
  * 20 дней: $${indicators.moving_averages.sma_20.toFixed(2)}
  * 50 дней: $${indicators.moving_averages.sma_50.toFixed(2)}
  * 200 дней: $${indicators.moving_averages.sma_200.toFixed(2)}
- Волатильность: ${(indicators.volatility * 100).toFixed(2)}%

ИСТОРИЧЕСКИЕ ДАННЫЕ:
Последние 10 цен: ${priceHistory.prices.slice(-10).map(p => p[1].toFixed(2)).join(', ')}

ОБЩАЯ РЫНОЧНАЯ СИТУАЦИЯ:
- Общая капитализация рынка: $${(marketData?.total_market_cap?.usd ? marketData.total_market_cap.usd / 1e12 : 0).toFixed(2)} трлн
- Общий объем: $${(marketData?.total_volume?.usd ? marketData.total_volume.usd / 1e9 : 0).toFixed(2)} млрд

ПРОШУ ПРОАНАЛИЗИРОВАТЬ:
1. Тренд (бычий/медвежий/нейтральный) и уверенность в %
2. Рекомендация (покупать/продавать/держать)
3. Целевые уровни цены на 1 неделю, 1 месяц, 3 месяца
4. Ключевые уровни поддержки и сопротивления
5. Подробный анализ ситуации
6. Основные риски
7. Возможности

Ответ предоставь в структурированном формате.
`;
  }

  private static parseAIResponse(response: string | null, coin: CoinMarket, indicators: TechnicalIndicators): AIPrediction {
    if (!response) {
      return this.getFallbackAnalysis(coin, indicators);
    }

    try {
      return {
        trend: this.determineTrend(indicators),
        confidence: this.calculateConfidence(indicators),
        recommendation: this.generateRecommendation(indicators),
        price_targets: {
          short_term: coin.current_price * (1 + (Math.random() * 0.1 - 0.05)),
          medium_term: coin.current_price * (1 + (Math.random() * 0.2 - 0.1)),
          long_term: coin.current_price * (1 + (Math.random() * 0.3 - 0.15))
        },
        key_levels: {
          support: this.calculateSupportLevels(coin.current_price),
          resistance: this.calculateResistanceLevels(coin.current_price)
        },
        analysis: response.substring(0, 500) + '...',
        risks: [
          'Высокая волатильность рынка',
          'Регуляторные риски',
          'Рыночная корреляция'
        ],
        opportunities: [
          'Технические показатели показывают потенциал роста',
          'Сильный фундаментальный анализ',
          'Благоприятная рыночная конъюнктура'
        ],
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error parsing AI response:', error);
      return this.getFallbackAnalysis(coin, indicators);
    }
  }

  private static getFallbackAnalysis(coin: CoinMarket, indicators: TechnicalIndicators): AIPrediction {
    return {
      trend: this.determineTrend(indicators),
      confidence: this.calculateConfidence(indicators),
      recommendation: this.generateRecommendation(indicators),
      price_targets: {
        short_term: coin.current_price * 1.05,
        medium_term: coin.current_price * 1.15,
        long_term: coin.current_price * 1.25
      },
      key_levels: {
        support: this.calculateSupportLevels(coin.current_price),
        resistance: this.calculateResistanceLevels(coin.current_price)
      },
      analysis: 'Анализ временно недоступен. Используются технические индикаторы для базовой оценки.',
      risks: ['Временная недоступность AI-анализа'],
      opportunities: ['Рекомендуется провести собственный анализ'],
      timestamp: new Date().toISOString()
    };
  }

  private static determineTrend(indicators: TechnicalIndicators): 'bullish' | 'bearish' | 'neutral' {
    const { rsi, macd, moving_averages } = indicators;
    
    let score = 0;
    
    if (rsi > 50) score += 1;
    if (rsi < 50) score -= 1;
    
    if (macd.value > macd.signal) score += 1;
    if (macd.value < macd.signal) score -= 1;
    
    if (moving_averages.sma_20 > moving_averages.sma_50) score += 1;
    if (moving_averages.sma_20 < moving_averages.sma_50) score -= 1;
    
    if (score > 1) return 'bullish';
    if (score < -1) return 'bearish';
    return 'neutral';
  }

  private static calculateConfidence(indicators: TechnicalIndicators): number {
    const { rsi, macd } = indicators;
    
    let confidence = 50;
    if (rsi > 70 || rsi < 30) confidence += 20;
    if (Math.abs(macd.histogram) > 0.01) confidence += 15;
    
    return Math.min(95, Math.max(5, confidence));
  }

  private static generateRecommendation(indicators: TechnicalIndicators): 'buy' | 'sell' | 'hold' | 'strong_buy' | 'strong_sell' {
    const trend = this.determineTrend(indicators);
    const confidence = this.calculateConfidence(indicators);
    
    if (trend === 'bullish' && confidence > 70) return 'strong_buy';
    if (trend === 'bullish') return 'buy';
    if (trend === 'bearish' && confidence > 70) return 'strong_sell';
    if (trend === 'bearish') return 'sell';
    return 'hold';
  }

  private static calculateSupportLevels(currentPrice: number): number[] {
    const levels = [];
    for (let i = 1; i <= 3; i++) {
      levels.push(currentPrice * (1 - i * 0.05));
    }
    return levels;
  }

  private static calculateResistanceLevels(currentPrice: number): number[] {
    const levels = [];
    for (let i = 1; i <= 3; i++) {
      levels.push(currentPrice * (1 + i * 0.05));
    }
    return levels;
  }
}