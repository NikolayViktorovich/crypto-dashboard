export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface AIChat {
  coinId: string;
  coinName: string;
  messages: AIMessage[];
  isAnalyzing: boolean;
}

export interface AIAnalysisResponse {
  analysis: string;
  timestamp: string;
  model: string;
  error?: string;
  fallback?: boolean;
}

export interface TechnicalIndicators {
  rsi: number;
  macd: {
    value: number;
    signal: number;
    histogram: number;
  };
  moving_averages: {
    sma_20: number;
    sma_50: number;
    sma_200: number;
  };
  volume: number;
  volatility: number;
}

export interface AIPrediction {
  trend: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  recommendation: 'buy' | 'sell' | 'hold' | 'strong_buy' | 'strong_sell';
  price_targets: {
    short_term: number;
    medium_term: number;
    long_term: number;
  };
  key_levels: {
    support: number[];
    resistance: number[];
  };
  analysis: string;
  risks: string[];
  opportunities: string[];
  timestamp: string;
}