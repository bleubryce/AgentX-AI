import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    CircularProgress,
    Chip,
    IconButton,
    Menu,
    MenuItem,
    Dialog,
    useTheme,
    Paper
} from '@mui/material';
import {
    DragDropContext,
    Droppable,
    Draggable,
    DropResult
} from 'react-beautiful-dnd';
import {
    MoreVert as MoreVertIcon,
    AttachMoney,
    AccessTime,
    Business,
    Person
} from '@mui/icons-material';
import { salesAPI } from '../../services/api/sales.api';
import { SalesOpportunity } from '../../services/agent/processors/sales.processor';
import SalesOpportunityForm from './SalesOpportunityForm';

interface StageColumn {
    id: SalesOpportunity['stage'];
    title: string;
    opportunities: SalesOpportunity[];
}

const STAGE_COLORS = {
    PROSPECTING: '#e3f2fd',
    QUALIFICATION: '#e8f5e9',
    PROPOSAL: '#fff3e0',
    NEGOTIATION: '#fce4ec',
    CLOSED_WON: '#e8f5e9',
    CLOSED_LOST: '#ffebee'
};

interface SalesPipelineProps {
    opportunities: SalesOpportunity[];
    onStageChange: (opportunityId: string, newStage: string) => void;
    onOpportunitySelect: (opportunity: SalesOpportunity) => void;
}

const stages = [
    'PROSPECTING',
    'QUALIFICATION',
    'PROPOSAL',
    'NEGOTIATION',
    'CLOSED_WON',
    'CLOSED_LOST'
] as const;

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

const formatCurrency = (amount: number | null) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
};

const SalesPipeline: React.FC<SalesPipelineProps> = ({
    opportunities,
    onStageChange,
    onOpportunitySelect
}) => {
    const theme = useTheme();
    const [columns, setColumns] = useState<StageColumn[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
    const [selectedOpportunity, setSelectedOpportunity] = useState<SalesOpportunity | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    useEffect(() => {
        loadOpportunities();
    }, []);

    const loadOpportunities = async () => {
        try {
            setLoading(true);
            const opportunities = await salesAPI.getOpportunities();
            
            // Group opportunities by stage
            const groupedOpportunities = opportunities.reduce((acc, opportunity) => {
                const stage = opportunity.stage;
                if (!acc[stage]) {
                    acc[stage] = [];
                }
                acc[stage].push(opportunity);
                return acc;
            }, {} as Record<string, SalesOpportunity[]>);

            // Create columns
            const newColumns: StageColumn[] = [
                {
                    id: 'PROSPECTING',
                    title: 'Prospecting',
                    opportunities: groupedOpportunities['PROSPECTING'] || []
                },
                {
                    id: 'QUALIFICATION',
                    title: 'Qualification',
                    opportunities: groupedOpportunities['QUALIFICATION'] || []
                },
                {
                    id: 'PROPOSAL',
                    title: 'Proposal',
                    opportunities: groupedOpportunities['PROPOSAL'] || []
                },
                {
                    id: 'NEGOTIATION',
                    title: 'Negotiation',
                    opportunities: groupedOpportunities['NEGOTIATION'] || []
                },
                {
                    id: 'CLOSED_WON',
                    title: 'Closed Won',
                    opportunities: groupedOpportunities['CLOSED_WON'] || []
                },
                {
                    id: 'CLOSED_LOST',
                    title: 'Closed Lost',
                    opportunities: groupedOpportunities['CLOSED_LOST'] || []
                }
            ];

            setColumns(newColumns);
            setError(null);
        } catch (err) {
            setError('Failed to load opportunities. Please try again.');
            console.error('Error loading opportunities:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDragEnd = (result: DropResult) => {
        if (!result.destination) return;

        const { draggableId, destination } = result;
        const newStage = destination.droppableId;
        onStageChange(draggableId, newStage);
    };

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, opportunity: SalesOpportunity) => {
        setMenuAnchor(event.currentTarget);
        setSelectedOpportunity(opportunity);
    };

    const handleMenuClose = () => {
        setMenuAnchor(null);
        setSelectedOpportunity(null);
    };

    const handleEdit = () => {
        setIsEditDialogOpen(true);
        handleMenuClose();
    };

    const handleDelete = async () => {
        if (!selectedOpportunity?.id) return;

        try {
            await salesAPI.deleteOpportunity(selectedOpportunity.id);
            await loadOpportunities();
        } catch (err) {
            setError('Failed to delete opportunity. Please try again.');
            console.error('Error deleting opportunity:', err);
        }
        handleMenuClose();
    };

    const handleFormSubmit = async () => {
        setIsEditDialogOpen(false);
        await loadOpportunities();
    };

    const getOpportunitiesByStage = (stage: string) => {
        return opportunities.filter(opp => opp.stage === stage);
    };

    const getTotalValue = (stage: string) => {
        return getOpportunitiesByStage(stage)
            .reduce((sum, opp) => sum + (opp.budget || 0), 0);
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ height: '100%', p: 2 }}>
            <Typography variant="h4" gutterBottom>
                Sales Pipeline
            </Typography>

            <DragDropContext onDragEnd={handleDragEnd}>
                <Box sx={{ overflowX: 'auto', py: 2 }}>
                    <Grid container spacing={2} sx={{ minWidth: 1200 }}>
                        {stages.map((stage) => (
                            <Grid item xs={2} key={stage}>
                                <Paper
                                    elevation={0}
                                    sx={{
                                        bgcolor: theme.palette.background.default,
                                        height: '100%',
                                        minHeight: 600
                                    }}
                                >
                                    <Box sx={{ p: 2 }}>
                                        <Typography variant="h6" gutterBottom>
                                            {stage.replace('_', ' ')}
                                        </Typography>
                                        <Typography variant="subtitle2" color="text.secondary">
                                            {getOpportunitiesByStage(stage).length} opportunities
                                        </Typography>
                                        <Typography variant="subtitle2" color="text.secondary">
                                            Total: {formatCurrency(getTotalValue(stage))}
                                        </Typography>
                                    </Box>

                                    <Droppable droppableId={stage}>
                                        {(provided) => (
                                            <Box
                                                ref={provided.innerRef}
                                                {...provided.droppableProps}
                                                sx={{ p: 1 }}
                                            >
                                                {getOpportunitiesByStage(stage).map((opportunity, index) => (
                                                    <Draggable
                                                        key={opportunity.id}
                                                        draggableId={opportunity.id}
                                                        index={index}
                                                    >
                                                        {(provided, snapshot) => (
                                                            <Card
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                {...provided.dragHandleProps}
                                                                sx={{
                                                                    mb: 1,
                                                                    cursor: 'pointer',
                                                                    transform: snapshot.isDragging ? 'rotate(3deg)' : 'none',
                                                                    transition: 'transform 0.2s'
                                                                }}
                                                                onClick={() => onOpportunitySelect(opportunity)}
                                                            >
                                                                <CardContent>
                                                                    <Typography variant="subtitle1" gutterBottom>
                                                                        {opportunity.companyName}
                                                                    </Typography>
                                                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                                                        {opportunity.contactName}
                                                                    </Typography>
                                                                    <Box sx={{ mt: 1 }}>
                                                                        <Chip
                                                                            label={opportunity.priority}
                                                                            size="small"
                                                                            color={getPriorityColor(opportunity.priority)}
                                                                            sx={{ mr: 1 }}
                                                                        />
                                                                        <Chip
                                                                            label={formatCurrency(opportunity.budget)}
                                                                            size="small"
                                                                            variant="outlined"
                                                                        />
                                                                    </Box>
                                                                </CardContent>
                                                            </Card>
                                                        )}
                                                    </Draggable>
                                                ))}
                                                {provided.placeholder}
                                            </Box>
                                        )}
                                    </Droppable>
                                </Paper>
                            </Grid>
                        ))}
                    </Grid>
                </Box>
            </DragDropContext>

            <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={handleMenuClose}
            >
                <MenuItem onClick={handleEdit}>Edit</MenuItem>
                <MenuItem onClick={handleDelete}>Delete</MenuItem>
            </Menu>

            <Dialog
                open={isEditDialogOpen}
                onClose={() => setIsEditDialogOpen(false)}
                maxWidth="md"
                fullWidth
            >
                <SalesOpportunityForm
                    opportunityId={selectedOpportunity?.id}
                    onSubmit={handleFormSubmit}
                    onCancel={() => setIsEditDialogOpen(false)}
                />
            </Dialog>
        </Box>
    );
};

export default SalesPipeline; 