import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  FormControlLabel,
  Checkbox,
  Select,
  MenuItem,
  InputLabel,
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { MarketAnalysis } from './types';

interface MarketReportProps {
  analysis: MarketAnalysis;
  onSaveReport: (report: MarketReport) => void;
}

interface MarketReport {
  id: string;
  title: string;
  description: string;
  analysisId: string;
  sections: ReportSection[];
  createdAt: string;
  updatedAt: string;
}

interface ReportSection {
  id: string;
  title: string;
  type: 'summary' | 'price_analysis' | 'market_health' | 'inventory' | 'forecast';
  content: string;
  metrics: string[];
}

const SECTION_TYPES = [
  { value: 'summary', label: 'Executive Summary' },
  { value: 'price_analysis', label: 'Price Analysis' },
  { value: 'market_health', label: 'Market Health' },
  { value: 'inventory', label: 'Inventory Analysis' },
  { value: 'forecast', label: 'Market Forecast' },
];

export const MarketReport: React.FC<MarketReportProps> = ({
  analysis,
  onSaveReport,
}) => {
  const [openDialog, setOpenDialog] = React.useState(false);
  const [report, setReport] = React.useState<Omit<MarketReport, 'id' | 'createdAt' | 'updatedAt'>>({
    title: `Market Analysis Report - ${analysis.location}`,
    description: '',
    analysisId: analysis.id,
    sections: [],
  });

  const handleAddSection = () => {
    setReport((prev) => ({
      ...prev,
      sections: [
        ...prev.sections,
        {
          id: Date.now().toString(),
          title: '',
          type: 'summary',
          content: '',
          metrics: [],
        },
      ],
    }));
  };

  const handleUpdateSection = (sectionId: string, updates: Partial<ReportSection>) => {
    setReport((prev) => ({
      ...prev,
      sections: prev.sections.map((section) =>
        section.id === sectionId ? { ...section, ...updates } : section
      ),
    }));
  };

  const handleRemoveSection = (sectionId: string) => {
    setReport((prev) => ({
      ...prev,
      sections: prev.sections.filter((section) => section.id !== sectionId),
    }));
  };

  const generateSectionContent = (section: ReportSection) => {
    switch (section.type) {
      case 'summary':
        return `The market in ${analysis.location} shows ${analysis.market_indicators.market_health.toLowerCase()} conditions with a market health score of ${(analysis.market_indicators.market_health_score * 100).toFixed(1)}%. Current average price is ${analysis.price_trend.current_price.toLocaleString()} with a ${analysis.price_trend.price_change_percentage.toFixed(1)}% change over the period.`;
      case 'price_analysis':
        return `Price trends indicate ${analysis.price_trend.price_change_percentage >= 0 ? 'increasing' : 'decreasing'} values with ${analysis.price_trend.historical_prices.length} data points analyzed. The price range is ${analysis.price_trend.price_range.min.toLocaleString()} to ${analysis.price_trend.price_range.max.toLocaleString()}.`;
      case 'market_health':
        return `Market health indicators show ${analysis.market_indicators.days_on_market} days on market average, with supply and demand scores of ${(analysis.market_indicators.supply_score * 100).toFixed(1)}% and ${(analysis.market_indicators.demand_score * 100).toFixed(1)}% respectively.`;
      case 'inventory':
        return `Current inventory levels are ${analysis.market_indicators.inventory_level} properties, with an absorption rate of ${analysis.market_indicators.absorption_rate.toFixed(1)} months.`;
      case 'forecast':
        return `Market forecasts predict ${analysis.price_trend.forecast_prices.length} months of future trends, with ${analysis.price_trend.forecast_prices[0]?.price.toLocaleString()} expected for the next period.`;
      default:
        return '';
    }
  };

  const handleSaveReport = () => {
    const newReport: MarketReport = {
      ...report,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onSaveReport(newReport);
    setOpenDialog(false);
  };

  return (
    <Box sx={{ mt: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Market Analysis Report
        </Typography>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={() => setOpenDialog(true)}
        >
          Generate Report
        </Button>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                {analysis.location} Market Analysis
              </Typography>
              <Typography color="text.secondary" gutterBottom>
                Generated on {new Date().toLocaleDateString()}
              </Typography>
              <Divider sx={{ my: 2 }} />

              <List>
                {SECTION_TYPES.map((type) => (
                  <ListItem key={type.value}>
                    <ListItemIcon>
                      <AssessmentIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary={type.label}
                      secondary={generateSectionContent({
                        id: type.value,
                        title: type.label,
                        type: type.value as ReportSection['type'],
                        content: '',
                        metrics: [],
                      })}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Generate Market Report</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Report Title"
              value={report.title}
              onChange={(e) => setReport({ ...report, title: e.target.value })}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={report.description}
              onChange={(e) => setReport({ ...report, description: e.target.value })}
              sx={{ mb: 2 }}
            />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="subtitle1">Report Sections</Typography>
              <Button
                variant="outlined"
                onClick={handleAddSection}
              >
                Add Section
              </Button>
            </Box>

            {report.sections.map((section) => (
              <Card key={section.id} sx={{ mb: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <FormControl sx={{ minWidth: 200 }}>
                      <InputLabel>Section Type</InputLabel>
                      <Select
                        value={section.type}
                        label="Section Type"
                        onChange={(e) => handleUpdateSection(section.id, { type: e.target.value as ReportSection['type'] })}
                      >
                        {SECTION_TYPES.map((type) => (
                          <MenuItem key={type.value} value={type.value}>
                            {type.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <Button
                      color="error"
                      onClick={() => handleRemoveSection(section.id)}
                    >
                      Remove
                    </Button>
                  </Box>

                  <TextField
                    fullWidth
                    label="Section Title"
                    value={section.title}
                    onChange={(e) => handleUpdateSection(section.id, { title: e.target.value })}
                    sx={{ mb: 2 }}
                  />

                  <TextField
                    fullWidth
                    label="Content"
                    multiline
                    rows={4}
                    value={section.content}
                    onChange={(e) => handleUpdateSection(section.id, { content: e.target.value })}
                  />
                </CardContent>
              </Card>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveReport}
            disabled={!report.title || report.sections.length === 0}
          >
            Save Report
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}; 