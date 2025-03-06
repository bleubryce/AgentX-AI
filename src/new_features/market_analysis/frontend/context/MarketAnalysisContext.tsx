import React, { createContext, useContext, ReactNode } from 'react';
import useMarketAnalysis from '../hooks/useMarketAnalysis';
import { MarketAnalysis } from '../types';

interface MarketAnalysisContextType {
  location: string;
  propertyType: string;
  timeframe: string;
  includeForecast: boolean;
  isLoading: boolean;
  error: Error | null;
  data: MarketAnalysis | null;
  handleLocationChange: (location: string) => void;
  handlePropertyTypeChange: (propertyType: string) => void;
  handleTimeframeChange: (timeframe: string) => void;
  handleForecastToggle: (includeForecast: boolean) => void;
  handleRefresh: () => Promise<void>;
  handleCreateAlert: (alert: Omit<MarketAlert, 'id' | 'createdAt'>) => Promise<void>;
  handleCreateReport: (report: Omit<MarketReport, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  isUpdating: boolean;
  isCreatingAlert: boolean;
  isCreatingReport: boolean;
}

const MarketAnalysisContext = createContext<MarketAnalysisContextType | undefined>(undefined);

interface MarketAnalysisProviderProps {
  children: ReactNode;
  initialLocation?: string;
  initialPropertyType?: string;
  apiConfig: {
    baseURL: string;
    timeout: number;
    headers: Record<string, string>;
  };
}

export const MarketAnalysisProvider: React.FC<MarketAnalysisProviderProps> = ({
  children,
  initialLocation,
  initialPropertyType,
  apiConfig,
}) => {
  const marketAnalysis = useMarketAnalysis({
    initialLocation,
    initialPropertyType,
    apiConfig,
  });

  return (
    <MarketAnalysisContext.Provider value={marketAnalysis}>
      {children}
    </MarketAnalysisContext.Provider>
  );
};

export const useMarketAnalysisContext = () => {
  const context = useContext(MarketAnalysisContext);
  if (context === undefined) {
    throw new Error('useMarketAnalysisContext must be used within a MarketAnalysisProvider');
  }
  return context;
};

export default MarketAnalysisContext; 