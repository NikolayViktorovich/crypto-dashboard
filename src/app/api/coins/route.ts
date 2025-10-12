import { NextResponse } from 'next/server';
import { CoinMarket } from '@/app/types/crypto';

export async function GET() {
  try {
    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false`;
    const res = await fetch(url, {
      cache: 'force-cache', 
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('CoinGecko API error:', res.status, errorText);
      return NextResponse.json({ error: `API Error ${res.status}: ${errorText}` }, { status: res.status });
    }

    const coins: CoinMarket[] = await res.json();
    return NextResponse.json(coins);
  } catch (error) {
    console.error('Top coins fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch top coins' }, { status: 500 });
  }
}