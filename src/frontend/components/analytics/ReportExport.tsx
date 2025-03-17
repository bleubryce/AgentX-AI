import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  CircularProgress,
  Typography,
  Alert
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { api } from '../../utils/api';

interface ReportExportProps {
  open: boolean;
  onClose: () => void;
}

const reportTypes = [
  { value: 'revenue', label: 'Revenue Report' },
  { value: 'subscriptions', label: 'Subscriptions Report' },
  { value: 'usage', label: 'Usage Report' },
  { value: 'churn', label: 'Churn Analysis Report' }
];

const exportFormats = [
  { value: 'csv', label: 'CSV' },
  { value: 'xlsx', label: 'Excel' },
  { value: 'pdf', label: 'PDF' }
];

export const ReportExport: React.FC<ReportExportProps> = ({ open, onClose }) => {
  const [reportType, setReportType] = useState('revenue');
  const [format, setFormat] = useState('csv');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.get(`/api/v1/reports/export`, {
        params: {
          type: reportType,
          format,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0]
        },
        responseType: 'blob'
      });

      // Create a download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${reportType}-report.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      onClose();
    } catch (err: any) {
      setError('Failed to generate report. Please try again.');
      console.error('Export error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Export Report</DialogTitle>
      <DialogContent>
        <Box display="flex" flexDirection="column" gap={3} py={2}>
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          <FormControl fullWidth>
            <InputLabel>Report Type</InputLabel>
            <Select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              label="Report Type"
            >
              {reportTypes.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Export Format</InputLabel>
            <Select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              label="Export Format"
            >
              {exportFormats.map((format) => (
                <MenuItem key={format.value} value={format.value}>
                  {format.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <DatePicker
            label="Start Date"
            value={startDate}
            onChange={setStartDate}
            slotProps={{ textField: { fullWidth: true } }}
          />

          <DatePicker
            label="End Date"
            value={endDate}
            onChange={setEndDate}
            slotProps={{ textField: { fullWidth: true } }}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleExport}
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          Export
        </Button>
      </DialogActions>
    </Dialog>
  );
}; 