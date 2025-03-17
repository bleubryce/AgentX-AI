import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Box, Typography, CircularProgress } from '@mui/material';
import { formatCurrency } from '../../../utils/formatters';

interface RevenueTrendsProps {
  data?: {
    date: string;
    revenue: number;
    mrr: number;
    arr: number;
  }[];
  isLoading: boolean;
}

export const RevenueTrends: React.FC<RevenueTrendsProps> = ({ data, isLoading }) => {
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
        Revenue Trends
      </Typography>
      <ResponsiveContainer width="100%" height="90%">
        <LineChart
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickFormatter={(value) => new Date(value).toLocaleDateString()}
          />
          <YAxis tickFormatter={(value) => formatCurrency(value)} />
          <Tooltip
            formatter={(value: number) => formatCurrency(value)}
            labelFormatter={(label) => new Date(label).toLocaleDateString()}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="revenue"
            name="Revenue"
            stroke="#8884d8"
            activeDot={{ r: 8 }}
          />
          <Line
            type="monotone"
            dataKey="mrr"
            name="MRR"
            stroke="#82ca9d"
            activeDot={{ r: 8 }}
          />
          <Line
            type="monotone"
            dataKey="arr"
            name="ARR"
            stroke="#ffc658"
            activeDot={{ r: 8 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}; 