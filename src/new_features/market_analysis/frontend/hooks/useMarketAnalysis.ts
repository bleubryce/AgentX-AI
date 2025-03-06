import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import MarketAnalysisAPI from '../api/MarketAnalysisAPI';
import { MarketAnalysis, MarketAnalysisRequest, MarketAnalysisResponse } from '../types';

interface UseMarketAnalysisProps {
  initialLocation?: string;
  initialPropertyType?: string;
  apiConfig: {
    baseURL: string;
    timeout: number;
    headers: Record<string, string>;
  };
}

interface MarketAnalysisState {
  location: string;
  propertyType: string;
  timeframe: string;
  includeForecast: boolean;
  isLoading: boolean;
  error: Error | null;
  data: MarketAnalysis | null;
}

export const useMarketAnalysis = ({
  initialLocation = '',
  initialPropertyType = '',
  apiConfig,
}: UseMarketAnalysisProps) => {
  const [state, setState] = useState<MarketAnalysisState>({
    location: initialLocation,
    propertyType: initialPropertyType,
    timeframe: '6m',
    includeForecast: true,
    isLoading: false,
    error: null,
    data: null,
  });

  const queryClient = useQueryClient();
  const api = MarketAnalysisAPI.getInstance(apiConfig);

  // Query for market analysis
  const { data: analysis, isLoading, error } = useQuery<MarketAnalysisResponse>(
    ['marketAnalysis', state.location, state.propertyType, state.timeframe],
    async () => {
      const request: MarketAnalysisRequest = {
        location: state.location,
        propertyType: state.propertyType,
        timeframe: state.timeframe,
        includeForecast: state.includeForecast,
      };
      return api.getMarketAnalysis(request);
    },
    {
      enabled: !!state.location && !!state.propertyType,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 30 * 60 * 1000, // 30 minutes
    }
  );

  // Mutation for updating market analysis
  const updateMutation = useMutation(
    async (request: MarketAnalysisRequest) => {
      return api.getMarketAnalysis(request);
    },
    {
      onSuccess: (data) => {
        queryClient.setQueryData(['marketAnalysis', state.location, state.propertyType, state.timeframe], data);
      },
    }
  );

  // Mutation for creating alerts
  const createAlertMutation = useMutation(
    async (alert: Omit<MarketAlert, 'id' | 'createdAt'>) => {
      return api.createAlert(alert);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['marketAlerts']);
      },
    }
  );

  // Mutation for creating reports
  const createReportMutation = useMutation(
    async (report: Omit<MarketReport, 'id' | 'createdAt' | 'updatedAt'>) => {
      return api.createReport(report);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['marketReports']);
      },
    }
  );

  // Handlers
  const handleLocationChange = useCallback((location: string) => {
    setState((prev) => ({ ...prev, location }));
  }, []);

  const handlePropertyTypeChange = useCallback((propertyType: string) => {
    setState((prev) => ({ ...prev, propertyType }));
  }, []);

  const handleTimeframeChange = useCallback((timeframe: string) => {
    setState((prev) => ({ ...prev, timeframe }));
  }, []);

  const handleForecastToggle = useCallback((includeForecast: boolean) => {
    setState((prev) => ({ ...prev, includeForecast }));
  }, []);

  const handleRefresh = useCallback(async () => {
    const request: MarketAnalysisRequest = {
      location: state.location,
      propertyType: state.propertyType,
      timeframe: state.timeframe,
      includeForecast: state.includeForecast,
    };
    await updateMutation.mutateAsync(request);
  }, [state, updateMutation]);

  const handleCreateAlert = useCallback(async (alert: Omit<MarketAlert, 'id' | 'createdAt'>) => {
    await createAlertMutation.mutateAsync(alert);
  }, [createAlertMutation]);

  const handleCreateReport = useCallback(async (report: Omit<MarketReport, 'id' | 'createdAt' | 'updatedAt'>) => {
    await createReportMutation.mutateAsync(report);
  }, [createReportMutation]);

  // Effect to update state when query data changes
  useEffect(() => {
    if (analysis?.data) {
      setState((prev) => ({ ...prev, data: analysis.data }));
    }
  }, [analysis]);

  return {
    ...state,
    isLoading,
    error,
    data: state.data,
    handleLocationChange,
    handlePropertyTypeChange,
    handleTimeframeChange,
    handleForecastToggle,
    handleRefresh,
    handleCreateAlert,
    handleCreateReport,
    isUpdating: updateMutation.isLoading,
    isCreatingAlert: createAlertMutation.isLoading,
    isCreatingReport: createReportMutation.isLoading,
  };
};

export default useMarketAnalysis; 