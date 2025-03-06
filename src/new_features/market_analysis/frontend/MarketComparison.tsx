import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
} from '@mui/icons-material';
import { MarketAnalysis, MarketIndicator } from './types';

interface MarketComparisonProps {
  analyses: MarketAnalysis[];
  onRemoveAnalysis: (location: string) => void;
}

export const MarketComparison: React.FC<MarketComparisonProps> = ({
  analyses,
  onRemoveAnalysis,
}) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const getHealthColor = (health: string) => {
    switch (health.toLowerCase()) {
      case 'hot':
        return '#4caf50';
      case 'balanced':
        return '#2196f3';
      case 'cool':
        return '#ff9800';
      case 'stagnant':
        return '#f44336';
      default:
        return '#9e9e9e';
    }
  };

  const renderTrendIndicator = (value: number) => {
    if (value > 0) {
      return <TrendingUpIcon color="success" />;
    } else if (value < 0) {
      return <TrendingDownIcon color="error" />;
    }
    return null;
  };

  const compareMetrics = (analyses: MarketAnalysis[]) => {
    const metrics = {
      price: {
        highest: Math.max(...analyses.map(a => a.price_trend.current_price)),
        lowest: Math.min(...analyses.map(a => a.price_trend.current_price)),
        average: analyses.reduce((sum, a) => sum + a.price_trend.current_price, 0) / analyses.length,
      },
      daysOnMarket: {
        highest: Math.max(...analyses.map(a => a.market_indicators.days_on_market)),
        lowest: Math.min(...analyses.map(a => a.market_indicators.days_on_market)),
        average: analyses.reduce((sum, a) => sum + a.market_indicators.days_on_market, 0) / analyses.length,
      },
      marketHealth: {
        best: analyses.reduce((best, current) => 
          current.market_indicators.market_health_score > best.market_indicators.market_health_score ? current : best
        ),
        worst: analyses.reduce((worst, current) => 
          current.market_indicators.market_health_score < worst.market_indicators.market_health_score ? current : worst
        ),
      },
    };
    return metrics;
  };

  const comparisonMetrics = compareMetrics(analyses);

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h6" gutterBottom>
        Market Comparison
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Key Metrics Comparison
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Price Range
                    </Typography>
                    <Typography variant="body1">
                      {formatCurrency(comparisonMetrics.price.lowest)} - {formatCurrency(comparisonMetrics.price.highest)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Average: {formatCurrency(comparisonMetrics.price.average)}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Days on Market
                    </Typography>
                    <Typography variant="body1">
                      {comparisonMetrics.daysOnMarket.lowest} - {comparisonMetrics.daysOnMarket.highest}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Average: {comparisonMetrics.daysOnMarket.average.toFixed(1)}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Market Health
                    </Typography>
                    <Typography variant="body1">
                      Best: {comparisonMetrics.marketHealth.best.location}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Score: {formatPercentage(comparisonMetrics.marketHealth.best.market_indicators.market_health_score)}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Location</TableCell>
                  <TableCell align="right">Current Price</TableCell>
                  <TableCell align="right">Price Change</TableCell>
                  <TableCell align="right">Days on Market</TableCell>
                  <TableCell align="right">Market Health</TableCell>
                  <TableCell align="right">Supply/Demand</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {analyses.map((analysis) => (
                  <TableRow key={analysis.location}>
                    <TableCell component="th" scope="row">
                      {analysis.location}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(analysis.price_trend.current_price)}
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                        {renderTrendIndicator(analysis.price_trend.price_change_percentage)}
                        {analysis.price_trend.price_change_percentage.toFixed(1)}%
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      {analysis.market_indicators.days_on_market}
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        sx={{
                          color: getHealthColor(analysis.market_indicators.market_health),
                        }}
                      >
                        {analysis.market_indicators.market_health}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {formatPercentage(analysis.market_indicators.supply_score)} /{' '}
                      {formatPercentage(analysis.market_indicators.demand_score)}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Remove from comparison">
                        <IconButton
                          size="small"
                          onClick={() => onRemoveAnalysis(analysis.location)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      </Grid>
    </Box>
  );
}; 