import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { api } from '../utils/api';

interface AnalyticsParams {
  period?: string;
  startDate?: Date | null;
  endDate?: Date | null;
}

export const useAnalytics = ({ period, startDate, endDate }: AnalyticsParams) => {
  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  const params = new URLSearchParams();
  if (period) params.append('period', period);
  if (startDate) params.append('start_date', formatDate(startDate));
  if (endDate) params.append('end_date', formatDate(endDate));

  const {
    data: overview,
    isLoading: isOverviewLoading,
    error: overviewError
  } = useQuery(
    ['analytics/overview', params.toString()],
    () => api.get(`/api/v1/analytics/subscriptions/overview?${params.toString()}`),
    {
      refetchInterval: 5 * 60 * 1000 // Refetch every 5 minutes
    }
  );

  const {
    data: trends,
    isLoading: isTrendsLoading,
    error: trendsError
  } = useQuery(
    ['analytics/trends', params.toString()],
    () => api.get(`/api/v1/analytics/subscriptions/trends?${params.toString()}`),
    {
      refetchInterval: 5 * 60 * 1000
    }
  );

  const {
    data: revenueBreakdown,
    isLoading: isRevenueLoading,
    error: revenueError
  } = useQuery(
    ['analytics/revenue', params.toString()],
    () => api.get(`/api/v1/analytics/revenue/breakdown?${params.toString()}`),
    {
      refetchInterval: 5 * 60 * 1000
    }
  );

  const {
    data: usageMetrics,
    isLoading: isUsageLoading,
    error: usageError
  } = useQuery(
    ['analytics/usage', params.toString()],
    () => api.get(`/api/v1/analytics/usage/metrics?${params.toString()}`),
    {
      refetchInterval: 5 * 60 * 1000
    }
  );

  const {
    data: churnAnalysis,
    isLoading: isChurnLoading,
    error: churnError
  } = useQuery(
    ['analytics/churn', params.toString()],
    () => api.get(`/api/v1/analytics/churn/analysis?${params.toString()}`),
    {
      refetchInterval: 5 * 60 * 1000
    }
  );

  return {
    overview: overview?.data,
    trends: trends?.data,
    revenueBreakdown: revenueBreakdown?.data,
    usageMetrics: usageMetrics?.data,
    churnAnalysis: churnAnalysis?.data,
    isLoading:
      isOverviewLoading ||
      isTrendsLoading ||
      isRevenueLoading ||
      isUsageLoading ||
      isChurnLoading,
    error:
      overviewError ||
      trendsError ||
      revenueError ||
      usageError ||
      churnError,
    refetch: () => {
      // Refetch all queries
      ['analytics/overview', 'analytics/trends', 'analytics/revenue', 'analytics/usage', 'analytics/churn'].forEach(
        (key) => {
          const queryKey = [key, params.toString()];
          const queryClient = useQueryClient();
          queryClient.invalidateQueries(queryKey);
        }
      );
    }
  };
}; 