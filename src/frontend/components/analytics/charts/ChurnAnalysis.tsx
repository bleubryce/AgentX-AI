import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Box, Typography, CircularProgress } from '@mui/material';
import { formatPercentage } from '../../../utils/formatters';

interface ChurnAnalysisProps {
  data?: {
    date: string;
    churn_rate: number;
    retention_rate: number;
  }[];
  isLoading: boolean;
}

export const ChurnAnalysis: React.FC<ChurnAnalysisProps> = ({ data, isLoading }) => {
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
        Churn Analysis
      </Typography>
      <ResponsiveContainer width="100%" height="90%">
        <AreaChart
          data={data}
          margin={{
            top: 10,
            right: 30,
            left: 0,
            bottom: 0
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickFormatter={(value) => new Date(value).toLocaleDateString()}
          />
          <YAxis
            tickFormatter={(value) => formatPercentage(value)}
          />
          <Tooltip
            formatter={(value: number) => formatPercentage(value)}
            labelFormatter={(label) => new Date(label).toLocaleDateString()}
          />
          <Legend />
          <Area
            type="monotone"
            dataKey="retention_rate"
            name="Retention Rate"
            stackId="1"
            stroke="#82ca9d"
            fill="#82ca9d"
            fillOpacity={0.3}
          />
          <Area
            type="monotone"
            dataKey="churn_rate"
            name="Churn Rate"
            stackId="2"
            stroke="#ff8042"
            fill="#ff8042"
            fillOpacity={0.3}
          />
        </AreaChart>
      </ResponsiveContainer>
      <Box mt={2}>
        <Typography variant="body2" color="textSecondary">
          Latest Metrics:
        </Typography>
        {data.length > 0 && (
          <Box display="flex" justifyContent="space-between" mt={1}>
            <Box>
              <Typography variant="body2" color="success.main">
                Retention Rate: {formatPercentage(data[data.length - 1].retention_rate)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="error.main">
                Churn Rate: {formatPercentage(data[data.length - 1].churn_rate)}
              </Typography>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}; 