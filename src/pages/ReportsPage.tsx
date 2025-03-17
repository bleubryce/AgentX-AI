import { useState } from 'react';
import { Box, Tab, Tabs, Typography } from '@mui/material';
import { FC, TabPanelProps } from '../types/common';
import { LeadConversionReport, LeadSourceReport, LeadTrendReport } from '../components/reports';
import { useLeads } from '../hooks/useLeads';

const TabPanel: FC<TabPanelProps> = ({ children, value, index }) => {
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`reports-tabpanel-${index}`}
            aria-labelledby={`reports-tab-${index}`}
        >
            {value === index && (
                <Box sx={{ p: 3 }}>
                    {children}
                </Box>
            )}
        </div>
    );
};

const ReportsPage: FC = () => {
    const [activeTab, setActiveTab] = useState(0);
    const { leads, loading, error } = useLeads();

    const handleTabChange = (_event: unknown, value: number) => {
        setActiveTab(value);
    };

    if (loading) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography>Loading reports...</Typography>
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography color="error">Error loading reports: {error.message}</Typography>
            </Box>
        );
    }

    return (
        <Box>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs
                    value={activeTab}
                    onChange={handleTabChange}
                    aria-label="reports tabs"
                >
                    <Tab label="Lead Conversion" id="reports-tab-0" />
                    <Tab label="Lead Sources" id="reports-tab-1" />
                    <Tab label="Lead Trends" id="reports-tab-2" />
                </Tabs>
            </Box>
            <Box>
                <TabPanel value={activeTab} index={0}>
                    <LeadConversionReport leads={leads} />
                </TabPanel>
                <TabPanel value={activeTab} index={1}>
                    <LeadSourceReport leads={leads} />
                </TabPanel>
                <TabPanel value={activeTab} index={2}>
                    <LeadTrendReport leads={leads} />
                </TabPanel>
            </Box>
        </Box>
    );
};

export default ReportsPage; 