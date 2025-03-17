import React, { useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    Grid,
    Typography,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Checkbox,
    FormControlLabel,
    FormGroup,
    Button,
    FormHelperText,
    Divider
} from '@mui/material';
import {
    ReportConfig,
    ReportType,
    ReportFormat,
    ReportFrequency,
    ReportProcessor
} from '../../services/agent/processors/report.processor';

interface ReportGeneratorProps {
    config: ReportConfig;
    onGenerateReport: (config: any) => void;
    onScheduleReport: (config: any) => void;
    onSaveTemplate: (config: any) => void;
}

const ReportGenerator: React.FC<ReportGeneratorProps> = ({
    config,
    onGenerateReport,
    onScheduleReport,
    onSaveTemplate
}) => {
    const [selectedType, setSelectedType] = useState<ReportType | ''>('');
    const [selectedFormat, setSelectedFormat] = useState<ReportFormat>(ReportFormat.PDF);
    const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
    const [dateRange, setDateRange] = useState({
        startDate: '',
        endDate: ''
    });
    const [templateName, setTemplateName] = useState('');
    const [scheduleFrequency, setScheduleFrequency] = useState<ReportFrequency | ''>('');
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleTypeChange = (event: React.ChangeEvent<{ value: unknown }>) => {
        const type = event.target.value as ReportType;
        setSelectedType(type);
        setSelectedMetrics([]);
        setErrors({});
    };

    const handleMetricToggle = (metric: string) => {
        setSelectedMetrics(prev =>
            prev.includes(metric)
                ? prev.filter(m => m !== metric)
                : [...prev, metric]
        );
    };

    const handleDateChange = (field: 'startDate' | 'endDate') => (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const newDateRange = { ...dateRange, [field]: event.target.value };
        setDateRange(newDateRange);
        validateDateRange(newDateRange);
    };

    const validateDateRange = (range: typeof dateRange) => {
        if (range.startDate && range.endDate) {
            if (!ReportProcessor.validateDateRange(range.startDate, range.endDate)) {
                setErrors(prev => ({
                    ...prev,
                    dateRange: 'End date must be after start date'
                }));
                return false;
            }
        }
        setErrors(prev => {
            const { dateRange, ...rest } = prev;
            return rest;
        });
        return true;
    };

    const validateConfig = () => {
        const newErrors: Record<string, string> = {};

        if (!selectedType) {
            newErrors.type = 'Please select a report type';
        }
        if (selectedMetrics.length === 0) {
            newErrors.metrics = 'Please select at least one metric';
        }
        if (!dateRange.startDate || !dateRange.endDate) {
            newErrors.dateRange = 'Please select a date range';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleGenerateReport = () => {
        if (!validateConfig()) return;

        onGenerateReport({
            type: selectedType,
            format: selectedFormat,
            dateRange,
            metrics: selectedMetrics
        });
    };

    const handleScheduleReport = () => {
        if (!validateConfig()) return;
        if (!scheduleFrequency) {
            setErrors(prev => ({
                ...prev,
                frequency: 'Please select a frequency'
            }));
            return;
        }

        onScheduleReport({
            type: selectedType,
            frequency: scheduleFrequency,
            metrics: selectedMetrics
        });
    };

    const handleSaveTemplate = () => {
        if (!validateConfig()) return;
        if (!templateName.trim()) {
            setErrors(prev => ({
                ...prev,
                templateName: 'Please enter a template name'
            }));
            return;
        }

        onSaveTemplate({
            name: templateName,
            type: selectedType,
            metrics: selectedMetrics
        });
    };

    const selectedTypeConfig = config.reportTypes.find(t => t.type === selectedType);

    return (
        <Box p={3}>
            <Typography variant="h5" gutterBottom>Report Generator</Typography>

            <Card>
                <CardContent>
                    <Grid container spacing={3}>
                        {/* Report Type Selection */}
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth error={!!errors.type}>
                                <InputLabel>Report Type</InputLabel>
                                <Select
                                    value={selectedType}
                                    label="Report Type"
                                    onChange={handleTypeChange}
                                >
                                    {config.reportTypes.map(type => (
                                        <MenuItem key={type.type} value={type.type}>
                                            {type.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                                {errors.type && <FormHelperText>{errors.type}</FormHelperText>}
                            </FormControl>
                        </Grid>

                        {/* Report Format Selection */}
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth>
                                <InputLabel>Report Format</InputLabel>
                                <Select
                                    value={selectedFormat}
                                    label="Report Format"
                                    onChange={(e) => setSelectedFormat(e.target.value as ReportFormat)}
                                >
                                    {config.formats.map(format => (
                                        <MenuItem key={format} value={format}>
                                            {format}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        {/* Date Range Selection */}
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Start Date"
                                type="date"
                                value={dateRange.startDate}
                                onChange={handleDateChange('startDate')}
                                InputLabelProps={{ shrink: true }}
                                error={!!errors.dateRange}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="End Date"
                                type="date"
                                value={dateRange.endDate}
                                onChange={handleDateChange('endDate')}
                                InputLabelProps={{ shrink: true }}
                                error={!!errors.dateRange}
                                helperText={errors.dateRange}
                            />
                        </Grid>

                        {/* Metrics Selection */}
                        {selectedTypeConfig && (
                            <Grid item xs={12}>
                                <Typography variant="subtitle1" gutterBottom>Metrics</Typography>
                                <FormGroup>
                                    {selectedTypeConfig.metrics.map(metric => {
                                        const metricConfig = ReportProcessor.getMetricConfig(metric);
                                        return (
                                            <FormControlLabel
                                                key={metric}
                                                control={
                                                    <Checkbox
                                                        checked={selectedMetrics.includes(metric)}
                                                        onChange={() => handleMetricToggle(metric)}
                                                    />
                                                }
                                                label={metricConfig?.label || metric}
                                            />
                                        );
                                    })}
                                </FormGroup>
                                {errors.metrics && (
                                    <FormHelperText error>{errors.metrics}</FormHelperText>
                                )}
                            </Grid>
                        )}

                        <Grid item xs={12}>
                            <Divider sx={{ my: 2 }} />
                        </Grid>

                        {/* Schedule Configuration */}
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth error={!!errors.frequency}>
                                <InputLabel>Schedule Frequency</InputLabel>
                                <Select
                                    value={scheduleFrequency}
                                    label="Schedule Frequency"
                                    onChange={(e) => setScheduleFrequency(e.target.value as ReportFrequency)}
                                >
                                    {Object.values(ReportFrequency).map(freq => (
                                        <MenuItem key={freq} value={freq}>
                                            {freq}
                                        </MenuItem>
                                    ))}
                                </Select>
                                {errors.frequency && (
                                    <FormHelperText>{errors.frequency}</FormHelperText>
                                )}
                            </FormControl>
                        </Grid>

                        {/* Template Configuration */}
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Template Name"
                                value={templateName}
                                onChange={(e) => setTemplateName(e.target.value)}
                                error={!!errors.templateName}
                                helperText={errors.templateName}
                            />
                        </Grid>

                        {/* Action Buttons */}
                        <Grid item xs={12}>
                            <Box display="flex" gap={2}>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={handleGenerateReport}
                                >
                                    Generate Report
                                </Button>
                                <Button
                                    variant="outlined"
                                    color="primary"
                                    onClick={handleScheduleReport}
                                >
                                    Schedule Report
                                </Button>
                                <Button
                                    variant="outlined"
                                    onClick={handleSaveTemplate}
                                >
                                    Save as Template
                                </Button>
                            </Box>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>
        </Box>
    );
};

export default ReportGenerator; 