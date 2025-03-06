import {
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
} from '../marketAnalysisUtils';
import { MarketAnalysis, PriceTrend, MarketIndicator } from '../../types';

describe('Market Analysis Utilities', () => {
  describe('formatCurrency', () => {
    it('should format currency correctly', () => {
      expect(formatCurrency(1000000)).toBe('$1,000,000');
      expect(formatCurrency(500000)).toBe('$500,000');
      expect(formatCurrency(0)).toBe('$0');
    });
  });

  describe('formatPercentage', () => {
    it('should format percentage correctly', () => {
      expect(formatPercentage(0.5)).toBe('50.0%');
      expect(formatPercentage(0.123)).toBe('12.3%');
      expect(formatPercentage(0)).toBe('0.0%');
    });
  });

  describe('formatDate', () => {
    it('should format date correctly', () => {
      expect(formatDate('2024-03-15')).toBe('Mar 15, 2024');
      expect(formatDate('2024-01-01')).toBe('Jan 1, 2024');
    });
  });

  describe('calculatePriceChange', () => {
    it('should calculate price change correctly', () => {
      expect(calculatePriceChange(110000, 100000)).toBe(10);
      expect(calculatePriceChange(90000, 100000)).toBe(-10);
      expect(calculatePriceChange(100000, 100000)).toBe(0);
    });
  });

  describe('getMarketHealthColor', () => {
    it('should return correct color based on score', () => {
      expect(getMarketHealthColor(0.9)).toBe('#4caf50');
      expect(getMarketHealthColor(0.7)).toBe('#8bc34a');
      expect(getMarketHealthColor(0.5)).toBe('#ffc107');
      expect(getMarketHealthColor(0.3)).toBe('#ff9800');
      expect(getMarketHealthColor(0.1)).toBe('#f44336');
    });
  });

  describe('getMarketHealthLabel', () => {
    it('should return correct label based on score', () => {
      expect(getMarketHealthLabel(0.9)).toBe('Very Healthy');
      expect(getMarketHealthLabel(0.7)).toBe('Healthy');
      expect(getMarketHealthLabel(0.5)).toBe('Moderate');
      expect(getMarketHealthLabel(0.3)).toBe('Weak');
      expect(getMarketHealthLabel(0.1)).toBe('Very Weak');
    });
  });

  describe('calculateAverageDaysOnMarket', () => {
    it('should calculate average days on market correctly', () => {
      const trend: PriceTrend = {
        current_price: 100000,
        price_change_percentage: 0,
        historical_prices: [
          { date: '2024-03-01', price: 100000, volume: 10, days_on_market: 30 },
          { date: '2024-03-15', price: 110000, volume: 15, days_on_market: 45 },
        ],
        forecast_prices: [],
      };
      expect(calculateAverageDaysOnMarket(trend)).toBe(37.5);
    });
  });

  describe('calculateInventoryTurnover', () => {
    it('should calculate inventory turnover correctly', () => {
      const indicators: MarketIndicator = {
        days_on_market: 30,
        inventory_level: 100,
        market_health_score: 0.8,
        demand_score: 0.7,
        supply_score: 0.6,
        absorption_rate: 10,
      };
      expect(calculateInventoryTurnover(indicators)).toBe(10);
    });
  });

  describe('getMarketTrendDirection', () => {
    it('should determine market trend direction correctly', () => {
      const trend: PriceTrend = {
        current_price: 110000,
        price_change_percentage: 0,
        historical_prices: [
          { date: '2024-03-01', price: 100000, volume: 10, days_on_market: 30 },
        ],
        forecast_prices: [],
      };
      expect(getMarketTrendDirection(trend)).toBe('up');
    });
  });

  describe('calculateMarketVolatility', () => {
    it('should calculate market volatility correctly', () => {
      const trend: PriceTrend = {
        current_price: 100000,
        price_change_percentage: 0,
        historical_prices: [
          { date: '2024-03-01', price: 100000, volume: 10, days_on_market: 30 },
          { date: '2024-03-15', price: 110000, volume: 15, days_on_market: 45 },
        ],
        forecast_prices: [],
      };
      expect(calculateMarketVolatility(trend)).toBeGreaterThan(0);
    });
  });

  describe('getMarketSeasonality', () => {
    it('should calculate market seasonality correctly', () => {
      const trend: PriceTrend = {
        current_price: 100000,
        price_change_percentage: 0,
        historical_prices: [
          { date: '2024-03-01', price: 100000, volume: 10, days_on_market: 30 },
          { date: '2024-03-15', price: 110000, volume: 15, days_on_market: 45 },
        ],
        forecast_prices: [],
      };
      expect(getMarketSeasonality(trend)).toBeGreaterThan(0);
    });
  });

  describe('calculateMarketEfficiency', () => {
    it('should calculate market efficiency correctly', () => {
      const analysis: MarketAnalysis = {
        location: 'Test Location',
        property_type: 'Single Family',
        price_trend: {
          current_price: 100000,
          price_change_percentage: 0,
          historical_prices: [
            { date: '2024-03-01', price: 100000, volume: 10, days_on_market: 30 },
          ],
          forecast_prices: [],
        },
        market_indicators: {
          days_on_market: 30,
          inventory_level: 100,
          market_health_score: 0.8,
          demand_score: 0.7,
          supply_score: 0.6,
          absorption_rate: 10,
        },
        confidence_score: 0.9,
        last_updated: '2024-03-15',
        created_at: '2024-03-01',
      };
      expect(calculateMarketEfficiency(analysis)).toBeGreaterThan(0);
    });
  });

  describe('generateMarketSummary', () => {
    it('should generate market summary correctly', () => {
      const analysis: MarketAnalysis = {
        location: 'Test Location',
        property_type: 'Single Family',
        price_trend: {
          current_price: 100000,
          price_change_percentage: 0,
          historical_prices: [
            { date: '2024-03-01', price: 100000, volume: 10, days_on_market: 30 },
          ],
          forecast_prices: [],
        },
        market_indicators: {
          days_on_market: 30,
          inventory_level: 100,
          market_health_score: 0.8,
          demand_score: 0.7,
          supply_score: 0.6,
          absorption_rate: 10,
        },
        confidence_score: 0.9,
        last_updated: '2024-03-15',
        created_at: '2024-03-01',
      };
      expect(generateMarketSummary(analysis)).toBeTruthy();
    });
  });

  describe('validateMarketAnalysis', () => {
    it('should validate market analysis correctly', () => {
      const validAnalysis: MarketAnalysis = {
        location: 'Test Location',
        property_type: 'Single Family',
        price_trend: {
          current_price: 100000,
          price_change_percentage: 0,
          historical_prices: [
            { date: '2024-03-01', price: 100000, volume: 10, days_on_market: 30 },
          ],
          forecast_prices: [],
        },
        market_indicators: {
          days_on_market: 30,
          inventory_level: 100,
          market_health_score: 0.8,
          demand_score: 0.7,
          supply_score: 0.6,
          absorption_rate: 10,
        },
        confidence_score: 0.9,
        last_updated: '2024-03-15',
        created_at: '2024-03-01',
      };
      expect(validateMarketAnalysis(validAnalysis)).toBe(true);
    });
  });

  describe('compareMarketAnalyses', () => {
    it('should compare market analyses correctly', () => {
      const analysis1: MarketAnalysis = {
        location: 'Test Location 1',
        property_type: 'Single Family',
        price_trend: {
          current_price: 100000,
          price_change_percentage: 0,
          historical_prices: [
            { date: '2024-03-01', price: 100000, volume: 10, days_on_market: 30 },
          ],
          forecast_prices: [],
        },
        market_indicators: {
          days_on_market: 30,
          inventory_level: 100,
          market_health_score: 0.8,
          demand_score: 0.7,
          supply_score: 0.6,
          absorption_rate: 10,
        },
        confidence_score: 0.9,
        last_updated: '2024-03-15',
        created_at: '2024-03-01',
      };

      const analysis2: MarketAnalysis = {
        location: 'Test Location 2',
        property_type: 'Single Family',
        price_trend: {
          current_price: 110000,
          price_change_percentage: 0,
          historical_prices: [
            { date: '2024-03-01', price: 100000, volume: 10, days_on_market: 30 },
          ],
          forecast_prices: [],
        },
        market_indicators: {
          days_on_market: 30,
          inventory_level: 100,
          market_health_score: 0.7,
          demand_score: 0.7,
          supply_score: 0.6,
          absorption_rate: 10,
        },
        confidence_score: 0.9,
        last_updated: '2024-03-15',
        created_at: '2024-03-01',
      };

      const comparison = compareMarketAnalyses(analysis1, analysis2);
      expect(comparison).toHaveProperty('priceDifference');
      expect(comparison).toHaveProperty('healthDifference');
      expect(comparison).toHaveProperty('efficiencyDifference');
    });
  });
}); 