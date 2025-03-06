import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Autocomplete,
  Chip,
  Stack,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { PropertyType } from './types';

interface MarketAnalysisFiltersProps {
  onSearch: (filters: MarketAnalysisFilters) => void;
  onClear: () => void;
  locations: string[];
  initialFilters?: MarketAnalysisFilters;
}

export interface MarketAnalysisFilters {
  location: string;
  propertyType: PropertyType;
  timeframe: string;
  minPrice?: number;
  maxPrice?: number;
  includeForecast: boolean;
  includeInsights: boolean;
}

const TIMEFRAMES = [
  { value: '3m', label: '3 Months' },
  { value: '6m', label: '6 Months' },
  { value: '1y', label: '1 Year' },
  { value: '2y', label: '2 Years' },
  { value: '5y', label: '5 Years' },
];

export const MarketAnalysisFilters: React.FC<MarketAnalysisFiltersProps> = ({
  onSearch,
  onClear,
  locations,
  initialFilters,
}) => {
  const [filters, setFilters] = React.useState<MarketAnalysisFilters>(
    initialFilters || {
      location: '',
      propertyType: PropertyType.SINGLE_FAMILY,
      timeframe: '6m',
      includeForecast: true,
      includeInsights: true,
    }
  );

  const handleChange = (field: keyof MarketAnalysisFilters, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(filters);
  };

  const handleClear = () => {
    setFilters({
      location: '',
      propertyType: PropertyType.SINGLE_FAMILY,
      timeframe: '6m',
      includeForecast: true,
      includeInsights: true,
    });
    onClear();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card>
      <CardContent>
        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <FilterListIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Market Analysis Filters</Typography>
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <Autocomplete
                options={locations}
                value={filters.location}
                onChange={(_, newValue) => handleChange('location', newValue)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Location"
                    required
                    fullWidth
                    placeholder="Enter city, state, or zip code"
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      label={option}
                      {...getTagProps({ index })}
                      key={option}
                    />
                  ))
                }
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Property Type</InputLabel>
                <Select
                  value={filters.propertyType}
                  label="Property Type"
                  onChange={(e) => handleChange('propertyType', e.target.value)}
                >
                  {Object.values(PropertyType).map((type) => (
                    <MenuItem key={type} value={type}>
                      {type.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Timeframe</InputLabel>
                <Select
                  value={filters.timeframe}
                  label="Timeframe"
                  onChange={(e) => handleChange('timeframe', e.target.value)}
                >
                  {TIMEFRAMES.map((timeframe) => (
                    <MenuItem key={timeframe.value} value={timeframe.value}>
                      {timeframe.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Min Price"
                type="number"
                value={filters.minPrice || ''}
                onChange={(e) => handleChange('minPrice', e.target.value ? Number(e.target.value) : undefined)}
                InputProps={{
                  startAdornment: '$',
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Max Price"
                type="number"
                value={filters.maxPrice || ''}
                onChange={(e) => handleChange('maxPrice', e.target.value ? Number(e.target.value) : undefined)}
                InputProps={{
                  startAdornment: '$',
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Button
                  variant="outlined"
                  startIcon={<ClearIcon />}
                  onClick={handleClear}
                >
                  Clear Filters
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={<SearchIcon />}
                  disabled={!filters.location}
                >
                  Analyze Market
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </Box>
      </CardContent>
    </Card>
  );
}; 