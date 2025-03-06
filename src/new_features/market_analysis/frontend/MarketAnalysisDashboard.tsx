import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  CircularProgress,
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Button,
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { MarketAnalysisResponse } from './types';

interface MarketAnalysisDashboardProps {
  location?: string;
  propertyType?: string;
}

export const MarketAnalysisDashboard: React.FC<MarketAnalysisDashboardProps> = ({
  location: initialLocation = '',
  propertyType: initialPropertyType = '',
}) => {
  const [location, setLocation] = useState(initialLocation);
  const [propertyType, setPropertyType] = useState(initialPropertyType);
  const [timeframe, setTimeframe] = useState('6m');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<MarketAnalysisResponse | null>(null);

  const fetchAnalysis = async () => {
    if (!location || !propertyType) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v2/market/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          location,
          property_type: propertyType,
          timeframe,
          include_forecast: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch market analysis');
      }

      const data = await response.json();
      setAnalysis(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (location && propertyType) {
      fetchAnalysis();
    }
  }, [location, propertyType, timeframe]);

  const renderPriceChart = () => {
    if (!analysis) return null;

    const { historical_prices, forecast_prices } = analysis.analysis.price_trend;
    const data = [
      ...historical_prices.map((price) => ({
        date: price.date,
        price: price.price,
        type: 'Historical',
      })),
      ...forecast_prices.map((price) => ({
        date: price.date,
        price: price.price,
        type: 'Forecast',
      })),
    ];

    return (
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="price"
            stroke="#8884d8"
            name="Price"
          />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  const renderMarketIndicators = () => {
    if (!analysis) return null;

    const { market_indicators } = analysis.analysis;
    return (
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6">Days on Market</Typography>
              <Typography variant="h4">{market_indicators.days_on_market}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6">Inventory Level</Typography>
              <Typography variant="h4">{market_indicators.inventory_level}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6">Market Health</Typography>
              <Typography variant="h4">
                {(market_indicators.market_health_score * 100).toFixed(1)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6">Confidence Score</Typography>
              <Typography variant="h4">
                {(analysis.analysis.confidence_score * 100).toFixed(1)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Market Analysis Dashboard
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            label="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            label="Property Type"
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value)}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <FormControl fullWidth>
            <InputLabel>Timeframe</InputLabel>
            <Select
              value={timeframe}
              label="Timeframe"
              onChange={(e) => setTimeframe(e.target.value)}
            >
              <MenuItem value="3m">3 Months</MenuItem>
              <MenuItem value="6m">6 Months</MenuItem>
              <MenuItem value="1y">1 Year</MenuItem>
              <MenuItem value="2y">2 Years</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : analysis ? (
        <>
          {renderMarketIndicators()}
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Price Trends
            </Typography>
            {renderPriceChart()}
          </Box>
        </>
      ) : (
        <Typography variant="body1" color="text.secondary">
          Enter a location and property type to view market analysis
        </Typography>
      )}
    </Box>
  );
}; 