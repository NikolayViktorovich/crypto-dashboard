import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { coinData } = await request.json();
    
    if (!coinData) {
      return NextResponse.json({ error: 'Coin data is required' }, { status: 400 });
    }

    if (!process.env.HUGGINGFACE_API_KEY) {
      return NextResponse.json({ error: 'Hugging Face API key is not configured' }, { status: 500 });
    }

    console.log('Starting Hugging Face analysis for:', coinData.name);
    const prompt = `Ты финансовый аналитик. Проанализируй криптовалюту ${coinData.name} (${coinData.symbol}).
    
Данные:
- Текущая цена: $${coinData.current_price}
- Изменение за 24 часа: ${coinData.price_change_percentage_24h}%
- Рыночная капитализация: $${(coinData.market_cap / 1e9).toFixed(2)} миллиардов

Дай краткий анализ на русском языке включая:
1. Общую оценку ситуации
2. Основные риски
3. Рекомендацию

Будь кратким и конкретным.`;

    const models = [
      'microsoft/DialoGPT-large',
      'google/flan-t5-xxl',
      'bigscience/bloom-7b1',
      'facebook/blenderbot-400M-distill'
    ];

    let analysis = '';
    let lastError = '';

    for (const model of models) {
      try {
        console.log(`Trying model: ${model}`);
        
        const response = await fetch(
          `https://api-inference.huggingface.co/models/${model}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              inputs: prompt,
              parameters: {
                max_new_tokens: 500,
                temperature: 0.7,
                do_sample: true
              }
            }),
          }
        );

        if (response.ok) {
          const result = await response.json();
          
          if (Array.isArray(result) && result[0]?.generated_text) {
            analysis = result[0].generated_text;
            console.log(`Success with model: ${model}`);
            break;
          } else if (result.generated_text) {
            analysis = result.generated_text;
            console.log(`Success with model: ${model}`);
            break;
          }
        } else {
          const errorText = await response.text();
          lastError = `Model ${model}: ${response.status} - ${errorText}`;
          console.log(`Model ${model} failed:`, lastError);

          if (response.status === 503) {
            console.log('Model is loading, waiting...');
            await new Promise(resolve => setTimeout(resolve, 5000));
            continue;
          }
        }
      } catch (error) {
        lastError = `Model ${model}: ${error}`;
        console.log(`Model ${model} error:`, error);
        continue;
      }
    }

    if (!analysis) {
      analysis = generateFallbackAnalysis(coinData);
      console.log('Using fallback analysis');
    }

    console.log('Hugging Face analysis completed');

    return NextResponse.json({
      analysis,
      timestamp: new Date().toISOString(),
      model: "huggingface-multi"
    });

  } catch (error) {
    console.error('Hugging Face analysis error:', error);
    return NextResponse.json(
      { error: 'Не удалось получить анализ от AI' },
      { status: 500 }
    );
  }
}

function generateFallbackAnalysis(coinData: any) {
  const change = coinData.price_change_percentage_24h;
  const trend = change > 0 ? 'бычий' : change < 0 ? 'медвежий' : 'нейтральный';
  
  let recommendation = 'держать';
  if (change > 10) recommendation = 'покупать';
  if (change < -10) recommendation = 'продавать';

  return `Анализ ${coinData.name} (${coinData.symbol}):

ТЕХНИЧЕСКИЙ АНАЛИЗ:
• Тренд: ${trend}
• Цена: $${coinData.current_price}
• Изменение 24ч: ${change}%

РЕКОМЕНДАЦИЯ: ${recommendation.toUpperCase()}

ОБОСНОВАНИЕ:
${change > 5 ? 'Позитивная динамика указывает на интерес покупателей.' : 
  change < -5 ? 'Коррекция может представлять возможность для входа.' :
  'Рынок находится в консолидации.'}

РИСКИ:
• Волатильность крипторынка
• Общая рыночная зависимость

Обновлено: ${new Date().toLocaleString('ru-RU')}`;
}