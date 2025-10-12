import { NextResponse } from 'next/server';
import { CoinMarketCapResponse, CoinMarketCapCoin } from '@/app/types/crypto';

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
    const data: CoinMarketCapResponse = await response.json();
    const coinData: CoinMarketCapCoin = data.data[id];
    const prices = Object.values(coinData.quote.USD.history || []).map(
      (h: { timestamp: string; price: number }) => [new Date(h.timestamp).getTime(), h.price]
    );

    return NextResponse.json({ prices });
  } catch (error) {
    console.error('Error fetching price history:', error);
    return NextResponse.json({ error: 'Failed to fetch price history' }, { status: 500 });
  }
}