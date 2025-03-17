import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Box, Typography, CircularProgress } from '@mui/material';
import { formatNumber } from '../../../utils/formatters';

interface UsageMetricsProps {
  data?: {
    metric: string;
    current: number;
    limit: number;
    usage_percentage: number;
  }[];
  isLoading: boolean;
}

const COLORS = {
  current: '#82ca9d',
  limit: '#8884d8'
};

export const UsageMetrics: React.FC<UsageMetricsProps> = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%">
        <CircularProgress />
      </Box>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%">
        <Typography color="textSecondary">No data available</Typography>
      </Box>
    );
  }

  return (
    <Box height="100%">
      <Typography variant="h6" gutterBottom>
        Usage Metrics
      </Typography>
      <ResponsiveContainer width="100%" height="90%">
        <BarChart
          data={data}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="metric" />
          <YAxis tickFormatter={formatNumber} />
          <Tooltip
            formatter={(value: number) => formatNumber(value)}
            labelFormatter={(label) => `Metric: ${label}`}
          />
          <Legend />
          <Bar
            dataKey="current"
            name="Current Usage"
            fill={COLORS.current}
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="limit"
            name="Usage Limit"
            fill={COLORS.limit}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
      <Box mt={2}>
        {data.map((item) => (
          <Box
            key={item.metric}
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb={1}
          >
            <Typography variant="body2">{item.metric}</Typography>
            <Typography
              variant="body2"
              color={item.usage_percentage >= 90 ? 'error' : 'textPrimary'}
            >
              {formatNumber(item.current)} / {formatNumber(item.limit)} (
              {Math.round(item.usage_percentage)}%)
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}; 