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
    PieChart,
    Pie,
    Cell
} from 'recharts';
import { Lead } from '../../services/agent/processors/lead.processor';

interface LeadAnalyticsProps {
    leads: Lead[];
}

interface ChartData {
    name: string;
    value: number;
}

const LeadAnalytics: React.FC<LeadAnalyticsProps> = ({ leads }) => {
    const theme = useTheme();

    // Calculate statistics
    const totalLeads = leads.length;
    const leadsBySource = leads.reduce((acc: { [key: string]: number }, lead) => {
        acc[lead.source] = (acc[lead.source] || 0) + 1;
        return acc;
    }, {});

    const leadsByStatus = leads.reduce((acc: { [key: string]: number }, lead) => {
        acc[lead.status] = (acc[lead.status] || 0) + 1;
        return acc;
    }, {});

    // Prepare chart data
    const sourceData: ChartData[] = Object.entries(leadsBySource).map(([name, value]) => ({
        name,
        value
    }));

    const statusData: ChartData[] = Object.entries(leadsByStatus).map(([name, value]) => ({
        name,
        value
    }));

    // Colors for pie chart
    const COLORS = [
        theme.palette.primary.main,
        theme.palette.secondary.main,
        theme.palette.error.main,
        theme.palette.warning.main,
        theme.palette.info.main,
        theme.palette.success.main
    ];

    return (
        <Box>
            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Total Leads
                            </Typography>
                            <Typography variant="h3">
                                {totalLeads}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Leads by Source
                            </Typography>
                            <Box sx={{ height: 300 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={sourceData}
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
                                        <Bar
                                            dataKey="value"
                                            fill={theme.palette.primary.main}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Leads by Status
                            </Typography>
                            <Box sx={{ height: 300 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={statusData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {statusData.map((entry, index) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={COLORS[index % COLORS.length]}
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default LeadAnalytics; 