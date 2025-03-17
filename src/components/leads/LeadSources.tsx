import React, { useState } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    CardActions,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Grid,
    IconButton,
    TextField,
    Typography,
    Switch,
    FormControlLabel,
    Select,
    MenuItem,
    FormControl,
    InputLabel
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { LeadSource } from '../../services/agent/processors/lead.processor';

interface SourceStats {
    totalLeads: number;
    qualifiedLeads: number;
    conversionRate: number;
    averageScore: number;
}

interface LeadSourceConfig {
    source: LeadSource;
    isActive: boolean;
    notificationEmail: string;
    autoAssignTo?: string;
    scoreThreshold: number;
    stats: SourceStats;
}

interface LeadSourcesProps {
    sourceConfigs: LeadSourceConfig[];
    onAddSource: (config: Omit<LeadSourceConfig, 'stats'>) => void;
    onUpdateSource: (source: LeadSource, updates: Partial<LeadSourceConfig>) => void;
    onDeleteSource: (source: LeadSource) => void;
    onRefreshStats: () => void;
}

interface FormData {
    source: LeadSource;
    isActive: boolean;
    notificationEmail: string;
    autoAssignTo?: string;
    scoreThreshold: number;
}

const LeadSources: React.FC<LeadSourcesProps> = ({
    sourceConfigs,
    onAddSource,
    onUpdateSource,
    onDeleteSource,
    onRefreshStats
}) => {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedSource, setSelectedSource] = useState<LeadSource | null>(null);
    const [formData, setFormData] = useState<FormData>({
        source: LeadSource.WEBSITE,
        isActive: true,
        notificationEmail: '',
        scoreThreshold: 60
    });
    const [emailError, setEmailError] = useState('');

    const handleOpenDialog = (source?: LeadSource) => {
        if (source) {
            const config = sourceConfigs.find(c => c.source === source);
            if (config) {
                setFormData({
                    source: config.source,
                    isActive: config.isActive,
                    notificationEmail: config.notificationEmail,
                    autoAssignTo: config.autoAssignTo,
                    scoreThreshold: config.scoreThreshold
                });
                setSelectedSource(source);
            }
        } else {
            setFormData({
                source: LeadSource.WEBSITE,
                isActive: true,
                notificationEmail: '',
                scoreThreshold: 60
            });
            setSelectedSource(null);
        }
        setIsDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setIsDialogOpen(false);
        setSelectedSource(null);
        setEmailError('');
    };

    const validateEmail = (email: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const handleSubmit = () => {
        if (!validateEmail(formData.notificationEmail)) {
            setEmailError('Please enter a valid email address');
            return;
        }

        if (selectedSource) {
            onUpdateSource(selectedSource, formData);
        } else {
            onAddSource(formData);
        }
        handleCloseDialog();
    };

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h5">Lead Sources</Typography>
                <Box>
                    <IconButton title="Refresh Statistics" onClick={onRefreshStats}>
                        <RefreshIcon />
                    </IconButton>
                    <Button variant="contained" color="primary" onClick={() => handleOpenDialog()}>
                        Add Source
                    </Button>
                </Box>
            </Box>

            <Grid container spacing={2}>
                {sourceConfigs.map((config) => (
                    <Grid item xs={12} sm={6} md={4} key={config.source}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    {config.source}
                                </Typography>
                                <Typography>Status: {config.isActive ? 'Active' : 'Inactive'}</Typography>
                                <Typography>Notifications: {config.notificationEmail}</Typography>
                                {config.autoAssignTo && (
                                    <Typography>Auto-assign to: {config.autoAssignTo}</Typography>
                                )}
                                <Typography>Score Threshold: {config.scoreThreshold}</Typography>
                                <Box mt={2}>
                                    <Typography variant="subtitle1">Statistics</Typography>
                                    <Typography>Total Leads: {config.stats.totalLeads}</Typography>
                                    <Typography>Qualified Leads: {config.stats.qualifiedLeads}</Typography>
                                    <Typography>Conversion Rate: {config.stats.conversionRate}%</Typography>
                                    <Typography>Average Score: {config.stats.averageScore}</Typography>
                                </Box>
                            </CardContent>
                            <CardActions>
                                <IconButton title="Edit" onClick={() => handleOpenDialog(config.source)}>
                                    <EditIcon />
                                </IconButton>
                                <IconButton title="Delete" onClick={() => onDeleteSource(config.source)}>
                                    <DeleteIcon />
                                </IconButton>
                            </CardActions>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            <Dialog open={isDialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {selectedSource ? 'Edit Lead Source' : 'Add Lead Source'}
                </DialogTitle>
                <DialogContent>
                    <Box mt={2}>
                        <FormControl fullWidth margin="normal">
                            <InputLabel>Source</InputLabel>
                            <Select
                                value={formData.source}
                                label="Source"
                                onChange={(e) => setFormData({ ...formData, source: e.target.value as LeadSource })}
                                disabled={!!selectedSource}
                            >
                                {Object.values(LeadSource).map((source) => (
                                    <MenuItem key={source} value={source}>
                                        {source}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControlLabel
                            control={
                                <Switch
                                    checked={formData.isActive}
                                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                />
                            }
                            label="Active"
                        />

                        <TextField
                            fullWidth
                            margin="normal"
                            label="Notification Email"
                            value={formData.notificationEmail}
                            onChange={(e) => {
                                setFormData({ ...formData, notificationEmail: e.target.value });
                                setEmailError('');
                            }}
                            error={!!emailError}
                            helperText={emailError}
                        />

                        <TextField
                            fullWidth
                            margin="normal"
                            label="Auto-assign To"
                            value={formData.autoAssignTo || ''}
                            onChange={(e) => setFormData({ ...formData, autoAssignTo: e.target.value })}
                        />

                        <TextField
                            fullWidth
                            margin="normal"
                            label="Score Threshold"
                            type="number"
                            value={formData.scoreThreshold}
                            onChange={(e) => setFormData({ ...formData, scoreThreshold: parseInt(e.target.value) })}
                            inputProps={{ min: 0, max: 100 }}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleSubmit} variant="contained" color="primary">
                        {selectedSource ? 'Update' : 'Add'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default LeadSources; 