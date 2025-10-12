export interface CoinMarketCapResponse {
  data: {
    [id: string]: CoinMarketCapCoin;
  };
}

export interface CoinMarketCapCoin {
  quote: {
    USD: {
      history?: { timestamp: string; price: number }[];
    };
  };
}

export interface CoinpaprikaTicker {
  id: string;
  symbol: string;
  name: string;
  quotes: {
    USD: {
      price: number;
      market_cap: number;
      percent_change_24h: number;
      volume_24h: number;
    };
  };
}

export interface CoinpaprikaHistoricalEntry {
  timestamp: string;
  price: number;
}

export interface CoinpaprikaGlobalData {
  market_cap_usd: number;
  volume_24h_usd: number;
  active_cryptocurrencies: number;
}

export interface CoinGeckoCoin {
  id: string;
  image: string;
}

export interface CoinMarket {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  price_change_percentage_24h: number;
  total_volume: number;
}

export interface MarketData {
  prices: [number, number][];
}

export interface GlobalData {
  data: {
    total_market_cap: { usd: number };
    total_volume: { usd: number };
    active_cryptocurrencies: number;
  };
}