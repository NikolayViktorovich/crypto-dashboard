import { CoinMarket, MarketData, GlobalData, CoinpaprikaTicker, CoinpaprikaHistoricalEntry, CoinpaprikaGlobalData, CoinGeckoCoin } from '../types/crypto';

const COINPAPRIKA_BASE = 'https://api.coinpaprika.com/v1';
const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';

export async function fetchTopCoins(attempt = 1): Promise<CoinMarket[]> {
  const url = `${COINPAPRIKA_BASE}/tickers?limit=10`;
  console.log(`Fetching top coins (attempt ${attempt}): ${url}`);

  try {
    const [paprikaRes, geckoRes] = await Promise.all([
      fetch(url, {
        headers: { 'User-Agent': 'CryptoDashboard/1.0 (your-email@example.com)' },
        signal: AbortSignal.timeout(15000),
      }),
      fetch(
        `${COINGECKO_BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false`,
        {
          headers: { 'User-Agent': 'CryptoDashboard/1.0 (your-email@example.com)' },
          signal: AbortSignal.timeout(15000),
        }
      ),
    ]);

    console.log(`Top coins response (Coinpaprika): ${paprikaRes.status} - ${paprikaRes.statusText}`);
    console.log(`Top coins response (CoinGecko): ${geckoRes.status} - ${geckoRes.statusText}`);

    if (!paprikaRes.ok) {
      const errorText = await paprikaRes.text();
      console.error(`Coinpaprika API error: ${paprikaRes.status} - ${errorText}`);
      if (paprikaRes.status === 429 && attempt < 3) {
        console.log('Rate limit hit (Coinpaprika). Retrying in 60s...');
        await new Promise(resolve => setTimeout(resolve, 60000));
        return fetchTopCoins(attempt + 1);
      }
      throw new Error(`Coinpaprika API error ${paprikaRes.status}: ${errorText}`);
    }

    if (!geckoRes.ok) {
      const errorText = await geckoRes.text();
      console.error(`CoinGecko API error: ${geckoRes.status} - ${errorText}`);
      if (geckoRes.status === 429 && attempt < 3) {
        console.log('Rate limit hit (CoinGecko). Retrying in 60s...');
        await new Promise(resolve => setTimeout(resolve, 60000));
        return fetchTopCoins(attempt + 1);
      }
      console.warn('CoinGecko failed; using empty string for images');
    }

    const paprikaData: CoinpaprikaTicker[] = await paprikaRes.json();
    const geckoData: CoinGeckoCoin[] = geckoRes.ok ? await geckoRes.json() : [];
    const geckoImageMap = new Map(geckoData.map((coin: CoinGeckoCoin) => [coin.id, coin.image]));

    return paprikaData.map((coin: CoinpaprikaTicker) => ({
      id: coin.id,
      symbol: coin.symbol,
      name: coin.name,
      image: geckoImageMap.get(coin.id.replace(/-.*/, '')) || '',
      current_price: coin.quotes.USD.price,
      market_cap: coin.quotes.USD.market_cap,
      price_change_percentage_24h: coin.quotes.USD.percent_change_24h,
      total_volume: coin.quotes.USD.volume_24h,
    }));
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
  const url = `${COINPAPRIKA_BASE}/tickers/${coinId}/historical?start=${
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  }&interval=1d`;
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

    const data: CoinpaprikaHistoricalEntry[] = await res.json();
    return {
      prices: data.map((entry: CoinpaprikaHistoricalEntry) => [
        new Date(entry.timestamp).getTime(),
        entry.price,
      ]),
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Price history request timeout — попробуй позже');
    }
    console.error('Price history fetch error:', error);
    throw error;
  }
}

export async function fetchGlobalData(attempt = 1): Promise<GlobalData> {
  const url = `${COINPAPRIKA_BASE}/global`;
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

    const data: CoinpaprikaGlobalData = await res.json();
    return {
      data: {
        total_market_cap: { usd: data.market_cap_usd },
        total_volume: { usd: data.volume_24h_usd },
        active_cryptocurrencies: data.active_cryptocurrencies,
      },
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Global data request timeout — попробуй позже');
    }
    console.error('Global data fetch error:', error);
    throw error;
  }
}