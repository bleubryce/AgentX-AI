import { useMemo } from 'react';
import {
    Box,
    Card,
    CardContent,
    Grid,
    Typography,
    useTheme
} from '@mui/material';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    AreaChart,
    Area
} from 'recharts';
import { Lead, LeadStatus, LeadTrendData } from '../../types/lead';
import { FC } from '../../types/common';

interface LeadTrendReportProps {
    leads: Lead[];
}

const COLORS = {
    total: '#2196f3',
    new: '#4caf50',
    contacted: '#ff9800',
    qualified: '#9c27b0',
    converted: '#00bcd4',
    lost: '#f44336'
} as const;

const LeadTrendReport: FC<LeadTrendReportProps> = ({ leads }) => {
    const theme = useTheme();

    const trendData = useMemo(() => {
        const monthlyData = leads.reduce((acc: { [key: string]: { [K in LeadStatus | 'total']: number } }, lead) => {
            const date = new Date(lead.createdAt);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            if (!acc[monthKey]) {
                acc[monthKey] = {
                    total: 0,
                    new: 0,
                    contacted: 0,
                    qualified: 0,
                    converted: 0,
                    lost: 0
                };
            }

            acc[monthKey].total++;
            acc[monthKey][lead.status]++;

            return acc;
        }, {});

        return Object.entries(monthlyData)
            .map(([date, data]): LeadTrendData => ({
                date,
                ...data
            }))
            .sort((a, b) => a.date.localeCompare(b.date));
    }, [leads]);

    const currentMonthData = useMemo(() => {
        return trendData[trendData.length - 1] || {
            total: 0,
            new: 0,
            contacted: 0,
            qualified: 0,
            converted: 0,
            lost: 0
        };
    }, [trendData]);

    const growthRate = useMemo(() => {
        if (trendData.length < 2) return 0;
        const previousMonth = trendData[trendData.length - 2];
        const currentMonth = trendData[trendData.length - 1];
        return previousMonth.total > 0
            ? ((currentMonth.total - previousMonth.total) / previousMonth.total) * 100
            : 0;
    }, [trendData]);

    const chartData = trendData.map((data) => ({
        name: data.date,
        total: data.total,
        new: data.new,
        contacted: data.contacted,
        qualified: data.qualified,
        proposal: data.converted,
        negotiation: data.converted,
        closed: data.lost
    }));

    return (
        <Box>
            <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Total Leads This Month
                            </Typography>
                            <Typography variant="h4">
                                {currentMonthData.total}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Active Leads
                            </Typography>
                            <Typography variant="h4">
                                {currentMonthData.new + currentMonthData.contacted + currentMonthData.qualified}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Monthly Growth Rate
                            </Typography>
                            <Typography variant="h4">
                                {growthRate.toFixed(1)}%
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Lead Status Trends
                            </Typography>
                            <Box sx={{ height: 400 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={trendData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Line
                                            type="monotone"
                                            dataKey="total"
                                            name="Total"
                                            stroke={COLORS.total}
                                            strokeWidth={2}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="new"
                                            name="New"
                                            stroke={COLORS.new}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="contacted"
                                            name="Contacted"
                                            stroke={COLORS.contacted}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="qualified"
                                            name="Qualified"
                                            stroke={COLORS.qualified}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="converted"
                                            name="Converted"
                                            stroke={COLORS.converted}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="lost"
                                            name="Lost"
                                            stroke={COLORS.lost}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Lead Growth Trend
                            </Typography>
                            <Box sx={{ height: 400 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart
                                        data={chartData}
                                        margin={{
                                            top: 20,
                                            right: 30,
                                            left: 20,
                                            bottom: 60
                                        }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis
                                            dataKey="name"
                                            angle={-45}
                                            textAnchor="end"
                                            height={60}
                                        />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Area
                                            type="monotone"
                                            dataKey="total"
                                            name="Total Leads"
                                            fill={theme.palette.primary.main}
                                            stroke={theme.palette.primary.dark}
                                            fillOpacity={0.3}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Lead Status Distribution Over Time
                            </Typography>
                            <Box sx={{ height: 400 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart
                                        data={chartData}
                                        margin={{
                                            top: 20,
                                            right: 30,
                                            left: 20,
                                            bottom: 60
                                        }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis
                                            dataKey="name"
                                            angle={-45}
                                            textAnchor="end"
                                            height={60}
                                        />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Line
                                            type="monotone"
                                            dataKey="new"
                                            name="New"
                                            stroke={theme.palette.info.main}
                                            activeDot={{ r: 8 }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="contacted"
                                            name="Contacted"
                                            stroke={theme.palette.primary.main}
                                            activeDot={{ r: 8 }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="qualified"
                                            name="Qualified"
                                            stroke={theme.palette.success.main}
                                            activeDot={{ r: 8 }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="proposal"
                                            name="Proposal"
                                            stroke={theme.palette.warning.main}
                                            activeDot={{ r: 8 }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="negotiation"
                                            name="Negotiation"
                                            stroke={theme.palette.secondary.main}
                                            activeDot={{ r: 8 }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="closed"
                                            name="Closed"
                                            stroke={theme.palette.error.main}
                                            activeDot={{ r: 8 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default LeadTrendReport; 