import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.COINMARKETCAP_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'API key is missing' }, { status: 500 });
  }

  try {
    const response = await fetch('https://pro-api.coinmarketcap.com/v1/global-metrics/quotes/latest', {
      headers: {
        'X-CMC_PRO_API_KEY': apiKey,
        'Accept': 'application/json',
      },
      method: 'GET',
    });
    const data = await response.json();
    const globalData = {
      data: {
        total_market_cap: { usd: data.data.quote.USD.total_market_cap },
        total_volume: { usd: data.data.quote.USD.total_volume_24h },
        active_cryptocurrencies: data.data.active_cryptocurrencies,
      },
    };
    return NextResponse.json(globalData);
  } catch (error) {
    console.error('Error fetching global data:', error);
    return NextResponse.json({ error: 'Failed to fetch global data' }, { status: 500 });
  }
}