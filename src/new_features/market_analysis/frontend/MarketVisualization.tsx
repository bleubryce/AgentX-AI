import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  IconButton,
  Tooltip,
  Paper,
} from '@mui/material';
import {
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  ScatterPlot as ScatterPlotIcon,
  Timeline as TimelineIcon,
  Map as MapIcon,
  Download as DownloadIcon,
  Fullscreen as FullscreenIcon,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  ScatterChart,
  Scatter,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { MarketAnalysis } from './types';

interface MarketVisualizationProps {
  analysis: MarketAnalysis;
  onExport: (format: string) => void;
}

type VisualizationType = 'bar' | 'pie' | 'scatter' | 'line' | 'map';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

interface ChartData {
  name: string;
  value: number;
  [key: string]: any;
}

export const MarketVisualization: React.FC<MarketVisualizationProps> = ({
  analysis,
  onExport,
}) => {
  const [chartType, setChartType] = React.useState<VisualizationType>('bar');
  const [isFullscreen, setIsFullscreen] = React.useState(false);

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

  const preparePriceData = (): ChartData[] => {
    return analysis.price_trend.historical_prices.map((price) => ({
      name: new Date(price.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      price: price.price,
      volume: price.volume,
      daysOnMarket: price.days_on_market,
    }));
  };

  const prepareMarketHealthData = (): ChartData[] => {
    return [
      { name: 'Supply', value: analysis.market_indicators.supply_score },
      { name: 'Demand', value: analysis.market_indicators.demand_score },
      { name: 'Market Health', value: analysis.market_indicators.market_health_score },
    ];
  };

  const prepareInventoryData = (): ChartData[] => {
    return [
      { name: 'Current Inventory', value: analysis.market_indicators.inventory_level },
      { name: 'Absorption Rate', value: analysis.market_indicators.absorption_rate },
      { name: 'Days on Market', value: analysis.market_indicators.days_on_market },
    ];
  };

  const renderChart = () => {
    const data = chartType === 'bar' || chartType === 'line'
      ? preparePriceData()
      : chartType === 'pie'
      ? prepareMarketHealthData()
      : prepareInventoryData();

    switch (chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={formatCurrency} />
              <ChartTooltip formatter={formatCurrency} />
              <Legend />
              <Bar dataKey="price" fill="#8884d8" name="Price" />
              <Bar dataKey="volume" fill="#82ca9d" name="Volume" />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={150}
                label={formatPercentage}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <ChartTooltip formatter={formatPercentage} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <ChartTooltip />
              <Legend />
              <Scatter data={data} fill="#8884d8" name="Value" />
            </ScatterChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={formatCurrency} />
              <ChartTooltip formatter={formatCurrency} />
              <Legend />
              <Line type="monotone" dataKey="price" stroke="#8884d8" name="Price" />
              <Line type="monotone" dataKey="volume" stroke="#82ca9d" name="Volume" />
            </LineChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  const handleExport = (format: string) => {
    onExport(format);
  };

  return (
    <Box sx={{ mt: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Market Data Visualization
        </Typography>
        <Box>
          <Tooltip title="Export Chart">
            <IconButton onClick={() => handleExport('png')} sx={{ mr: 1 }}>
              <DownloadIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Toggle Fullscreen">
            <IconButton onClick={() => setIsFullscreen(!isFullscreen)}>
              <FullscreenIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ mb: 2 }}>
                <FormControl sx={{ minWidth: 200 }}>
                  <InputLabel>Chart Type</InputLabel>
                  <Select
                    value={chartType}
                    label="Chart Type"
                    onChange={(e) => setChartType(e.target.value as VisualizationType)}
                  >
                    <MenuItem value="bar">
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <BarChartIcon sx={{ mr: 1 }} />
                        Bar Chart
                      </Box>
                    </MenuItem>
                    <MenuItem value="pie">
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <PieChartIcon sx={{ mr: 1 }} />
                        Pie Chart
                      </Box>
                    </MenuItem>
                    <MenuItem value="scatter">
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <ScatterPlotIcon sx={{ mr: 1 }} />
                        Scatter Plot
                      </Box>
                    </MenuItem>
                    <MenuItem value="line">
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <TimelineIcon sx={{ mr: 1 }} />
                        Line Chart
                      </Box>
                    </MenuItem>
                    <MenuItem value="map">
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <MapIcon sx={{ mr: 1 }} />
                        Map View
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>
              </Box>

              <Paper
                sx={{
                  p: 2,
                  height: isFullscreen ? '80vh' : 'auto',
                  transition: 'height 0.3s ease-in-out',
                }}
              >
                {renderChart()}
              </Paper>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}; 