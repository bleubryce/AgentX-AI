import { MarketAnalysis, PriceTrend, MarketIndicator } from '../types';

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const formatPercentage = (value: number): string => {
  return `${(value * 100).toFixed(1)}%`;
};

export const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const calculatePriceChange = (current: number, previous: number): number => {
  return ((current - previous) / previous) * 100;
};

export const getMarketHealthColor = (score: number): string => {
  if (score >= 0.8) return '#4caf50'; // Green
  if (score >= 0.6) return '#8bc34a'; // Light Green
  if (score >= 0.4) return '#ffc107'; // Amber
  if (score >= 0.2) return '#ff9800'; // Orange
  return '#f44336'; // Red
};

export const getMarketHealthLabel = (score: number): string => {
  if (score >= 0.8) return 'Very Healthy';
  if (score >= 0.6) return 'Healthy';
  if (score >= 0.4) return 'Moderate';
  if (score >= 0.2) return 'Weak';
  return 'Very Weak';
};

export const calculateAverageDaysOnMarket = (trend: PriceTrend): number => {
  const days = trend.historical_prices.map((price) => price.days_on_market);
  return days.reduce((sum, day) => sum + day, 0) / days.length;
};

export const calculateInventoryTurnover = (indicators: MarketIndicator): number => {
  return indicators.inventory_level / indicators.absorption_rate;
};

export const getMarketTrendDirection = (trend: PriceTrend): 'up' | 'down' | 'stable' => {
  const priceChange = calculatePriceChange(
    trend.current_price,
    trend.historical_prices[0].price
  );

  if (priceChange > 2) return 'up';
  if (priceChange < -2) return 'down';
  return 'stable';
};

export const calculateMarketVolatility = (trend: PriceTrend): number => {
  const prices = trend.historical_prices.map((price) => price.price);
  const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
  const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length;
  return Math.sqrt(variance);
};

export const getMarketSeasonality = (trend: PriceTrend): number => {
  const prices = trend.historical_prices.map((price) => price.price);
  const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
  const maxDeviation = Math.max(...prices.map((price) => Math.abs(price - mean)));
  return maxDeviation / mean;
};

export const calculateMarketEfficiency = (analysis: MarketAnalysis): number => {
  const { market_indicators, price_trend } = analysis;
  const daysOnMarket = calculateAverageDaysOnMarket(price_trend);
  const inventoryTurnover = calculateInventoryTurnover(market_indicators);
  const volatility = calculateMarketVolatility(price_trend);

  return (
    (market_indicators.market_health_score * 0.4 +
      (1 - volatility) * 0.3 +
      (1 / (1 + daysOnMarket / 30)) * 0.3) *
    100
  );
};

export const generateMarketSummary = (analysis: MarketAnalysis): string => {
  const trend = getMarketTrendDirection(analysis.price_trend);
  const health = getMarketHealthLabel(analysis.market_indicators.market_health_score);
  const efficiency = calculateMarketEfficiency(analysis);

  return `The market is currently ${trend} with ${health} conditions. Market efficiency is at ${efficiency.toFixed(1)}%.`;
};

export const validateMarketAnalysis = (analysis: MarketAnalysis): boolean => {
  if (!analysis.location || !analysis.property_type) return false;
  if (!analysis.price_trend || !analysis.market_indicators) return false;
  if (analysis.price_trend.historical_prices.length === 0) return false;
  if (analysis.confidence_score < 0 || analysis.confidence_score > 1) return false;
  return true;
};

export const compareMarketAnalyses = (
  analysis1: MarketAnalysis,
  analysis2: MarketAnalysis
): {
  priceDifference: number;
  healthDifference: number;
  efficiencyDifference: number;
} => {
  const efficiency1 = calculateMarketEfficiency(analysis1);
  const efficiency2 = calculateMarketEfficiency(analysis2);

  return {
    priceDifference: calculatePriceChange(
      analysis1.price_trend.current_price,
      analysis2.price_trend.current_price
    ),
    healthDifference:
      (analysis1.market_indicators.market_health_score -
        analysis2.market_indicators.market_health_score) *
      100,
    efficiencyDifference: efficiency1 - efficiency2,
  };
};

export default {
  formatCurrency,
  formatPercentage,
  formatDate,
  calculatePriceChange,
  getMarketHealthColor,
  getMarketHealthLabel,
  calculateAverageDaysOnMarket,
  calculateInventoryTurnover,
  getMarketTrendDirection,
  calculateMarketVolatility,
  getMarketSeasonality,
  calculateMarketEfficiency,
  generateMarketSummary,
  validateMarketAnalysis,
  compareMarketAnalyses,
}; 