import React, { useState, useCallback } from 'react';
import {
    Box,
    Button,
    Container,
    Dialog,
    DialogContent,
    DialogTitle,
    Divider,
    Grid,
    IconButton,
    Paper,
    Tab,
    Tabs,
    Typography
} from '@mui/material';
import { Add as AddIcon, Close as CloseIcon } from '@mui/icons-material';
import SalesOpportunityDashboard from '../components/sales/SalesOpportunityDashboard';
import SalesOpportunityForm from '../components/sales/SalesOpportunityForm';
import SalesPipeline from '../components/sales/SalesPipeline';
import SalesOpportunityAnalysis from '../components/sales/SalesOpportunityAnalysis';
import { useSalesOpportunities } from '../hooks/useSalesOpportunities';
import { useNotification, Notification } from '../components/common/Notification';
import ErrorBoundary from '../components/common/ErrorBoundary';
import LoadingState from '../components/common/LoadingState';
import { SalesOpportunity } from '../services/agent/processors/sales.processor';
import { salesAPI } from '../services/api/sales.api';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`sales-tabpanel-${index}`}
            aria-labelledby={`sales-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ p: 3 }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

const SalesOpportunityPage: React.FC = () => {
    const [currentTab, setCurrentTab] = useState(0);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedOpportunity, setSelectedOpportunity] = useState<SalesOpportunity | null>(null);
    const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const {
        opportunities,
        loading,
        error,
        refreshOpportunities
    } = useSalesOpportunities();

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setCurrentTab(newValue);
    };

    const handleCreateClick = () => {
        setSelectedOpportunity(null);
        setIsFormOpen(true);
    };

    const handleEditOpportunity = (opportunity: SalesOpportunity) => {
        setSelectedOpportunity(opportunity);
        setIsFormOpen(true);
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setSelectedOpportunity(null);
    };

    const handleFormSubmit = async (data: SalesOpportunity) => {
        try {
            if (selectedOpportunity) {
                await salesAPI.updateOpportunity(selectedOpportunity.id!, data);
                setNotification({ message: 'Opportunity updated successfully', type: 'success' });
            } else {
                await salesAPI.createOpportunity(data);
                setNotification({ message: 'Opportunity created successfully', type: 'success' });
            }
            refreshOpportunities();
            handleCloseForm();
        } catch (err) {
            setNotification({ message: 'Failed to save opportunity', type: 'error' });
            console.error('Error saving opportunity:', err);
        }
    };

    const handleDeleteOpportunity = async (id: string) => {
        try {
            await salesAPI.deleteOpportunity(id);
            setNotification({ message: 'Opportunity deleted successfully', type: 'success' });
            refreshOpportunities();
        } catch (err) {
            setNotification({ message: 'Failed to delete opportunity', type: 'error' });
            console.error('Error deleting opportunity:', err);
        }
    };

    const handleStageChange = async (opportunityId: string, newStage: string) => {
        try {
            const opportunity = opportunities.find(opp => opp.id === opportunityId);
            if (!opportunity) return;

            await salesAPI.updateOpportunity(opportunityId, {
                ...opportunity,
                stage: newStage as SalesOpportunity['stage']
            });
            refreshOpportunities();
        } catch (err) {
            setNotification({ message: 'Failed to update opportunity stage', type: 'error' });
            console.error('Error updating opportunity stage:', err);
        }
    };

    const handleViewAnalysis = useCallback((opportunity: SalesOpportunity) => {
        setSelectedOpportunity(opportunity);
        setIsAnalysisOpen(true);
    }, []);

    const handleCloseAnalysis = () => {
        setIsAnalysisOpen(false);
        setSelectedOpportunity(null);
    };

    if (loading) {
        return <LoadingState text="Loading sales opportunities..." />;
    }

    if (error) {
        return (
            <Box p={3} textAlign="center">
                <Typography color="error" variant="h6">
                    Error loading opportunities
                </Typography>
                <Typography color="textSecondary">
                    {error.message}
                </Typography>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={() => refreshOpportunities()}
                    sx={{ mt: 2 }}
                >
                    Retry
                </Button>
            </Box>
        );
    }

    return (
        <ErrorBoundary>
            <Container maxWidth="xl">
                <Box sx={{ my: 4 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Typography variant="h4" component="h1" gutterBottom>
                            Sales Opportunities
                        </Typography>
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<AddIcon />}
                            onClick={handleCreateClick}
                        >
                            New Opportunity
                        </Button>
                    </Box>

                    <Paper sx={{ mb: 4 }}>
                        <Tabs
                            value={currentTab}
                            onChange={handleTabChange}
                            indicatorColor="primary"
                            textColor="primary"
                            variant="fullWidth"
                        >
                            <Tab label="Dashboard" />
                            <Tab label="Pipeline" />
                        </Tabs>

                        <TabPanel value={currentTab} index={0}>
                            <SalesOpportunityDashboard
                                opportunities={opportunities}
                                onEdit={handleEditOpportunity}
                                onDelete={handleDeleteOpportunity}
                                onSelect={handleViewAnalysis}
                            />
                        </TabPanel>

                        <TabPanel value={currentTab} index={1}>
                            <SalesPipeline
                                opportunities={opportunities}
                                onStageChange={handleStageChange}
                                onOpportunitySelect={handleViewAnalysis}
                            />
                        </TabPanel>
                    </Paper>
                </Box>

                <Dialog
                    open={isFormOpen}
                    onClose={handleCloseForm}
                    maxWidth="md"
                    fullWidth
                >
                    <DialogTitle>
                        <Box display="flex" alignItems="center" justifyContent="space-between">
                            {selectedOpportunity ? 'Edit Opportunity' : 'Create New Opportunity'}
                            <IconButton onClick={handleCloseForm} size="small">
                                <CloseIcon />
                            </IconButton>
                        </Box>
                    </DialogTitle>
                    <DialogContent>
                        <SalesOpportunityForm
                            initialData={selectedOpportunity}
                            onSubmit={handleFormSubmit}
                            onCancel={handleCloseForm}
                        />
                    </DialogContent>
                </Dialog>

                <Dialog
                    open={isAnalysisOpen}
                    onClose={handleCloseAnalysis}
                    maxWidth="md"
                    fullWidth
                >
                    <DialogTitle>
                        <Box display="flex" alignItems="center" justifyContent="space-between">
                            Opportunity Analysis
                            <IconButton onClick={handleCloseAnalysis} size="small">
                                <CloseIcon />
                            </IconButton>
                        </Box>
                    </DialogTitle>
                    <DialogContent>
                        {selectedOpportunity && (
                            <SalesOpportunityAnalysis opportunityId={selectedOpportunity.id!} />
                        )}
                    </DialogContent>
                </Dialog>

                <Notification
                    message={notification?.message}
                    type={notification?.type}
                    onClose={() => setNotification(null)}
                />
            </Container>
        </ErrorBoundary>
    );
};

export default SalesOpportunityPage; 