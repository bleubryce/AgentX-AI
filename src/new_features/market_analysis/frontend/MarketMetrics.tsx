import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  LinearProgress,
  Tooltip,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Inventory as InventoryIcon,
  Speed as SpeedIcon,
  Balance as BalanceIcon,
} from '@mui/icons-material';
import { MarketIndicator, MarketHealth } from './types';

interface MarketMetricsProps {
  indicators: MarketIndicator;
}

export const MarketMetrics: React.FC<MarketMetricsProps> = ({ indicators }) => {
  const getHealthColor = (health: MarketHealth) => {
    switch (health) {
      case MarketHealth.HOT:
        return '#4caf50';
      case MarketHealth.BALANCED:
        return '#2196f3';
      case MarketHealth.COOL:
        return '#ff9800';
      case MarketHealth.STAGNANT:
        return '#f44336';
      default:
        return '#9e9e9e';
    }
  };

  const formatScore = (score: number) => `${(score * 100).toFixed(1)}%`;

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h6" gutterBottom>
        Market Metrics
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <SpeedIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="subtitle2">Days on Market</Typography>
              </Box>
              <Typography variant="h4">{indicators.days_on_market}</Typography>
              <Typography variant="caption" color="text.secondary">
                Average time to sell
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <InventoryIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="subtitle2">Inventory Level</Typography>
              </Box>
              <Typography variant="h4">{indicators.inventory_level}</Typography>
              <Typography variant="caption" color="text.secondary">
                Active listings
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TrendingUpIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="subtitle2">Market Health</Typography>
              </Box>
              <Typography
                variant="h4"
                sx={{ color: getHealthColor(indicators.market_health) }}
              >
                {indicators.market_health}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Current market condition
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <BalanceIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="subtitle2">Supply/Demand</Typography>
              </Box>
              <Typography variant="h4">
                {formatScore(indicators.supply_score)} / {formatScore(indicators.demand_score)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Balance ratio
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                Market Health Score
              </Typography>
              <Tooltip title={`${formatScore(indicators.market_health_score)}`}>
                <Box sx={{ width: '100%' }}>
                  <LinearProgress
                    variant="determinate"
                    value={indicators.market_health_score * 100}
                    sx={{
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: '#e0e0e0',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: getHealthColor(indicators.market_health),
                      },
                    }}
                  />
                </Box>
              </Tooltip>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                Absorption Rate
              </Typography>
              <Typography variant="h4">
                {indicators.absorption_rate.toFixed(1)} months
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Time to sell current inventory
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                Price to List Ratio
              </Typography>
              <Typography variant="h4">
                {(indicators.price_to_list_ratio * 100).toFixed(1)}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Average sale price vs. listing price
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}; 