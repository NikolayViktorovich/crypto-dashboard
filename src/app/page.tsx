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
import { SunIcon, MoonIcon, ZoomInIcon, ZoomOutIcon, ResetIcon, Cross2Icon } from '@radix-ui/react-icons';
import { CoinMarket, GlobalData, MarketData } from '../app/types/crypto';
import { fetchTopCoins, fetchCoinPriceHistory, fetchGlobalData } from '../app/lib/api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function Dashboard() {
  const [topCoins, setTopCoins] = useState<CoinMarket[]>([]);
  const [selectedCoin, setSelectedCoin] = useState<CoinMarket | null>(null);
  const [priceHistory, setPriceHistory] = useState<MarketData | null>(null);
  const [globalData, setGlobalData] = useState<GlobalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const chartRef = useRef<Chart<'line', number[], string> | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('chartjs-plugin-zoom').then((zoom) => {
        ChartJS.register(zoom.default);
      });
    }
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const initialTheme = savedTheme || 'dark';
    setTheme(initialTheme);
    document.documentElement.setAttribute('data-theme', initialTheme);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    async function loadData() {
      try {
        const [coins, global] = await Promise.all([fetchTopCoins(), fetchGlobalData()]);
        setTopCoins(coins);
        setSelectedCoin(coins[0]);
        setGlobalData(global);
      } catch (error) {
        console.error('Error loading data:', error);
        setError('Failed to load data. Please try again later.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    if (selectedCoin) {
      fetchCoinPriceHistory(selectedCoin.id)
        .then(setPriceHistory)
        .catch(() => setError('Failed to load price history.'));
    }
  }, [selectedCoin]);

  const filteredCoins = topCoins.filter(coin =>
    coin.name.toLowerCase().includes(search.toLowerCase())
  );

  const clearSearch = () => {
    setSearch('');
  };

  const chartData: ChartData<'line', number[], string> | null = priceHistory
    ? {
        labels: priceHistory.prices.map(([timestamp]: [number, number]) =>
          new Date(timestamp).toLocaleDateString()
        ),
        datasets: [
          {
            label: selectedCoin ? `${selectedCoin.name} Price (USD)` : 'Price (USD)',
            data: priceHistory.prices.map(([_, price]: [number, number]) => price),
            borderColor: theme === 'dark' ? '#c7c7c7ff' : 'var(--accent)',
            backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(59, 130, 246, 0.1)',
            tension: 0.4,
            pointRadius: 3,
            pointHoverRadius: 6,
          },
        ],
      }
    : null;

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const, labels: { font: { size: 12 } } },
      title: { 
        display: true, 
        text: 'Цена за 30 дней', 
        font: { family: 'Montserrat', size: 16 } 
      },
      tooltip: { enabled: true },
      zoom: {
        zoom: {
          wheel: { enabled: true },
          pinch: { enabled: true },
          mode: 'xy' as const,
        },
        pan: {
          enabled: true,
          mode: 'xy' as const,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 10 } }, 
      },
      y: {
        grid: { color: 'var(--card-border)' },
        ticks: { font: { size: 10 } },
      },
    },
  };

  const zoomIn = () => {
    if (chartRef.current) {
      chartRef.current.zoom(1.1);
    }
  };

  const zoomOut = () => {
    if (chartRef.current) {
      chartRef.current.zoom(0.9);
    }
  };

  const resetZoom = () => {
    if (chartRef.current) {
      chartRef.current.resetZoom();
    }
  };

  if (loading) {
    return (
      <motion.div
        className="flex justify-center items-center h-screen"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-lg sm:text-2xl font-semibold">Загрузка...</div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        className="flex justify-center items-center h-screen text-red-500"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-lg sm:text-2xl font-semibold">{error}</div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="min-h-screen p-4 sm:p-6 md:p-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <motion.div
        className="flex justify-between items-center mb-6"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold">Crypto Dashboard</h1>
        <motion.button
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          className="theme-toggle p-3 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          {theme === 'light' ? <MoonIcon className="w-6 h-6" /> : <SunIcon className="w-6 h-6" />}
        </motion.button>
      </motion.div>

      {/* Поиск */}
      <motion.div
        className="mb-6 relative"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <input
          type="text"
          placeholder="Поиск монет..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full p-3 pr-12 sm:pr-10 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all text-sm sm:text-base"
        />
        {search && (
          <motion.button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors p-2"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Cross2Icon className="w-5 h-5" />
          </motion.button>
        )}
      </motion.div>

      {/* Глобальная статистика */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <div className="card p-4 sm:p-6 text-center">
          <h2 className="text-sm sm:text-lg font-medium text-[var(--text-secondary)]">Общая капитализация</h2>
          <p className="text-lg sm:text-2xl font-bold mt-2">
            {globalData?.data?.total_market_cap?.usd
              ? `$${(globalData.data.total_market_cap.usd / 1e12).toFixed(2)}T`
              : 'N/A'}
          </p>
        </div>
        <div className="card p-4 sm:p-6 text-center">
          <h2 className="text-sm sm:text-lg font-medium text-[var(--text-secondary)]">Объем торгов (24ч)</h2>
          <p className="text-lg sm:text-2xl font-bold mt-2">
            {globalData?.data?.total_volume?.usd
              ? `$${(globalData.data.total_volume.usd / 1e9).toFixed(2)}B`
              : 'N/A'}
          </p>
        </div>
        <div className="card p-4 sm:p-6 text-center">
          <h2 className="text-sm sm:text-lg font-medium text-[var(--text-secondary)]">Активных монет</h2>
          <p className="text-lg sm:text-2xl font-bold mt-2">
            {globalData?.data?.active_cryptocurrencies?.toLocaleString() ?? 'N/A'}
          </p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Таблица топ-10 */}
        <motion.div
          className="card p-4 sm:p-6 overflow-x-auto"
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <h2 className="text-lg sm:text-xl font-semibold mb-4">Топ-10 криптовалют</h2>
          <AnimatePresence>
            <table className="w-full text-left text-sm sm:text-base min-w-[500px]">
              <thead>
                <tr className="border-b border-[var(--card-border)]">
                  <th className="py-2 sm:py-3 text-[var(--text-secondary)]">#</th>
                  <th className="py-2 sm:py-3 text-[var(--text-secondary)]">Монета</th>
                  <th className="py-2 sm:py-3 text-[var(--text-secondary)]">Цена (USD)</th>
                  <th className="py-2 sm:py-3 text-[var(--text-secondary)] hidden sm:table-cell">Изменение 24ч</th>
                  <th className="py-2 sm:py-3 text-[var(--text-secondary)] hidden md:table-cell">Рыночная кап.</th>
                </tr>
              </thead>
              <tbody>
                {filteredCoins.map((coin, idx) => (
                  <motion.tr
                    key={coin.id}
                    className={`border-b border-[var(--card-border)] cursor-pointer transition-colors ${
                      selectedCoin?.id === coin.id
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                    } touch-manipulation`}
                    onClick={() => setSelectedCoin(coin)}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3, delay: idx * 0.05 }}
                  >
                    <td className="py-2 sm:py-3">{idx + 1}</td>
                    <td className="py-2 sm:py-3 flex items-center">
                      {coin.image && (
                        <img
                          src={coin.image}
                          alt={coin.name}
                          className="w-5 h-5 sm:w-6 sm:h-6 mr-2 rounded-full"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      )}
                      <span className="truncate max-w-[120px] sm:max-w-[150px]">{coin.name}</span>
                      <span className="text-[var(--text-secondary)] ml-1">({coin.symbol.toUpperCase()})</span>
                    </td>
                    <td className="py-2 sm:py-3">${coin.current_price.toFixed(2)}</td>
                    <td
                      className="py-2 sm:py-3 hidden sm:table-cell"
                      style={{ color: coin.price_change_percentage_24h >= 0 ? '#22c55e' : '#ef4444' }}
                    >
                      {coin.price_change_percentage_24h.toFixed(2)}%
                    </td>
                    <td className="py-2 sm:py-3 hidden md:table-cell">${(coin.market_cap / 1e9).toFixed(2)}B</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </AnimatePresence>
        </motion.div>

        {/* График */}
        <motion.div
          className="card p-4 sm:p-6"
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          <h2 className="text-lg sm:text-xl font-semibold mb-4">График цены</h2>
{selectedCoin && chartData && (
  <motion.div
    initial={{ scale: 0.95, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ duration: 0.5 }}
    className="h-[300px] sm:h-[400px]"
  >
    <Line data={chartData} options={options} ref={chartRef} />
    <div className="flex gap-3 mt-6 justify-center">
      <motion.button
        onClick={zoomIn}
        className="zoom-button p-1 sm:p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title="Увеличить"
      >
        <ZoomInIcon className="w-4 h-4 sm:w-5 sm:h-5" />
      </motion.button>
      <motion.button
        onClick={zoomOut}
        className="zoom-button p-1 sm:p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title="Уменьшить"
      >
        <ZoomOutIcon className="w-4 h-4 sm:w-5 sm:h-5" />
      </motion.button>
      <motion.button
        onClick={resetZoom}
        className="zoom-button p-1 sm:p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title="Сбросить масштаб"
      >
        <ResetIcon className="w-4 h-4 sm:w-5 sm:h-5" />
      </motion.button>
    </div>
  </motion.div>
)}
          <p className="text-center selected-coin mt-20 text-sm sm:text-base">
            Выбрано: {selectedCoin ? selectedCoin.name : 'N/A'}
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}