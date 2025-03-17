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
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Chip,
    FormHelperText,
    DialogContentText
} from '@mui/material';
import {
    Edit as EditIcon,
    Delete as DeleteIcon,
    FileCopy as DuplicateIcon,
    PlayArrow as PlayIcon,
    Pause as PauseIcon
} from '@mui/icons-material';
import {
    Campaign,
    CampaignType,
    CampaignStatus,
    CampaignProcessor
} from '../../services/agent/processors/campaign.processor';

interface CampaignsProps {
    campaigns: Campaign[];
    onCreateCampaign: (campaign: Omit<Campaign, 'id' | 'performance'>) => void;
    onUpdateCampaign: (id: string, updates: Partial<Campaign>) => void;
    onDeleteCampaign: (id: string) => void;
    onDuplicateCampaign: (id: string) => void;
    onToggleCampaignStatus: (id: string, newStatus: CampaignStatus) => void;
}

interface FormData {
    name: string;
    type: CampaignType;
    startDate: string;
    endDate: string;
    budget: number;
    target: {
        locations: string[];
        propertyTypes: string[];
        priceRange: {
            min: number;
            max: number;
        };
    };
}

const Campaigns: React.FC<CampaignsProps> = ({
    campaigns,
    onCreateCampaign,
    onUpdateCampaign,
    onDeleteCampaign,
    onDuplicateCampaign,
    onToggleCampaignStatus
}) => {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
    const [statusFilter, setStatusFilter] = useState<CampaignStatus | 'ALL'>('ALL');
    const [formData, setFormData] = useState<FormData>({
        name: '',
        type: CampaignType.EMAIL,
        startDate: '',
        endDate: '',
        budget: 0,
        target: {
            locations: [],
            propertyTypes: [],
            priceRange: { min: 0, max: 0 }
        }
    });
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const handleOpenDialog = (campaign?: Campaign) => {
        if (campaign) {
            setFormData({
                name: campaign.name,
                type: campaign.type,
                startDate: campaign.startDate,
                endDate: campaign.endDate,
                budget: campaign.budget,
                target: { ...campaign.target }
            });
            setSelectedCampaign(campaign);
        } else {
            setFormData({
                name: '',
                type: CampaignType.EMAIL,
                startDate: '',
                endDate: '',
                budget: 0,
                target: {
                    locations: [],
                    propertyTypes: [],
                    priceRange: { min: 0, max: 0 }
                }
            });
            setSelectedCampaign(null);
        }
        setFormErrors({});
        setIsDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setIsDialogOpen(false);
        setSelectedCampaign(null);
        setFormErrors({});
    };

    const validateForm = (): boolean => {
        const errors: Record<string, string> = {};

        if (!formData.name.trim()) {
            errors.name = 'Campaign name is required';
        }

        if (!formData.startDate) {
            errors.startDate = 'Start date is required';
        }

        if (!formData.endDate) {
            errors.endDate = 'End date is required';
        }

        if (formData.startDate && formData.endDate) {
            if (!CampaignProcessor.validateDates(formData.startDate, formData.endDate)) {
                errors.endDate = 'End date must be after start date';
            }
        }

        if (!CampaignProcessor.validateBudget(formData.budget)) {
            errors.budget = 'Budget must be greater than 0';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = () => {
        if (!validateForm()) {
            return;
        }

        if (selectedCampaign) {
            onUpdateCampaign(selectedCampaign.id, formData);
        } else {
            onCreateCampaign({
                ...formData,
                status: CampaignStatus.DRAFT
            });
        }
        handleCloseDialog();
    };

    const handleDeleteClick = (campaign: Campaign) => {
        setSelectedCampaign(campaign);
        setIsDeleteDialogOpen(true);
    };

    const handleConfirmDelete = () => {
        if (selectedCampaign) {
            onDeleteCampaign(selectedCampaign.id);
        }
        setIsDeleteDialogOpen(false);
        setSelectedCampaign(null);
    };

    const getStatusColor = (status: CampaignStatus): string => {
        switch (status) {
            case CampaignStatus.ACTIVE:
                return 'success';
            case CampaignStatus.SCHEDULED:
                return 'info';
            case CampaignStatus.PAUSED:
                return 'warning';
            case CampaignStatus.COMPLETED:
                return 'primary';
            case CampaignStatus.CANCELLED:
                return 'error';
            default:
                return 'default';
        }
    };

    const filteredCampaigns = statusFilter === 'ALL'
        ? campaigns
        : campaigns.filter(campaign => campaign.status === statusFilter);

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h5">Marketing Campaigns</Typography>
                <Box>
                    <FormControl sx={{ minWidth: 120, mr: 2 }}>
                        <InputLabel>Filter by Status</InputLabel>
                        <Select
                            value={statusFilter}
                            label="Filter by Status"
                            onChange={(e) => setStatusFilter(e.target.value as CampaignStatus | 'ALL')}
                        >
                            <MenuItem value="ALL">All</MenuItem>
                            {Object.values(CampaignStatus).map((status) => (
                                <MenuItem key={status} value={status}>{status}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={() => handleOpenDialog()}
                    >
                        Create Campaign
                    </Button>
                </Box>
            </Box>

            <Grid container spacing={2}>
                {filteredCampaigns.map((campaign) => (
                    <Grid item xs={12} md={6} key={campaign.id}>
                        <Card>
                            <CardContent>
                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                    <Typography variant="h6">{campaign.name}</Typography>
                                    <Chip
                                        label={campaign.status}
                                        color={getStatusColor(campaign.status) as any}
                                        size="small"
                                    />
                                </Box>
                                <Typography color="textSecondary" gutterBottom>
                                    {campaign.type}
                                </Typography>
                                <Typography>
                                    Budget: ${campaign.budget.toLocaleString()}
                                </Typography>
                                <Typography>
                                    Duration: {new Date(campaign.startDate).toLocaleDateString()} - {new Date(campaign.endDate).toLocaleDateString()}
                                </Typography>
                                <Box mt={2}>
                                    <Typography variant="subtitle2">Performance</Typography>
                                    <Typography>
                                        Impressions: {campaign.performance.impressions.toLocaleString()}
                                    </Typography>
                                    <Typography>
                                        Leads: {campaign.performance.leads}
                                    </Typography>
                                    <Typography>
                                        Conversions: {campaign.performance.conversions}
                                    </Typography>
                                    <Typography>
                                        ROI: {campaign.performance.roi}x
                                    </Typography>
                                </Box>
                            </CardContent>
                            <CardActions>
                                <IconButton
                                    title="Toggle Campaign Status"
                                    onClick={() => onToggleCampaignStatus(
                                        campaign.id,
                                        CampaignProcessor.getNextStatus(campaign.status)
                                    )}
                                >
                                    {campaign.status === CampaignStatus.ACTIVE ? <PauseIcon /> : <PlayIcon />}
                                </IconButton>
                                <IconButton
                                    title="Edit Campaign"
                                    onClick={() => handleOpenDialog(campaign)}
                                >
                                    <EditIcon />
                                </IconButton>
                                <IconButton
                                    title="Duplicate Campaign"
                                    onClick={() => onDuplicateCampaign(campaign.id)}
                                >
                                    <DuplicateIcon />
                                </IconButton>
                                <IconButton
                                    title="Delete Campaign"
                                    onClick={() => handleDeleteClick(campaign)}
                                >
                                    <DeleteIcon />
                                </IconButton>
                            </CardActions>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            <Dialog open={isDialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
                <DialogTitle>
                    {selectedCampaign ? 'Edit Campaign' : 'Create New Campaign'}
                </DialogTitle>
                <DialogContent>
                    <Box mt={2}>
                        <TextField
                            fullWidth
                            margin="normal"
                            label="Campaign Name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            error={!!formErrors.name}
                            helperText={formErrors.name}
                        />

                        <FormControl fullWidth margin="normal">
                            <InputLabel>Campaign Type</InputLabel>
                            <Select
                                value={formData.type}
                                label="Campaign Type"
                                onChange={(e) => setFormData({ ...formData, type: e.target.value as CampaignType })}
                            >
                                {Object.values(CampaignType).map((type) => (
                                    <MenuItem key={type} value={type}>{type}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <TextField
                            fullWidth
                            margin="normal"
                            label="Start Date"
                            type="date"
                            value={formData.startDate}
                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                            error={!!formErrors.startDate}
                            helperText={formErrors.startDate}
                            InputLabelProps={{ shrink: true }}
                        />

                        <TextField
                            fullWidth
                            margin="normal"
                            label="End Date"
                            type="date"
                            value={formData.endDate}
                            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                            error={!!formErrors.endDate}
                            helperText={formErrors.endDate}
                            InputLabelProps={{ shrink: true }}
                        />

                        <TextField
                            fullWidth
                            margin="normal"
                            label="Budget"
                            type="number"
                            value={formData.budget}
                            onChange={(e) => setFormData({ ...formData, budget: Number(e.target.value) })}
                            error={!!formErrors.budget}
                            helperText={formErrors.budget}
                            InputProps={{ startAdornment: '$' }}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleSubmit} variant="contained" color="primary">
                        {selectedCampaign ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={isDeleteDialogOpen} onClose={() => setIsDeleteDialogOpen(false)}>
                <DialogTitle>Delete Campaign</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete this campaign? This action cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleConfirmDelete} color="error">
                        Confirm
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default Campaigns; 