import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';
import { Box, Typography, CircularProgress } from '@mui/material';
import { formatPercentage } from '../../../utils/formatters';

interface SubscriptionOverviewProps {
  data?: {
    status: string;
    count: number;
    percentage: number;
  }[];
  isLoading: boolean;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export const SubscriptionOverview: React.FC<SubscriptionOverviewProps> = ({
  data,
  isLoading
}) => {
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
        Subscription Status Distribution
      </Typography>
      <ResponsiveContainer width="100%" height="90%">
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="status"
            cx="50%"
            cy="50%"
            outerRadius={80}
            label={({
              cx,
              cy,
              midAngle,
              innerRadius,
              outerRadius,
              percent
            }) => {
              const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
              const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
              const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
              return (
                <text
                  x={x}
                  y={y}
                  fill="white"
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  {formatPercentage(percent)}
                </text>
              );
            }}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, name: string) => [
              `${value} subscriptions`,
              name
            ]}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </Box>
  );
}; 