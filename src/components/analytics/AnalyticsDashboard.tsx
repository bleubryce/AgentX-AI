import React, { useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    Grid,
    Typography,
    Button,
    IconButton,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Paper
} from '@mui/material';
import {
    Refresh as RefreshIcon,
    GetApp as ExportIcon
} from '@mui/icons-material';
import {
    AnalyticsData,
    DateRange,
    AnalyticsProcessor
} from '../../services/agent/processors/analytics.processor';
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    PieChart,
    Pie,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';

interface AnalyticsDashboardProps {
    data: AnalyticsData;
    onDateRangeChange: (range: DateRange) => void;
    onExportData: () => void;
    onRefreshData: () => void;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
    data,
    onDateRangeChange,
    onExportData,
    onRefreshData
}) => {
    const [dateRange, setDateRange] = useState<DateRange>({
        startDate: '',
        endDate: ''
    });
    const [leadView, setLeadView] = useState<'source' | 'status'>('source');
    const [campaignView, setCampaignView] = useState<'type' | 'status'>('type');

    const handleDateChange = (field: keyof DateRange) => (event: React.ChangeEvent<HTMLInputElement>) => {
        const newRange = { ...dateRange, [field]: event.target.value };
        setDateRange(newRange);
        if (AnalyticsProcessor.validateDateRange(newRange.startDate, newRange.endDate)) {
            onDateRangeChange(newRange);
        }
    };

    const formatLeadSourceData = () => {
        return Object.entries(data.leadMetrics.leadsBySource).map(([source, value]) => ({
            name: source,
            value
        }));
    };

    const formatLeadStatusData = () => {
        return Object.entries(data.leadMetrics.leadsByStatus).map(([status, value]) => ({
            name: status,
            value
        }));
    };

    const formatCampaignData = () => {
        return Object.entries(
            campaignView === 'type' ? data.campaignMetrics.campaignsByType : data.campaignMetrics.campaignsByStatus
        ).map(([key, value]) => ({
            name: key,
            value
        }));
    };

    return (
        <Box p={3}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4">Analytics Dashboard</Typography>
                <Box>
                    <TextField
                        label="Start Date"
                        type="date"
                        value={dateRange.startDate}
                        onChange={handleDateChange('startDate')}
                        InputLabelProps={{ shrink: true }}
                        sx={{ mr: 2 }}
                    />
                    <TextField
                        label="End Date"
                        type="date"
                        value={dateRange.endDate}
                        onChange={handleDateChange('endDate')}
                        InputLabelProps={{ shrink: true }}
                        sx={{ mr: 2 }}
                    />
                    <Button
                        variant="contained"
                        startIcon={<ExportIcon />}
                        onClick={onExportData}
                        sx={{ mr: 1 }}
                    >
                        Export Data
                    </Button>
                    <IconButton title="Refresh Data" onClick={onRefreshData}>
                        <RefreshIcon />
                    </IconButton>
                </Box>
            </Box>

            {/* Summary Cards */}
            <Grid container spacing={3} mb={3}>
                {/* Lead Metrics */}
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>Lead Analytics</Typography>
                            <Typography variant="h3">{data.leadMetrics.totalLeads}</Typography>
                            <Typography color="textSecondary">Total Leads</Typography>
                            <Box mt={2}>
                                <Typography>Qualified Leads: {data.leadMetrics.qualifiedLeads}</Typography>
                                <Typography>Conversion Rate: {data.leadMetrics.conversionRate}%</Typography>
                                <Typography>Average Score: {data.leadMetrics.averageScore}</Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Campaign Metrics */}
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>Campaign Performance</Typography>
                            <Typography variant="h3">{data.campaignMetrics.activeCampaigns}</Typography>
                            <Typography color="textSecondary">Active Campaigns</Typography>
                            <Box mt={2}>
                                <Typography>Total Budget: ${data.campaignMetrics.totalBudget.toLocaleString()}</Typography>
                                <Typography>Overall ROI: {data.campaignMetrics.totalROI}x</Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Revenue Metrics */}
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>Revenue Analytics</Typography>
                            <Typography variant="h3">${data.revenueMetrics.totalRevenue.toLocaleString()}</Typography>
                            <Typography color="textSecondary">Total Revenue</Typography>
                            <Box mt={2}>
                                <Typography>Average Deal Size: ${data.revenueMetrics.averageDealSize.toLocaleString()}</Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Charts */}
            <Grid container spacing={3}>
                {/* Lead Distribution */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                            <Typography variant="h6">Lead Sources</Typography>
                            <FormControl size="small">
                                <InputLabel>Lead View</InputLabel>
                                <Select
                                    value={leadView}
                                    label="Lead View"
                                    onChange={(e) => setLeadView(e.target.value as 'source' | 'status')}
                                >
                                    <MenuItem value="source">By Source</MenuItem>
                                    <MenuItem value="status">By Status</MenuItem>
                                </Select>
                            </FormControl>
                        </Box>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={leadView === 'source' ? formatLeadSourceData() : formatLeadStatusData()}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={100}
                                    fill="#8884d8"
                                    label
                                />
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>

                {/* Campaign Performance */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                            <Typography variant="h6">Campaign Performance</Typography>
                            <FormControl size="small">
                                <InputLabel>Campaign View</InputLabel>
                                <Select
                                    value={campaignView}
                                    label="Campaign View"
                                    onChange={(e) => setCampaignView(e.target.value as 'type' | 'status')}
                                >
                                    <MenuItem value="type">By Type</MenuItem>
                                    <MenuItem value="status">By Status</MenuItem>
                                </Select>
                            </FormControl>
                        </Box>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={formatCampaignData()}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="value" fill="#82ca9d" />
                            </BarChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>

                {/* Revenue Trends */}
                <Grid item xs={12}>
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom>Revenue Trends</Typography>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={data.revenueMetrics.monthlyTrends.labels.map((label, index) => ({
                                name: label,
                                revenue: data.revenueMetrics.monthlyTrends.revenue[index],
                                deals: data.revenueMetrics.monthlyTrends.deals[index]
                            }))}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis yAxisId="left" />
                                <YAxis yAxisId="right" orientation="right" />
                                <Tooltip />
                                <Legend />
                                <Line
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#8884d8"
                                    name="Revenue"
                                />
                                <Line
                                    yAxisId="right"
                                    type="monotone"
                                    dataKey="deals"
                                    stroke="#82ca9d"
                                    name="Deals"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default AnalyticsDashboard; 