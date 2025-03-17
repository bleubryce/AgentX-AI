import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    CircularProgress,
    Chip,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Alert,
    Snackbar,
    IconButton,
    TablePagination,
    TableSortLabel,
    Tooltip
} from '@mui/material';
import {
    Timeline,
    TimelineItem,
    TimelineSeparator,
    TimelineConnector,
    TimelineContent,
    TimelineDot
} from '@mui/lab';
import {
    TrendingUp,
    AttachMoney,
    Assessment,
    Schedule,
    Business,
    Assignment,
    CheckCircle,
    Error as ErrorIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Visibility as ViewIcon
} from '@mui/icons-material';
import { salesAPI, SalesAnalysisResponse } from '../../services/api/sales.api';
import { SalesOpportunity } from '../../services/agent/processors/sales.processor';

interface SalesOpportunity {
    id?: string;
    companyName: string;
    contactName: string;
    productInterest: string[];
    budget?: number;
    stage: string;
    priority: string;
    lastInteraction?: Date;
}

interface SalesMetrics {
    opportunityScore: number;
    conversionProbability: number;
    expectedValue: number;
    timeToClose: number;
}

interface CompetitorInfo {
    competitor: string;
    advantages: string[];
    disadvantages: string[];
}

interface SalesOpportunityDashboardProps {
    opportunities: SalesOpportunity[];
    onEdit: (opportunity: SalesOpportunity) => void;
    onDelete: (id: string) => void;
    onSelect: (id: string) => void;
}

type SortField = keyof Pick<SalesOpportunity, 'companyName' | 'contactName' | 'stage' | 'priority'>;
type SortOrder = 'asc' | 'desc';

const SalesOpportunityDashboard: React.FC<SalesOpportunityDashboardProps> = ({
    opportunities,
    onEdit,
    onDelete,
    onSelect
}) => {
    const [selectedOpportunity, setSelectedOpportunity] = useState<SalesOpportunity | null>(null);
    const [analysisData, setAnalysisData] = useState<SalesAnalysisResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [sortField, setSortField] = useState<SortField>('companyName');
    const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

    useEffect(() => {
        fetchOpportunities();
    }, []);

    const fetchOpportunities = async () => {
        try {
            setLoading(true);
            const data = await salesAPI.getOpportunities();
            setOpportunities(data);
            setError(null);
        } catch (err) {
            setError('Failed to fetch opportunities. Please try again later.');
            console.error('Error fetching opportunities:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpportunitySelect = async (opportunity: SalesOpportunity) => {
        try {
            setSelectedOpportunity(opportunity);
            setLoading(true);
            
            if (!opportunity.id) {
                throw new Error('Opportunity ID is required');
            }

            const analysis = await salesAPI.getOpportunityAnalysis(opportunity.id);
            setAnalysisData(analysis);
            setError(null);
        } catch (err) {
            setError('Failed to fetch opportunity analysis. Please try again later.');
            console.error('Error fetching opportunity analysis:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSort = (field: SortField) => {
        const isAsc = sortField === field && sortOrder === 'asc';
        setSortOrder(isAsc ? 'desc' : 'asc');
        setSortField(field);
    };

    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const sortedOpportunities = React.useMemo(() => {
        const compare = (a: SalesOpportunity, b: SalesOpportunity) => {
            const valueA = a[sortField];
            const valueB = b[sortField];
            
            if (valueA < valueB) return sortOrder === 'asc' ? -1 : 1;
            if (valueA > valueB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        };

        return [...opportunities].sort(compare);
    }, [opportunities, sortField, sortOrder]);

    const getStageColor = (stage: string) => {
        switch (stage) {
            case 'PROSPECTING':
                return 'info';
            case 'QUALIFICATION':
                return 'primary';
            case 'PROPOSAL':
                return 'warning';
            case 'NEGOTIATION':
                return 'secondary';
            case 'CLOSED_WON':
                return 'success';
            case 'CLOSED_LOST':
                return 'error';
            default:
                return 'default';
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'HIGH':
                return 'error';
            case 'MEDIUM':
                return 'warning';
            case 'LOW':
                return 'info';
            default:
                return 'default';
        }
    };

    const renderMetricsCards = () => {
        if (!analysisData?.metrics) return null;
        
        const { metrics } = analysisData;
        return (
            <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                Opportunity Score
                            </Typography>
                            <Box display="flex" alignItems="center">
                                <TrendingUp color={metrics.opportunityScore >= 70 ? "success" : "warning"} />
                                <Typography variant="h5" component="div" sx={{ ml: 1 }}>
                                    {metrics.opportunityScore}%
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                Conversion Probability
                            </Typography>
                            <Box display="flex" alignItems="center">
                                <Assessment color={metrics.conversionProbability >= 60 ? "success" : "warning"} />
                                <Typography variant="h5" component="div" sx={{ ml: 1 }}>
                                    {metrics.conversionProbability}%
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                Expected Value
                            </Typography>
                            <Box display="flex" alignItems="center">
                                <AttachMoney color={metrics.expectedValue > 50000 ? "success" : "warning"} />
                                <Typography variant="h5" component="div" sx={{ ml: 1 }}>
                                    ${metrics.expectedValue.toLocaleString()}
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                Time to Close
                            </Typography>
                            <Box display="flex" alignItems="center">
                                <Schedule color={metrics.timeToClose <= 45 ? "success" : "warning"} />
                                <Typography variant="h5" component="div" sx={{ ml: 1 }}>
                                    {metrics.timeToClose} days
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        );
    };

    const renderCompetitorAnalysis = () => {
        if (!analysisData?.analysis.competitive) return null;

        const { competitorComparison } = analysisData.analysis.competitive;
        return (
            <TableContainer component={Paper} sx={{ mt: 3 }}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Competitor</TableCell>
                            <TableCell>Advantages</TableCell>
                            <TableCell>Disadvantages</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {competitorComparison.map((competitor, index) => (
                            <TableRow key={index}>
                                <TableCell>{competitor.competitor}</TableCell>
                                <TableCell>
                                    {competitor.advantages.map((advantage, i) => (
                                        <Chip
                                            key={i}
                                            label={advantage}
                                            color="success"
                                            size="small"
                                            sx={{ m: 0.5 }}
                                        />
                                    ))}
                                </TableCell>
                                <TableCell>
                                    {competitor.disadvantages.map((disadvantage, i) => (
                                        <Chip
                                            key={i}
                                            label={disadvantage}
                                            color="error"
                                            size="small"
                                            sx={{ m: 0.5 }}
                                        />
                                    ))}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        );
    };

    const renderNextSteps = () => {
        if (!analysisData?.nextSteps) return null;

        return (
            <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Next Steps
                </Typography>
                <Timeline>
                    {analysisData.nextSteps.map((step, index) => (
                        <TimelineItem key={index}>
                            <TimelineSeparator>
                                <TimelineDot color={step.priority === 'HIGH' ? "error" : "primary"}>
                                    <Assignment />
                                </TimelineDot>
                                {index < analysisData.nextSteps.length - 1 && <TimelineConnector />}
                            </TimelineSeparator>
                            <TimelineContent>
                                <Typography variant="h6" component="span">
                                    {step.action}
                                </Typography>
                                <Typography color="textSecondary">
                                    Priority: {step.priority}
                                    {step.deadline && ` | Deadline: ${new Date(step.deadline).toLocaleDateString()}`}
                                </Typography>
                            </TimelineContent>
                        </TimelineItem>
                    ))}
                </Timeline>
            </Box>
        );
    };

    const renderSalesStrategy = () => {
        if (!analysisData?.analysis.strategy) return null;

        const { strategy } = analysisData.analysis;
        return (
            <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Sales Strategy
                </Typography>
                <Card>
                    <CardContent>
                        <Typography variant="subtitle1" gutterBottom>
                            Recommended Approach
                        </Typography>
                        <Typography paragraph>
                            {strategy.recommendedApproach}
                        </Typography>

                        <Typography variant="subtitle1" gutterBottom>
                            Key Talking Points
                        </Typography>
                        <Box sx={{ mb: 2 }}>
                            {strategy.keyTalkingPoints.map((point, index) => (
                                <Chip
                                    key={index}
                                    label={point}
                                    color="primary"
                                    size="small"
                                    sx={{ m: 0.5 }}
                                />
                            ))}
                        </Box>

                        <Typography variant="subtitle1" gutterBottom>
                            Risk Factors
                        </Typography>
                        <Box>
                            {strategy.riskFactors.map((risk, index) => (
                                <Chip
                                    key={index}
                                    label={risk}
                                    color="warning"
                                    size="small"
                                    sx={{ m: 0.5 }}
                                />
                            ))}
                        </Box>
                    </CardContent>
                </Card>
            </Box>
        );
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                Sales Opportunities
            </Typography>

            <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Opportunities
                            </Typography>
                            <Paper sx={{ width: '100%', overflow: 'hidden' }}>
                                <TableContainer>
                                    <Table stickyHeader>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>
                                                    <TableSortLabel
                                                        active={sortField === 'companyName'}
                                                        direction={sortField === 'companyName' ? sortOrder : 'asc'}
                                                        onClick={() => handleSort('companyName')}
                                                    >
                                                        Company
                                                    </TableSortLabel>
                                                </TableCell>
                                                <TableCell>
                                                    <TableSortLabel
                                                        active={sortField === 'contactName'}
                                                        direction={sortField === 'contactName' ? sortOrder : 'asc'}
                                                        onClick={() => handleSort('contactName')}
                                                    >
                                                        Contact
                                                    </TableSortLabel>
                                                </TableCell>
                                                <TableCell>Products</TableCell>
                                                <TableCell>
                                                    <TableSortLabel
                                                        active={sortField === 'stage'}
                                                        direction={sortField === 'stage' ? sortOrder : 'asc'}
                                                        onClick={() => handleSort('stage')}
                                                    >
                                                        Stage
                                                    </TableSortLabel>
                                                </TableCell>
                                                <TableCell>
                                                    <TableSortLabel
                                                        active={sortField === 'priority'}
                                                        direction={sortField === 'priority' ? sortOrder : 'asc'}
                                                        onClick={() => handleSort('priority')}
                                                    >
                                                        Priority
                                                    </TableSortLabel>
                                                </TableCell>
                                                <TableCell align="right">Actions</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {sortedOpportunities
                                                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                                .map((opportunity) => (
                                                    <TableRow
                                                        key={opportunity.id}
                                                        hover
                                                        sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                                                    >
                                                        <TableCell>
                                                            <Typography variant="subtitle2">
                                                                {opportunity.companyName}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography variant="body2">
                                                                {opportunity.contactName}
                                                            </Typography>
                                                            {opportunity.contactEmail && (
                                                                <Typography variant="caption" color="textSecondary">
                                                                    {opportunity.contactEmail}
                                                                </Typography>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                                                {opportunity.productInterest.map((product, index) => (
                                                                    <Chip
                                                                        key={index}
                                                                        label={product}
                                                                        size="small"
                                                                        variant="outlined"
                                                                    />
                                                                ))}
                                                            </Box>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Chip
                                                                label={opportunity.stage.replace('_', ' ')}
                                                                color={getStageColor(opportunity.stage)}
                                                                size="small"
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Chip
                                                                label={opportunity.priority}
                                                                color={getPriorityColor(opportunity.priority)}
                                                                size="small"
                                                            />
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            <Tooltip title="View Analysis">
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => onSelect(opportunity.id!)}
                                                                >
                                                                    <ViewIcon />
                                                                </IconButton>
                                                            </Tooltip>
                                                            <Tooltip title="Edit">
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => onEdit(opportunity)}
                                                                >
                                                                    <EditIcon />
                                                                </IconButton>
                                                            </Tooltip>
                                                            <Tooltip title="Delete">
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => onDelete(opportunity.id!)}
                                                                    color="error"
                                                                >
                                                                    <DeleteIcon />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                                <TablePagination
                                    rowsPerPageOptions={[5, 10, 25]}
                                    component="div"
                                    count={opportunities.length}
                                    rowsPerPage={rowsPerPage}
                                    page={page}
                                    onPageChange={handleChangePage}
                                    onRowsPerPageChange={handleChangeRowsPerPage}
                                />
                            </Paper>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={8}>
                    {selectedOpportunity && analysisData && (
                        <>
                            <Typography variant="h5" gutterBottom>
                                {selectedOpportunity.companyName} - Analysis
                            </Typography>

                            {renderMetricsCards()}
                            {renderCompetitorAnalysis()}
                            {renderSalesStrategy()}
                            {renderNextSteps()}
                        </>
                    )}
                </Grid>
            </Grid>

            <Snackbar
                open={!!error}
                autoHideDuration={6000}
                onClose={() => setError(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert onClose={() => setError(null)} severity="error">
                    {error}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default SalesOpportunityDashboard; 