import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  useTheme,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Lead, LeadStatus } from '../../types/lead';

interface LeadConversionReportProps {
  leads: Lead[];
}

interface ConversionMetrics {
  totalLeads: number;
  convertedLeads: number;
  conversionRate: number;
  averageConversionTime: number;
}

interface StatusDistribution {
  status: LeadStatus;
  count: number;
  percentage: number;
}

interface ConversionTrend {
  date: string;
  totalLeads: number;
  convertedLeads: number;
}

const calculateConversionMetrics = (leads: Lead[]): ConversionMetrics => {
  const totalLeads = leads.length;
  const convertedLeads = leads.filter(
    (lead) => lead.status === LeadStatus.CONVERTED
  ).length;
  const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

  const convertedLeadsWithDates = leads
    .filter((lead) => lead.status === LeadStatus.CONVERTED)
    .map((lead) => {
      const createdDate = new Date(lead.createdAt!);
      const updatedDate = new Date(lead.updatedAt!);
      return Math.floor(
        (updatedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
      );
    });

  const averageConversionTime =
    convertedLeadsWithDates.length > 0
      ? Math.round(
          convertedLeadsWithDates.reduce((a, b) => a + b, 0) /
            convertedLeadsWithDates.length
        )
      : 0;

  return {
    totalLeads,
    convertedLeads,
    conversionRate,
    averageConversionTime,
  };
};

const calculateStatusDistribution = (leads: Lead[]): StatusDistribution[] => {
  const distribution = new Map<LeadStatus, number>();
  leads.forEach((lead) => {
    distribution.set(lead.status, (distribution.get(lead.status) || 0) + 1);
  });

  return Array.from(distribution.entries()).map(([status, count]) => ({
    status,
    count,
    percentage: (count / leads.length) * 100,
  }));
};

const calculateConversionTrend = (leads: Lead[]): ConversionTrend[] => {
  const trend = new Map<string, { total: number; converted: number }>();

  leads.forEach((lead) => {
    const date = new Date(lead.createdAt!).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });
    const current = trend.get(date) || { total: 0, converted: 0 };
    trend.set(date, {
      total: current.total + 1,
      converted:
        current.converted + (lead.status === LeadStatus.CONVERTED ? 1 : 0),
    });
  });

  return Array.from(trend.entries())
    .map(([date, data]) => ({
      date,
      totalLeads: data.total,
      convertedLeads: data.converted,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

export const LeadConversionReport: React.FC<LeadConversionReportProps> = ({
  leads,
}) => {
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

  const metrics = calculateConversionMetrics(leads);
  const statusDistribution = calculateStatusDistribution(leads);
  const conversionTrend = calculateConversionTrend(leads);

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
        {/* Metrics Cards */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Total Leads
              </Typography>
              <Typography variant="h4">{metrics.totalLeads}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Converted Leads
              </Typography>
              <Typography variant="h4">{metrics.convertedLeads}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Conversion Rate
              </Typography>
              <Typography variant="h4">
                {metrics.conversionRate.toFixed(2)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Average Conversion Time
              </Typography>
              <Typography variant="h4">
                {metrics.averageConversionTime} days
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Conversion Trend Chart */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Conversion Trend
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={conversionTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="totalLeads"
                      name="Total Leads"
                      fill={theme.palette.primary.main}
                    />
                    <Bar
                      dataKey="convertedLeads"
                      name="Converted Leads"
                      fill={theme.palette.success.main}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Status Distribution Chart */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Status Distribution
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={(entry) =>
                        `${entry.status} (${entry.percentage.toFixed(1)}%)`
                      }
                    >
                      {statusDistribution.map((entry, index) => (
                        <Cell
                          key={entry.status}
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
      </Grid>
    </Box>
  );
}; 