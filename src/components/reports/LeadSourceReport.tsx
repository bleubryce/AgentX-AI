import React from 'react';
import {
    Box,
    Card,
    CardContent,
    Grid,
    Typography,
    useTheme
} from '@mui/material';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line
} from 'recharts';
import { Lead, LeadStatus, LeadSource } from '../../types/lead';

interface LeadSourceReportProps {
    leads: Lead[];
}

interface SourceMetrics {
    source: LeadSource;
    total: number;
    converted: number;
    conversionRate: number;
    percentage: number;
    avgConversionTime: number;
}

interface TimelineData {
    date: string;
    [key: string]: number | string;
}

interface PieEntry {
    source: LeadSource;
    total: number;
    percentage: number;
}

const calculateSourceMetrics = (leads: Lead[]): SourceMetrics[] => {
    const metrics = new Map<LeadSource, SourceMetrics>();

    // Initialize metrics for all sources
    Object.values(LeadSource).forEach((source) => {
        metrics.set(source, {
            source,
            total: 0,
            converted: 0,
            conversionRate: 0,
            percentage: 0,
            avgConversionTime: 0,
        });
    });

    // Calculate basic metrics
    leads.forEach((lead) => {
        const sourceMetrics = metrics.get(lead.source)!;
        sourceMetrics.total++;
        if (lead.status === LeadStatus.CONVERTED) {
            sourceMetrics.converted++;
            const createdDate = new Date(lead.createdAt!);
            const convertedDate = new Date(lead.updatedAt!);
            const conversionTime = Math.floor(
                (convertedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
            );
            sourceMetrics.avgConversionTime =
                (sourceMetrics.avgConversionTime * (sourceMetrics.converted - 1) +
                    conversionTime) /
                sourceMetrics.converted;
        }
    });

    // Calculate percentages and rates
    const totalLeads = leads.length;
    metrics.forEach((metric) => {
        metric.percentage = (metric.total / totalLeads) * 100;
        metric.conversionRate = metric.total > 0 ? (metric.converted / metric.total) * 100 : 0;
    });

    return Array.from(metrics.values()).filter((metric) => metric.total > 0);
};

const calculateTimelineData = (leads: Lead[]): TimelineData[] => {
    const timeline = new Map<string, { [key: string]: number }>();

    leads.forEach((lead) => {
        const date = new Date(lead.createdAt!).toLocaleDateString('en-US', {
            month: 'short',
            year: 'numeric',
        });

        if (!timeline.has(date)) {
            timeline.set(date, {});
            Object.values(LeadSource).forEach((source) => {
                timeline.get(date)![source] = 0;
            });
        }

        timeline.get(date)![lead.source]++;
    });

    return Array.from(timeline.entries())
        .map(([date, data]) => ({
            date,
            ...data,
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

export const LeadSourceReport = ({ leads }: LeadSourceReportProps): JSX.Element => {
    const theme = useTheme();

    if (leads.length === 0) {
        return (
            <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="h6" color="text.secondary">
                    No data available
                </Typography>
            </Box>
        );
    }

    const sourceMetrics = calculateSourceMetrics(leads);
    const timelineData = calculateTimelineData(leads);

    const COLORS = [
        theme.palette.primary.main,
        theme.palette.secondary.main,
        theme.palette.error.main,
        theme.palette.warning.main,
        theme.palette.info.main,
        theme.palette.success.main,
    ];

    return (
        <Box sx={{ p: 3 }}>
            <Grid container spacing={3}>
                {/* Source Distribution Chart */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Lead Sources
                            </Typography>
                            <Box sx={{ height: 300 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={sourceMetrics}
                                            dataKey="total"
                                            nameKey="source"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={80}
                                            label={(entry: SourceMetrics) =>
                                                `${entry.source} (${entry.percentage.toFixed(1)}%)`
                                            }
                                        >
                                            {sourceMetrics.map((entry, index) => (
                                                <Cell
                                                    key={entry.source}
                                                    fill={COLORS[index % COLORS.length]}
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Conversion Rates by Source */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Conversion Rates by Source
                            </Typography>
                            <Box sx={{ height: 300 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={sourceMetrics}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="source" />
                                        <YAxis unit="%" />
                                        <Tooltip />
                                        <Legend />
                                        <Bar
                                            dataKey="conversionRate"
                                            name="Conversion Rate"
                                            fill={theme.palette.success.main}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Source Performance Over Time */}
                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Source Performance Over Time
                            </Typography>
                            <Box sx={{ height: 400 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={timelineData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        {Object.values(LeadSource).map((source, index) => (
                                            <Line
                                                key={source}
                                                type="monotone"
                                                dataKey={source}
                                                name={source}
                                                stroke={COLORS[index % COLORS.length]}
                                            />
                                        ))}
                                    </LineChart>
                                </ResponsiveContainer>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Quality Metrics by Source */}
                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Quality Metrics by Source
                            </Typography>
                            <Box sx={{ height: 300 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={sourceMetrics}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="source" />
                                        <YAxis unit=" days" />
                                        <Tooltip />
                                        <Legend />
                                        <Bar
                                            dataKey="avgConversionTime"
                                            name="Avg. Time to Conversion"
                                            fill={theme.palette.info.main}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}; 