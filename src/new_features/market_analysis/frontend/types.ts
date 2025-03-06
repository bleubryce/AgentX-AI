export enum PropertyType {
  SINGLE_FAMILY = 'single_family',
  CONDO = 'condo',
  TOWNHOUSE = 'townhouse',
  MULTI_FAMILY = 'multi_family',
  LUXURY = 'luxury',
  LAND = 'land',
}

export enum MarketHealth {
  HOT = 'hot',
  BALANCED = 'balanced',
  COOL = 'cool',
  STAGNANT = 'stagnant',
}

export interface PricePoint {
  date: string;
  price: number;
  volume?: number;
  days_on_market?: number;
}

export interface PriceTrend {
  current_price: number;
  price_change_percentage: number;
  historical_prices: PricePoint[];
  forecast_prices: PricePoint[];
  price_range: {
    min: number;
    max: number;
    median: number;
  };
  price_per_sqft?: number;
}

export interface MarketIndicator {
  days_on_market: number;
  inventory_level: number;
  months_of_inventory: number;
  market_health_score: number;
  demand_score: number;
  supply_score: number;
  absorption_rate: number;
  price_to_list_ratio: number;
  market_health: MarketHealth;
}

export interface MarketInsight {
  key_findings: string[];
  opportunities: string[];
  risks: string[];
  recommendations: string[];
  market_summary: string;
  trend_analysis: string;
}

export interface MarketAnalysis {
  id?: string;
  location: string;
  property_type: PropertyType;
  price_trend: PriceTrend;
  market_indicators: MarketIndicator;
  insights: MarketInsight;
  confidence_score: number;
  last_updated: string;
  created_at: string;
  metadata: Record<string, string>;
}

export interface MarketAnalysisRequest {
  location: string;
  property_type: PropertyType;
  timeframe: string;
  include_forecast: boolean;
  include_insights: boolean;
  metadata?: Record<string, string>;
}

export interface MarketAnalysisResponse {
  analysis: MarketAnalysis;
  metadata: Record<string, string>;
  processing_time: number;
}

export interface MarketAnalysisListResponse {
  analyses: MarketAnalysis[];
  total_count: number;
  page: number;
  page_size: number;
  metadata: Record<string, string>;
  processing_time: number;
} 