import { NextResponse } from 'next/server';
import { CoinMarketCapResponse } from '@/app/types/crypto';

export const maxDuration = 60;

export async function GET() {
  const apiKey = process.env.COINMARKETCAP_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'API key is missing' }, { status: 500 });
  }

  try {
    const response = await fetch('https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest', {
      headers: {
        'X-CMC_PRO_API_KEY': apiKey,
        'Accept': 'application/json',
      },
      method: 'GET',
    });
    
    if (!response.ok) {
      throw new Error(`CoinMarketCap API responded with status: ${response.status}`);
    }
    
    const data: CoinMarketCapResponse = await response.json();
    
    const topCoins = data.data.slice(0, 10).map((coin) => ({
      id: coin.id.toString(),
      name: coin.name,
      symbol: coin.symbol,
      image: `https://coinmarketcap.com/currencies/${coin.slug}/logo.png`,
      current_price: coin.quote.USD.price,
      price_change_percentage_24h: coin.quote.USD.percent_change_24h,
      market_cap: coin.quote.USD.market_cap,
    }));
    
    return NextResponse.json(topCoins);
  } catch (error) {
    console.error('Error fetching coins:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch coins';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}