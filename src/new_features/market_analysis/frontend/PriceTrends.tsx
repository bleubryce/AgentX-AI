import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Tooltip,
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { PriceTrend } from './types';

interface PriceTrendsProps {
  priceTrend: PriceTrend;
}

export const PriceTrends: React.FC<PriceTrendsProps> = ({ priceTrend }) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });
  };

  const data = [
    ...priceTrend.historical_prices.map((price) => ({
      date: formatDate(price.date),
      price: price.price,
      type: 'Historical',
      volume: price.volume,
      daysOnMarket: price.days_on_market,
    })),
    ...priceTrend.forecast_prices.map((price) => ({
      date: formatDate(price.date),
      price: price.price,
      type: 'Forecast',
      volume: null,
      daysOnMarket: null,
    })),
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Box sx={{ bgcolor: 'background.paper', p: 1, border: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle2">{label}</Typography>
          {payload.map((entry: any, index: number) => (
            <Typography key={index} color={entry.color}>
              {entry.name}: {formatCurrency(entry.value)}
            </Typography>
          ))}
          {payload[0].payload.volume && (
            <Typography variant="caption" color="text.secondary">
              Volume: {payload[0].payload.volume}
            </Typography>
          )}
          {payload[0].payload.daysOnMarket && (
            <Typography variant="caption" color="text.secondary">
              Days on Market: {payload[0].payload.daysOnMarket}
            </Typography>
          )}
        </Box>
      );
    }
    return null;
  };

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h6" gutterBottom>
        Price Trends
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Current Price
              </Typography>
              <Typography variant="h4">
                {formatCurrency(priceTrend.current_price)}
              </Typography>
              <Typography
                variant="subtitle1"
                color={priceTrend.price_change_percentage >= 0 ? 'success.main' : 'error.main'}
              >
                {priceTrend.price_change_percentage >= 0 ? '+' : ''}
                {priceTrend.price_change_percentage.toFixed(1)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Price Range
              </Typography>
              <Typography variant="h6">
                {formatCurrency(priceTrend.price_range.min)} -{' '}
                {formatCurrency(priceTrend.price_range.max)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Median: {formatCurrency(priceTrend.price_range.median)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Price per Sq Ft
              </Typography>
              <Typography variant="h4">
                {priceTrend.price_per_sqft
                  ? formatCurrency(priceTrend.price_per_sqft)
                  : 'N/A'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis
                      tickFormatter={(value) => formatCurrency(value)}
                      domain={['auto', 'auto']}
                    />
                    <ChartTooltip content={<CustomTooltip />} />
                    <Legend />
                    <ReferenceLine
                      y={priceTrend.current_price}
                      stroke="#ff9800"
                      strokeDasharray="3 3"
                      label={{
                        value: 'Current Price',
                        position: 'right',
                        fill: '#ff9800',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="price"
                      stroke="#2196f3"
                      name="Price"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}; 