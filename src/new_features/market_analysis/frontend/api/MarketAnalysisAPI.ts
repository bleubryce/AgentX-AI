import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { MarketAnalysis, MarketAnalysisRequest, MarketAnalysisResponse } from '../types';

interface APIConfig {
  baseURL: string;
  timeout: number;
  headers: Record<string, string>;
}

interface APIError {
  message: string;
  code: string;
  details?: any;
}

class MarketAnalysisAPI {
  private api: AxiosInstance;
  private static instance: MarketAnalysisAPI;

  private constructor(config: APIConfig) {
    this.api = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
    });

    this.setupInterceptors();
  }

  public static getInstance(config: APIConfig): MarketAnalysisAPI {
    if (!MarketAnalysisAPI.instance) {
      MarketAnalysisAPI.instance = new MarketAnalysisAPI(config);
    }
    return MarketAnalysisAPI.instance;
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(this.handleError(error));
      }
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        return Promise.reject(this.handleError(error));
      }
    );
  }

  private handleError(error: any): APIError {
    if (error.response) {
      return {
        message: error.response.data.message || 'An error occurred',
        code: error.response.data.code || 'UNKNOWN_ERROR',
        details: error.response.data.details,
      };
    }
    return {
      message: error.message || 'Network error',
      code: 'NETWORK_ERROR',
    };
  }

  // Market Analysis Methods
  public async getMarketAnalysis(request: MarketAnalysisRequest): Promise<MarketAnalysisResponse> {
    try {
      const response = await this.api.post<MarketAnalysisResponse>('/api/v2/market/analyze', request);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  public async getMarketTrends(location: string, propertyType: string): Promise<MarketAnalysis> {
    try {
      const response = await this.api.get<MarketAnalysis>(
        `/api/v2/market/trends/${encodeURIComponent(location)}`,
        { params: { propertyType } }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  public async getMarketForecast(location: string, propertyType: string): Promise<MarketAnalysis> {
    try {
      const response = await this.api.get<MarketAnalysis>(
        `/api/v2/market/forecast/${encodeURIComponent(location)}`,
        { params: { propertyType } }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Alerts Methods
  public async getAlerts(): Promise<MarketAlert[]> {
    try {
      const response = await this.api.get<MarketAlert[]>('/api/v2/market/alerts');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  public async createAlert(alert: Omit<MarketAlert, 'id' | 'createdAt'>): Promise<MarketAlert> {
    try {
      const response = await this.api.post<MarketAlert>('/api/v2/market/alerts', alert);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  public async updateAlert(id: string, updates: Partial<MarketAlert>): Promise<MarketAlert> {
    try {
      const response = await this.api.patch<MarketAlert>(`/api/v2/market/alerts/${id}`, updates);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  public async deleteAlert(id: string): Promise<void> {
    try {
      await this.api.delete(`/api/v2/market/alerts/${id}`);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Reports Methods
  public async getReports(): Promise<MarketReport[]> {
    try {
      const response = await this.api.get<MarketReport[]>('/api/v2/market/reports');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  public async createReport(report: Omit<MarketReport, 'id' | 'createdAt' | 'updatedAt'>): Promise<MarketReport> {
    try {
      const response = await this.api.post<MarketReport>('/api/v2/market/reports', report);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  public async updateReport(id: string, updates: Partial<MarketReport>): Promise<MarketReport> {
    try {
      const response = await this.api.patch<MarketReport>(`/api/v2/market/reports/${id}`, updates);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  public async deleteReport(id: string): Promise<void> {
    try {
      await this.api.delete(`/api/v2/market/reports/${id}`);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Export Methods
  public async exportData(format: string, data: any): Promise<Blob> {
    try {
      const response = await this.api.post(
        `/api/v2/market/export`,
        { data, format },
        { responseType: 'blob' }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Cache Management
  public async clearCache(): Promise<void> {
    try {
      await this.api.post('/api/v2/market/cache/clear');
    } catch (error) {
      throw this.handleError(error);
    }
  }

  public async getCacheStatus(): Promise<CacheStatus> {
    try {
      const response = await this.api.get<CacheStatus>('/api/v2/market/cache/status');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }
}

interface CacheStatus {
  size: number;
  items: number;
  lastCleared: string;
}

interface MarketAlert {
  id: string;
  type: 'price_change' | 'market_health' | 'inventory_level' | 'days_on_market';
  condition: 'above' | 'below' | 'equals' | 'changes_by';
  value: number;
  location: string;
  propertyType: string;
  isActive: boolean;
  createdAt: string;
  lastTriggered?: string;
}

interface MarketReport {
  id: string;
  title: string;
  description: string;
  analysisId: string;
  sections: ReportSection[];
  createdAt: string;
  updatedAt: string;
}

interface ReportSection {
  id: string;
  title: string;
  type: 'summary' | 'price_analysis' | 'market_health' | 'inventory' | 'forecast';
  content: string;
  metrics: string[];
}

export default MarketAnalysisAPI; 