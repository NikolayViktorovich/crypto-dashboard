import { NextResponse } from 'next/server';
import { CoinMarketCapQuoteResponse } from '@/app/types/crypto';

export const maxDuration = 60;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const apiKey = process.env.COINMARKETCAP_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'API key is missing' }, { status: 500 });
  }
  if (!id) {
    return NextResponse.json({ error: 'Coin ID is required' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?id=${id}`,
      {
        headers: {
          'X-CMC_PRO_API_KEY': apiKey,
          Accept: 'application/json',
        },
        method: 'GET',
      }
    );

    if (!response.ok) {
      throw new Error(`CoinMarketCap API responded with status: ${response.status}`);
    }

    const data: CoinMarketCapQuoteResponse = await response.json();
    const coinData = data.data[id];

    if (!coinData) {
      return NextResponse.json({ error: 'Coin not found' }, { status: 404 });
    }

    // The quotes/latest endpoint doesn't provide historical data
    // You'll need to use a different approach for price history
    // For now, return current price data
    const currentPriceData = {
      current_price: coinData.quote.USD.price,
      price_change_percentage_24h: coinData.quote.USD.percent_change_24h,
      market_cap: coinData.quote.USD.market_cap,
    };

    return NextResponse.json(currentPriceData);
  } catch (error) {
    console.error('Error fetching coin data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch coin data';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}