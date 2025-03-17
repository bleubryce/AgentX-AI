import React, { useState } from 'react';
import {
    Box,
    Button,
    Container,
    Dialog,
    DialogContent,
    DialogTitle,
    Grid,
    IconButton,
    Paper,
    Tab,
    Tabs,
    Typography
} from '@mui/material';
import { Add as AddIcon, Close as CloseIcon } from '@mui/icons-material';
import { useLeads } from '../hooks/useLeads';
import ErrorBoundary from '../components/common/ErrorBoundary';
import LoadingState from '../components/common/LoadingState';
import LeadForm from '../components/leads/LeadForm';
import LeadList from '../components/leads/LeadList';
import LeadAnalytics from '../components/leads/LeadAnalytics';
import { Lead } from '../services/agent/processors/lead.processor';

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
            id={`lead-tabpanel-${index}`}
            aria-labelledby={`lead-tab-${index}`}
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

const LeadGenerationPage: React.FC = () => {
    const [currentTab, setCurrentTab] = useState(0);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const { leads, loading, error, refreshLeads, createLead, updateLead, deleteLead } = useLeads();

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setCurrentTab(newValue);
    };

    const handleCreateClick = () => {
        setSelectedLead(null);
        setIsFormOpen(true);
    };

    const handleEditLead = (lead: Lead) => {
        setSelectedLead(lead);
        setIsFormOpen(true);
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setSelectedLead(null);
    };

    const handleFormSubmit = async (data: Omit<Lead, 'id' | 'createdAt'>) => {
        try {
            if (selectedLead) {
                await updateLead(selectedLead.id, data);
            } else {
                await createLead(data);
            }
            refreshLeads();
            handleCloseForm();
        } catch (err) {
            console.error('Error saving lead:', err);
        }
    };

    const handleDeleteLead = async (id: string) => {
        try {
            await deleteLead(id);
            refreshLeads();
        } catch (err) {
            console.error('Error deleting lead:', err);
        }
    };

    if (loading) {
        return <LoadingState text="Loading leads..." />;
    }

    if (error) {
        return (
            <Box p={3} textAlign="center">
                <Typography color="error" variant="h6">
                    Error loading leads
                </Typography>
                <Typography color="textSecondary">
                    {error.message}
                </Typography>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={() => refreshLeads()}
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
                            Lead Generation
                        </Typography>
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<AddIcon />}
                            onClick={handleCreateClick}
                        >
                            New Lead
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
                            <Tab label="All Leads" />
                            <Tab label="Analytics" />
                        </Tabs>

                        <TabPanel value={currentTab} index={0}>
                            <LeadList
                                leads={leads}
                                onEdit={handleEditLead}
                                onDelete={handleDeleteLead}
                            />
                        </TabPanel>

                        <TabPanel value={currentTab} index={1}>
                            <LeadAnalytics leads={leads} />
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
                            {selectedLead ? 'Edit Lead' : 'Create New Lead'}
                            <IconButton onClick={handleCloseForm} size="small">
                                <CloseIcon />
                            </IconButton>
                        </Box>
                    </DialogTitle>
                    <DialogContent>
                        <LeadForm
                            initialData={selectedLead}
                            onSubmit={handleFormSubmit}
                            onCancel={handleCloseForm}
                        />
                    </DialogContent>
                </Dialog>
            </Container>
        </ErrorBoundary>
    );
};

export default LeadGenerationPage; 