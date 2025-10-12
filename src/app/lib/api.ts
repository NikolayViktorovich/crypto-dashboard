import { CoinMarket, MarketData, GlobalData } from '../types/crypto';

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';

export async function fetchTopCoins(attempt = 1): Promise<CoinMarket[]> {
  const url = `${COINGECKO_BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false`;
  console.log(`Fetching top coins (attempt ${attempt}): ${url}`);

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'CryptoDashboard/1.0 (your-email@example.com)' },
      signal: AbortSignal.timeout(15000), 
    });

    console.log(`Top coins response: ${res.status} - ${res.statusText}`);

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`Top coins API error: ${res.status} - ${errorText}`);
      if (res.status === 429 && attempt < 3) {
        console.log('Rate limit hit. Retrying in 60s...');
        await new Promise(resolve => setTimeout(resolve, 60000));
        return fetchTopCoins(attempt + 1);
      }
      throw new Error(`Top coins API error ${res.status}: ${errorText}`);
    }

    return res.json();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Top coins request timeout — попробуй позже');
    }
    console.error('Top coins fetch error:', error);
    throw error;
  }
}

export async function fetchCoinPriceHistory(coinId: string, attempt = 1): Promise<MarketData> {
  if (!coinId) {
    console.error('fetchCoinPriceHistory: coinId is empty or undefined');
    throw new Error('Invalid coin ID');
  }
  const url = `${COINGECKO_BASE}/coins/${coinId}/market_chart?vs_currency=usd&days=30`;
  console.log(`Fetching price history for ${coinId} (attempt ${attempt}): ${url}`);

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'CryptoDashboard/1.0 (your-email@example.com)' },
      signal: AbortSignal.timeout(15000),
    });

    console.log(`Price history response: ${res.status} - ${res.statusText}`);

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`Price history API error: ${res.status} - ${errorText}`);
      if (res.status === 429 && attempt < 3) {
        console.log('Rate limit hit. Retrying in 60s...');
        await new Promise(resolve => setTimeout(resolve, 60000));
        return fetchCoinPriceHistory(coinId, attempt + 1);
      }
      throw new Error(`Price history API error ${res.status}: ${errorText}`);
    }

    return res.json();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Price history request timeout — попробуй позже');
    }
    console.error('Price history fetch error:', error);
    throw error;
  }
}

export async function fetchGlobalData(attempt = 1): Promise<GlobalData> {
  const url = `${COINGECKO_BASE}/global`;
  console.log(`Fetching global data (attempt ${attempt}): ${url}`);

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'CryptoDashboard/1.0 (your-email@example.com)' },
      signal: AbortSignal.timeout(15000),
    });

    console.log(`Global data response: ${res.status} - ${res.statusText}`);

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`Global data API error: ${res.status} - ${errorText}`);
      if (res.status === 429 && attempt < 3) {
        console.log('Rate limit hit. Retrying in 60s...');
        await new Promise(resolve => setTimeout(resolve, 60000));
        return fetchGlobalData(attempt + 1);
      }
      throw new Error(`Global data API error ${res.status}: ${errorText}`);
    }

    return res.json();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Global data request timeout — попробуй позже');
    }
    console.error('Global data fetch error:', error);
    throw error;
  }
}