'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions,
  Chart,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MagnifyingGlassIcon,
  Cross2Icon,
  PaperPlaneIcon,
  ReloadIcon,
  ChevronRightIcon
} from '@radix-ui/react-icons';
import { CoinMarket, GlobalData, MarketData } from './types/crypto';
import { AIMessage, AIChat, AIAnalysisResponse } from './types/ai-analysis';
import { fetchTopCoins, fetchCoinPriceHistory, fetchGlobalData } from './lib/api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function Dashboard() {
  const [topCoins, setTopCoins] = useState<CoinMarket[]>([]);
  const [selectedCoin, setSelectedCoin] = useState<CoinMarket | null>(null);
  const [priceHistory, setPriceHistory] = useState<MarketData | null>(null);
  const [globalData, setGlobalData] = useState<GlobalData | null>(null);
  const [aiChat, setAiChat] = useState<AIChat | null>(null);
  const [userMessage, setUserMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const chartRef = useRef<Chart<'line', number[], string> | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const isMobile = typeof window !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [aiChat?.messages]);

  useEffect(() => {
    if (!isMobile) {
      import('chartjs-plugin-zoom').then((zoom) => {
        ChartJS.register(zoom.default);
      });
    }
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        const [coins, global] = await Promise.all([
          fetchTopCoins().catch(() => {
            throw new Error('Не удалось загрузить топ монет.');
          }),
          fetchGlobalData().catch(() => {
            throw new Error('Не удалось загрузить глобальные данные.');
          }),
        ]);
        setTopCoins(coins);
        setSelectedCoin(coins[0]);
        setGlobalData(global);
        localStorage.setItem('topCoins', JSON.stringify(coins));
        localStorage.setItem('globalData', JSON.stringify(global));
      } catch (error) {
        console.error('Error loading data:', error);
        const errorMessage = error instanceof Error ? error.message : 'Не удалось загрузить данные. Попробуйте позже.';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }

    const cachedCoins = localStorage.getItem('topCoins');
    const cachedGlobal = localStorage.getItem('globalData');
    if (cachedCoins && cachedGlobal) {
      setTopCoins(JSON.parse(cachedCoins));
      setGlobalData(JSON.parse(cachedGlobal));
      setLoading(false);
    } else {
      loadData();
    }
  }, []);

  useEffect(() => {
    if (selectedCoin) {
      fetchCoinPriceHistory(selectedCoin.id)
        .then(setPriceHistory)
        .catch(() => setError(`Не удалось загрузить историю цен для ${selectedCoin.name}.`));

      setAiChat({
        coinId: selectedCoin.id,
        coinName: selectedCoin.name,
        messages: [],
        isAnalyzing: false
      });
    }
  }, [selectedCoin]);

  const sendMessageToAI = async (message: string = '') => {
    if (!selectedCoin || !aiChat) return;

    const finalMessage = message || userMessage;
    if (!finalMessage.trim()) return;

    const userMessageObj: AIMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: finalMessage,
      timestamp: new Date()
    };

    setAiChat(prev => prev ? {
      ...prev,
      messages: [...prev.messages, userMessageObj],
      isAnalyzing: true
    } : null);

    setUserMessage('');

    try {
      const response = await fetch('/api/deepseek', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coinId: selectedCoin.id,
          coinData: selectedCoin
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data: AIAnalysisResponse = await response.json();

      const aiMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.analysis,
        timestamp: new Date()
      };

      setAiChat(prev => prev ? {
        ...prev,
        messages: [...prev.messages, aiMessage],
        isAnalyzing: false
      } : null);

    } catch (error) {
      console.error('AI analysis failed:', error);
      
      const errorMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Не удалось получить анализ от AI. Пожалуйста, проверьте настройки OpenAI API ключа или попробуйте позже.',
        timestamp: new Date()
      };

      setAiChat(prev => prev ? {
        ...prev,
        messages: [...prev.messages, errorMessage],
        isAnalyzing: false
      } : null);
    }
  };

  const quickAnalyze = (type: string) => {
    const prompts: { [key: string]: string } = {
      technical: 'Проведи подробный технический анализ. Какие ключевые уровни поддержки и сопротивления? Какие индикаторы показывают?',
      fundamental: 'Сделай фундаментальный анализ. Насколько перспективен этот проект? Какие у него сильные и слабые стороны?',
      prediction: 'Дай прогноз цены на ближайшие неделю, месяц и квартал. На чем основаны твои прогнозы?',
      risks: 'Какие основные риски у этой монеты? Что может пойти не так?'
    };

    sendMessageToAI(prompts[type]);
  };

  const filteredCoins = topCoins.filter(coin =>
    coin.name.toLowerCase().includes(search.toLowerCase())
  );

  const clearSearch = () => setSearch('');

  const chartData: ChartData<'line', number[], string> | null = priceHistory
    ? {
        labels: priceHistory.prices.map((priceEntry: [number, number]) =>
          new Date(priceEntry[0]).toLocaleDateString()
        ),
        datasets: [
          {
            label: selectedCoin ? `${selectedCoin.name} (USD)` : 'Price (USD)',
            data: priceHistory.prices.map((priceEntry: [number, number]) => priceEntry[1]),
            borderColor: '#00ff88',
            backgroundColor: 'rgba(0, 255, 136, 0.1)',
            borderWidth: 2,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 4,
            fill: true,
          },
        ],
      }
    : null;

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        position: 'top' as const, 
        labels: { 
          color: '#888',
          font: { size: 11 },
          usePointStyle: true
        } 
      },
      title: { 
        display: false
      },
      tooltip: { 
        enabled: true,
        backgroundColor: '#1a1a1a',
        titleColor: '#00ff88',
        bodyColor: '#ccc',
        borderColor: '#333',
        borderWidth: 1
      },
      zoom: isMobile ? undefined : {
        zoom: { 
          wheel: { enabled: true }, 
          pinch: { enabled: true }, 
          mode: 'xy' as const 
        },
        pan: { 
          enabled: true, 
          mode: 'xy' as const 
        },
      },
    },
    scales: {
      x: { 
        grid: { 
          color: '#2a2a2a',
        },
        ticks: { 
          color: '#666',
          font: { size: 10 }
        },
        border: {
          color: '#333'
        }
      },
      y: { 
        grid: { 
          color: '#2a2a2a',
        },
        ticks: { 
          color: '#666',
          font: { size: 10 }
        },
        border: {
          color: '#333'
        }
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col justify-center items-center">
        <div className="text-2xl text-[#00ff88] font-bold mb-4">CRYPTO TERMINAL</div>
        <div className="text-gray-400">Загрузка данных...</div>
        <div className="mt-4 w-32 h-1 bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-[#00ff88] animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex flex-col justify-center items-center">
        <div className="text-2xl text-[#00ff88] font-bold mb-4">CRYPTO TERMINAL</div>
        <div className="text-red-400 text-center max-w-md">{error}</div>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-6 px-6 py-2 bg-[#00ff88] text-black font-bold hover:bg-[#00cc6a] transition-colors"
        >
          ПОВТОРИТЬ
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-gray-200">
      {/* Header */}
      <div className="border-b border-gray-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl text-[#00ff88] font-bold">CRYPTO TERMINAL</h1>
              <div className="text-xs text-gray-500 mt-1">AI-POWERED MARKET ANALYSIS</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400">Режим: Торговый</div>
              <div className="text-xs text-gray-600">v2.1.4</div>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="border-b border-gray-800 bg-[#0a0a0a]">
        <div className="container mx-auto px-4 py-3">
          <div className="relative max-w-2xl">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
            <input
              type="text"
              placeholder="ПОИСК АКТИВА..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-10 py-2 bg-[#1a1a1a] border border-gray-800 text-white placeholder-gray-500 focus:outline-none focus:border-[#00ff88] focus:ring-1 focus:ring-[#00ff88] text-sm"
            />
            {search && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
              >
                <Cross2Icon className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Market Stats */}
      <div className="border-b border-gray-800 bg-[#0a0a0a]">
        <div className="container mx-auto px-4 py-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">Общая кап.</div>
              <div className="text-[#00ff88] font-bold text-sm">
                {globalData?.data?.total_market_cap?.usd
                  ? `$${(globalData.data.total_market_cap.usd / 1e12).toFixed(1)}T`
                  : '--'}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">Объем 24ч</div>
              <div className="text-[#00ff88] font-bold text-sm">
                {globalData?.data?.total_volume?.usd
                  ? `$${(globalData.data.total_volume.usd / 1e9).toFixed(1)}B`
                  : '--'}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">Активы</div>
              <div className="text-[#00ff88] font-bold text-sm">
                {globalData?.data?.active_cryptocurrencies?.toLocaleString() ?? '--'}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">Выбрано</div>
              <div className="text-[#00ff88] font-bold text-sm">
                {selectedCoin?.symbol.toUpperCase() || '--'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Assets List */}
          <div className="xl:col-span-1">
            <div className="bg-[#0a0a0a] border border-gray-800 rounded-lg">
              <div className="border-b border-gray-800 px-4 py-3">
                <h2 className="text-[#00ff88] font-bold text-sm uppercase tracking-wider">ТОП АКТИВЫ</h2>
              </div>
              <div className="max-h-[600px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left py-3 px-4 text-gray-500 font-normal">#</th>
                      <th className="text-left py-3 px-4 text-gray-500 font-normal">АКТИВ</th>
                      <th className="text-right py-3 px-4 text-gray-500 font-normal">ЦЕНА</th>
                      <th className="text-right py-3 px-4 text-gray-500 font-normal hidden sm:table-cell">24Ч</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCoins.map((coin, idx) => (
                      <tr
                        key={coin.id}
                        className={`border-b border-gray-800 cursor-pointer transition-all ${
                          selectedCoin?.id === coin.id
                            ? 'border-l-4 border-l-[#00ff88]'
                            : 'border-l-4 border-l-transparent hover:border-l-[#00ff88]'
                        }`}
                        onClick={() => setSelectedCoin(coin)}
                      >
                        <td className="py-3 px-4 text-gray-400">{idx + 1}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            {coin.image && (
                              <img
                                src={coin.image}
                                alt={coin.name}
                                className="w-5 h-5 rounded"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            )}
                            <div>
                              <div className="text-white font-medium text-sm">{coin.symbol.toUpperCase()}</div>
                              <div className="text-gray-500 text-xs">{coin.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right text-white font-medium text-sm">
                          ${coin.current_price.toFixed(2)}
                        </td>
                        <td className={`py-3 px-4 text-right hidden sm:table-cell font-medium text-sm ${
                          coin.price_change_percentage_24h >= 0 ? 'text-[#00ff88]' : 'text-[#ff4444]'
                        }`}>
                          {coin.price_change_percentage_24h >= 0 ? '+' : ''}{coin.price_change_percentage_24h.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Chart and AI Panel */}
          <div className="xl:col-span-3 space-y-6">
            {/* Chart */}
            <div className="bg-[#0a0a0a] border border-gray-800 rounded-lg">
              <div className="border-b border-gray-800 px-4 py-3">
                <div className="flex justify-between items-center">
                  <h2 className="text-[#00ff88] font-bold text-sm uppercase tracking-wider">
                    {selectedCoin ? `${selectedCoin.name} (${selectedCoin.symbol.toUpperCase()})` : 'ВЫБЕРИТЕ АКТИВ'}
                  </h2>
                  <div className="text-gray-500 text-sm">
                    {selectedCoin && `$${selectedCoin.current_price.toLocaleString()}`}
                  </div>
                </div>
              </div>
              <div className="p-4">
                {selectedCoin && chartData && (
                  <div className="h-80">
                    <Line data={chartData} options={options} ref={chartRef} />
                  </div>
                )}
              </div>
            </div>

            {/* AI Terminal */}
            <div className="bg-[#0a0a0a] border border-gray-800 rounded-lg">
              <div className="border-b border-gray-800 px-4 py-3">
                <div className="flex justify-between items-center">
                  <h2 className="text-[#00ff88] font-bold text-sm uppercase tracking-wider">AI АНАЛИТИК</h2>
                  {selectedCoin && (
                    <div className="text-gray-500 text-xs bg-[#1a1a1a] px-2 py-1 rounded">
                      Анализ: {selectedCoin.symbol.toUpperCase()}
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              {selectedCoin && aiChat && aiChat.messages.length === 0 && (
                <div className="border-b border-gray-800 px-4 py-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {[
                      { key: 'technical', label: 'ТЕХ. АНАЛИЗ', color: 'bg-blue-600 hover:bg-blue-700' },
                      { key: 'fundamental', label: 'ФУНД. АНАЛИЗ', color: 'bg-purple-600 hover:bg-purple-700' },
                      { key: 'prediction', label: 'ПРОГНОЗ', color: 'bg-green-600 hover:bg-green-700' },
                      { key: 'risks', label: 'РИСКИ', color: 'bg-red-600 hover:bg-red-700' }
                    ].map((action) => (
                      <button
                        key={action.key}
                        onClick={() => quickAnalyze(action.key)}
                        className={`${action.color} text-white text-xs font-medium py-2 px-3 rounded transition-colors uppercase tracking-wider`}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Chat Messages */}
              <div 
                ref={chatContainerRef} 
                className="h-64 overflow-y-auto p-4 space-y-3"
              >
                {aiChat && aiChat.messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500 text-center">
                    <div className="text-3xl mb-3">⚡</div>
                    <div className="text-sm uppercase tracking-wider mb-1">AI TERMINAL READY</div>
                    <div className="text-xs">Выберите актив и начните анализ</div>
                  </div>
                ) : (
                  aiChat?.messages.map((message) => (
                    <div 
                      key={message.id} 
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[85%] p-3 rounded-lg text-sm border ${
                        message.role === 'user' 
                          ? 'bg-[#1a1a1a] border-gray-800 text-white' 
                          : 'bg-[#1a1a1a] border-gray-800 text-white'
                      }`}>
                        <div className="whitespace-pre-wrap leading-relaxed">{message.content}</div>
                        <div className="text-xs opacity-50 mt-2">
                          {message.timestamp.toLocaleTimeString('ru-RU', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                {aiChat?.isAnalyzing && (
                  <div className="flex justify-start">
                    <div className="bg-[#1a1a1a] border border-gray-800 p-3 rounded-lg">
                      <div className="flex items-center space-x-2 text-sm text-gray-400">
                        <ReloadIcon className="w-4 h-4 animate-spin" />
                        <span className="uppercase tracking-wider">AI АНАЛИЗИРУЕТ...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="border-t border-gray-800 p-4">
                <div className="flex space-x-3">
                  <input
                    type="text"
                    value={userMessage}
                    onChange={(e) => setUserMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessageToAI()}
                    placeholder="ВВЕДИТЕ ЗАПРОС ДЛЯ AI..."
                    className="flex-1 bg-[#1a1a1a] border border-gray-800 text-white placeholder-gray-500 px-4 py-2 focus:outline-none focus:border-[#00ff88] focus:ring-1 focus:ring-[#00ff88] text-sm"
                    disabled={aiChat?.isAnalyzing}
                  />
                  <button
                    onClick={() => sendMessageToAI()}
                    disabled={aiChat?.isAnalyzing}
                    className="bg-[#00ff88] text-black px-4 py-2 font-medium text-sm hover:bg-[#00cc6a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors uppercase tracking-wider flex items-center space-x-2"
                  >
                    <span>ВВОД</span>
                    <ChevronRightIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="border-t border-gray-800 bg-[#0a0a0a]">
        <div className="container mx-auto px-4 py-2">
          <div className="flex justify-between items-center text-xs text-gray-500">
            <div>CRYPTO TERMINAL v2.1.4</div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-[#00ff88] rounded-full"></div>
                <span>AI ONLINE</span>
              </div>
              <div>{new Date().toLocaleString('ru-RU')}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}