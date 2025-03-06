import React from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  FormControlLabel,
  Checkbox,
  Radio,
  RadioGroup,
  Typography,
  TextField,
} from '@mui/material';
import {
  Download as DownloadIcon,
  PictureAsPdf as PdfIcon,
  TableChart as TableIcon,
  Description as DocumentIcon,
} from '@mui/icons-material';
import { MarketAnalysis } from './types';

interface MarketDataExportProps {
  open: boolean;
  onClose: () => void;
  analyses: MarketAnalysis[];
  onExport: (format: string, options: ExportOptions) => void;
}

interface ExportOptions {
  includePriceTrends: boolean;
  includeMarketMetrics: boolean;
  includeInsights: boolean;
  includeForecasts: boolean;
  fileName: string;
}

const EXPORT_FORMATS = [
  { value: 'csv', label: 'CSV', icon: <TableIcon /> },
  { value: 'pdf', label: 'PDF Report', icon: <PdfIcon /> },
  { value: 'excel', label: 'Excel', icon: <TableIcon /> },
  { value: 'json', label: 'JSON', icon: <DocumentIcon /> },
];

export const MarketDataExport: React.FC<MarketDataExportProps> = ({
  open,
  onClose,
  analyses,
  onExport,
}) => {
  const [format, setFormat] = React.useState('csv');
  const [options, setOptions] = React.useState<ExportOptions>({
    includePriceTrends: true,
    includeMarketMetrics: true,
    includeInsights: true,
    includeForecasts: true,
    fileName: `market-analysis-${new Date().toISOString().split('T')[0]}`,
  });

  const handleOptionChange = (field: keyof ExportOptions, value: any) => {
    setOptions((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleExport = () => {
    onExport(format, options);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <DownloadIcon sx={{ mr: 1 }} />
          Export Market Analysis
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Export Format
          </Typography>
          <RadioGroup
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            sx={{ mb: 3 }}
          >
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
              {EXPORT_FORMATS.map((format) => (
                <Button
                  key={format.value}
                  variant={format.value === format.value ? 'contained' : 'outlined'}
                  onClick={() => setFormat(format.value)}
                  startIcon={format.icon}
                  fullWidth
                >
                  {format.label}
                </Button>
              ))}
            </Box>
          </RadioGroup>

          <Typography variant="subtitle1" gutterBottom>
            Export Options
          </Typography>
          <FormControl component="fieldset" sx={{ width: '100%' }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={options.includePriceTrends}
                  onChange={(e) => handleOptionChange('includePriceTrends', e.target.checked)}
                />
              }
              label="Include Price Trends"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={options.includeMarketMetrics}
                  onChange={(e) => handleOptionChange('includeMarketMetrics', e.target.checked)}
                />
              }
              label="Include Market Metrics"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={options.includeInsights}
                  onChange={(e) => handleOptionChange('includeInsights', e.target.checked)}
                />
              }
              label="Include Market Insights"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={options.includeForecasts}
                  onChange={(e) => handleOptionChange('includeForecasts', e.target.checked)}
                />
              }
              label="Include Market Forecasts"
            />
          </FormControl>

          <TextField
            fullWidth
            label="File Name"
            value={options.fileName}
            onChange={(e) => handleOptionChange('fileName', e.target.value)}
            sx={{ mt: 2 }}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleExport}
          startIcon={<DownloadIcon />}
        >
          Export
        </Button>
      </DialogActions>
    </Dialog>
  );
}; 