import React from 'react';
import {
    Box,
    Card,
    CardContent,
    Chip,
    Divider,
    Grid,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Paper,
    Typography,
    useTheme
} from '@mui/material';
import {
    Assessment,
    CompareArrows,
    EmojiEvents,
    MonetizationOn,
    Schedule,
    Speed,
    TrendingUp
} from '@mui/icons-material';
import { SalesAnalysisResponse } from '../../services/api/sales.api';
import LoadingState from '../common/LoadingState';
import ErrorBoundary from '../common/ErrorBoundary';

interface SalesOpportunityAnalysisProps {
    analysis: SalesAnalysisResponse | null;
    loading: boolean;
    error: Error | null;
}

const SalesOpportunityAnalysis: React.FC<SalesOpportunityAnalysisProps> = ({
    analysis,
    loading,
    error
}) => {
    const theme = useTheme();

    if (loading) {
        return <LoadingState text="Loading analysis..." />;
    }

    if (error) {
        return (
            <Box p={3} textAlign="center">
                <Typography color="error" variant="h6">
                    Error loading analysis
                </Typography>
                <Typography color="textSecondary">
                    {error.message}
                </Typography>
            </Box>
        );
    }

    if (!analysis) {
        return (
            <Box p={3} textAlign="center">
                <Typography color="textSecondary">
                    Select an opportunity to view analysis
                </Typography>
            </Box>
        );
    }

    const { metrics, analysis: analysisData, nextSteps } = analysis;

    const renderMetricsCard = () => (
        <Card elevation={2}>
            <CardContent>
                <Typography variant="h6" gutterBottom>
                    <Assessment fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Opportunity Metrics
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                    <Grid item xs={6} md={3}>
                        <Box textAlign="center">
                            <Speed color="primary" sx={{ fontSize: 40 }} />
                            <Typography variant="h4">{metrics.opportunityScore}</Typography>
                            <Typography variant="body2" color="textSecondary">
                                Opportunity Score
                            </Typography>
                        </Box>
                    </Grid>
                    <Grid item xs={6} md={3}>
                        <Box textAlign="center">
                            <TrendingUp color="success" sx={{ fontSize: 40 }} />
                            <Typography variant="h4">{metrics.conversionProbability}%</Typography>
                            <Typography variant="body2" color="textSecondary">
                                Conversion Probability
                            </Typography>
                        </Box>
                    </Grid>
                    <Grid item xs={6} md={3}>
                        <Box textAlign="center">
                            <MonetizationOn color="secondary" sx={{ fontSize: 40 }} />
                            <Typography variant="h4">
                                ${metrics.expectedValue.toLocaleString()}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                                Expected Value
                            </Typography>
                        </Box>
                    </Grid>
                    <Grid item xs={6} md={3}>
                        <Box textAlign="center">
                            <Schedule color="info" sx={{ fontSize: 40 }} />
                            <Typography variant="h4">{metrics.timeToClose}</Typography>
                            <Typography variant="body2" color="textSecondary">
                                Days to Close
                            </Typography>
                        </Box>
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    );

    const renderCompetitiveAnalysis = () => (
        <Card elevation={2}>
            <CardContent>
                <Typography variant="h6" gutterBottom>
                    <CompareArrows fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Competitive Analysis
                </Typography>
                <Divider sx={{ mb: 2 }} />
                {analysisData.competitive.competitorComparison.map((competitor, index) => (
                    <Paper
                        key={index}
                        elevation={1}
                        sx={{ p: 2, mb: 2, bgcolor: theme.palette.background.default }}
                    >
                        <Typography variant="subtitle1" gutterBottom>
                            {competitor.competitor}
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                                <Typography variant="subtitle2" color="success.main" gutterBottom>
                                    Our Advantages
                                </Typography>
                                <List dense disablePadding>
                                    {competitor.advantages.map((advantage, i) => (
                                        <ListItem key={i} disablePadding sx={{ py: 0.5 }}>
                                            <ListItemIcon sx={{ minWidth: 30 }}>
                                                <EmojiEvents fontSize="small" color="success" />
                                            </ListItemIcon>
                                            <ListItemText primary={advantage} />
                                        </ListItem>
                                    ))}
                                </List>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <Typography variant="subtitle2" color="error.main" gutterBottom>
                                    Their Advantages
                                </Typography>
                                <List dense disablePadding>
                                    {competitor.disadvantages.map((disadvantage, i) => (
                                        <ListItem key={i} disablePadding sx={{ py: 0.5 }}>
                                            <ListItemIcon sx={{ minWidth: 30 }}>
                                                <EmojiEvents fontSize="small" color="error" />
                                            </ListItemIcon>
                                            <ListItemText primary={disadvantage} />
                                        </ListItem>
                                    ))}
                                </List>
                            </Grid>
                        </Grid>
                    </Paper>
                ))}
            </CardContent>
        </Card>
    );

    const renderSalesStrategy = () => (
        <Card elevation={2}>
            <CardContent>
                <Typography variant="h6" gutterBottom>
                    <TrendingUp fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Recommended Strategy
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="subtitle1" gutterBottom>
                    Approach
                </Typography>
                <Typography paragraph>
                    {analysisData.strategy.recommendedApproach}
                </Typography>

                <Typography variant="subtitle1" gutterBottom>
                    Key Talking Points
                </Typography>
                <List dense>
                    {analysisData.strategy.keyTalkingPoints.map((point, index) => (
                        <ListItem key={index}>
                            <ListItemIcon>
                                <TrendingUp />
                            </ListItemIcon>
                            <ListItemText primary={point} />
                        </ListItem>
                    ))}
                </List>

                <Typography variant="subtitle1" gutterBottom>
                    Risk Factors
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {analysisData.strategy.riskFactors.map((risk, index) => (
                        <Chip
                            key={index}
                            label={risk}
                            color="error"
                            variant="outlined"
                            size="small"
                        />
                    ))}
                </Box>
            </CardContent>
        </Card>
    );

    const renderNextSteps = () => (
        <Card elevation={2}>
            <CardContent>
                <Typography variant="h6" gutterBottom>
                    <Schedule fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Next Steps
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <List>
                    {nextSteps.map((step, index) => (
                        <ListItem key={index} divider={index < nextSteps.length - 1}>
                            <ListItemText
                                primary={step.action}
                                secondary={step.deadline ? `Deadline: ${step.deadline}` : undefined}
                            />
                            <Chip
                                label={step.priority}
                                color={
                                    step.priority === 'HIGH'
                                        ? 'error'
                                        : step.priority === 'MEDIUM'
                                        ? 'warning'
                                        : 'info'
                                }
                                size="small"
                            />
                        </ListItem>
                    ))}
                </List>
            </CardContent>
        </Card>
    );

    return (
        <ErrorBoundary>
            <Box sx={{ p: 2 }}>
                <Typography variant="h5" gutterBottom>
                    Analysis for {analysis.opportunity.companyName}
                </Typography>
                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        {renderMetricsCard()}
                    </Grid>
                    <Grid item xs={12} md={6}>
                        {renderCompetitiveAnalysis()}
                    </Grid>
                    <Grid item xs={12} md={6}>
                        {renderSalesStrategy()}
                    </Grid>
                    <Grid item xs={12}>
                        {renderNextSteps()}
                    </Grid>
                </Grid>
            </Box>
        </ErrorBoundary>
    );
};

export default SalesOpportunityAnalysis; 