import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Button, 
  Chip, 
  Divider, 
  Tab, 
  Tabs, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemIcon,
  CircularProgress,
  IconButton,
  Tooltip,
  Card,
  CardContent
} from '@mui/material';
import { 
  Edit as EditIcon,
  Delete as DeleteIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Event as EventIcon,
  Assignment as AssignmentIcon,
  Chat as ChatIcon,
  History as HistoryIcon,
  Person as PersonIcon,
  Home as HomeIcon,
  AttachMoney as MoneyIcon,
  ArrowBack as ArrowBackIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useSnackbar } from 'notistack';
import { Lead, LeadActivity, LeadInteraction } from '../../types/lead';
import api from '../../services/api';
import LeadStatusChip from './LeadStatusChip';
import LeadPriorityChip from './LeadPriorityChip';
import LeadActivity from './LeadActivity';
import AddLeadActivity from './AddLeadActivity';

interface TabPanelProps {
  children: React.ReactNode;
  value: number;
  index: number;
}

const TabPanel = (props: TabPanelProps) => {
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
};

const LeadDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [lead, setLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [interactions, setInteractions] = useState<LeadInteraction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [addActivityOpen, setAddActivityOpen] = useState(false);
  
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    if (id) {
      fetchLead();
      fetchActivities();
      fetchInteractions();
    }
  }, [id]);

  const fetchLead = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/v1/leads/${id}`);
      setLead(response.data);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching lead:', err);
      setError('Failed to load lead data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchActivities = async () => {
    try {
      const response = await api.get(`/v1/leads/${id}/activities`);
      setActivities(response.data);
    } catch (err: any) {
      console.error('Error fetching activities:', err);
      // We don't set the main error here as the lead might still load correctly
    }
  };

  const fetchInteractions = async () => {
    try {
      const response = await api.get(`/v1/leads/${id}/interactions`);
      setInteractions(response.data);
    } catch (err: any) {
      console.error('Error fetching interactions:', err);
      enqueueSnackbar('Failed to load lead interactions', { variant: 'error' });
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleEdit = () => {
    navigate(`/leads/${id}/edit`);
  };

  const handleDelete = async () => {
    if (!id) return;
    
    if (window.confirm('Are you sure you want to delete this lead?')) {
      try {
        await api.delete(`/v1/leads/${id}`);
        enqueueSnackbar('Lead deleted successfully', { variant: 'success' });
        navigate('/leads');
      } catch (err: any) {
        console.error('Error deleting lead:', err);
        enqueueSnackbar('Failed to delete lead', { variant: 'error' });
      }
    }
  };

  const handleBack = () => {
    navigate('/leads');
  };

  const handleAddActivity = () => {
    setAddActivityOpen(true);
  };

  const handleActivityAdded = () => {
    if (id) {
      fetchActivities();
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !lead) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error" variant="h6">
          {error || 'Lead not found'}
        </Typography>
        <Button 
          startIcon={<ArrowBackIcon />} 
          onClick={handleBack}
          sx={{ mt: 2 }}
        >
          Back to Leads
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton onClick={handleBack} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4">
            {`${lead.firstName} ${lead.lastName}`}
          </Typography>
        </Box>
        <Box>
          <Button 
            variant="outlined" 
            startIcon={<EditIcon />} 
            onClick={handleEdit}
            sx={{ mr: 1 }}
          >
            Edit
          </Button>
          <Button 
            variant="outlined" 
            color="error" 
            startIcon={<DeleteIcon />} 
            onClick={handleDelete}
          >
            Delete
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Lead Information
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Status
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  <LeadStatusChip status={lead.status} />
                </Box>
              </Grid>
              
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Priority
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  <LeadPriorityChip priority={lead.priority} />
                </Box>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Email
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                  <EmailIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                  <Typography>{lead.email}</Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Phone
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                  <PhoneIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                  <Typography>{lead.phone}</Typography>
                </Box>
              </Grid>
              
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Created
                </Typography>
                <Typography>
                  {format(new Date(lead.createdAt), 'MMM d, yyyy')}
                </Typography>
              </Grid>
              
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Source
                </Typography>
                <Chip 
                  label={lead.source.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')} 
                  size="small" 
                  variant="outlined" 
                />
              </Grid>
              
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Last Contact
                </Typography>
                <Typography>
                  {lead.lastContact 
                    ? format(new Date(lead.lastContact), 'MMM d, yyyy') 
                    : 'Never'}
                </Typography>
              </Grid>
              
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Next Follow-up
                </Typography>
                <Typography>
                  {lead.nextFollowUp 
                    ? format(new Date(lead.nextFollowUp), 'MMM d, yyyy') 
                    : 'Not scheduled'}
                </Typography>
              </Grid>
              
              {lead.tags && lead.tags.length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Tags
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {lead.tags.map((tag) => (
                      <Chip key={tag} label={tag} size="small" />
                    ))}
                  </Box>
                </Grid>
              )}
            </Grid>
          </Paper>
          
          {lead.location && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Location
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
                <LocationIcon sx={{ mr: 1, mt: 0.5, color: 'text.secondary' }} />
                <Typography>
                  {lead.location.address}<br />
                  {lead.location.city}, {lead.location.state} {lead.location.zipCode}<br />
                  {lead.location.country}
                </Typography>
              </Box>
            </Paper>
          )}
          
          {lead.budget && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Budget
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <MoneyIcon sx={{ mr: 1, color: 'text.secondary' }} />
                <Typography>
                  {lead.budget.min.toLocaleString()} - {lead.budget.max.toLocaleString()} {lead.budget.currency}
                </Typography>
              </Box>
            </Paper>
          )}
          
          {lead.propertyType && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Property Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <HomeIcon sx={{ mr: 1, color: 'text.secondary' }} />
                <Typography>
                  {lead.propertyType.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </Typography>
              </Box>
            </Paper>
          )}
        </Grid>
        
        <Grid item xs={12} md={8}>
          <Paper sx={{ mb: 3 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={tabValue} onChange={handleTabChange} aria-label="lead tabs">
                <Tab label="Details" id="lead-tab-0" aria-controls="lead-tabpanel-0" />
                <Tab label="Activities" id="lead-tab-1" aria-controls="lead-tabpanel-1" />
                <Tab label="Notes" id="lead-tab-2" aria-controls="lead-tabpanel-2" />
              </Tabs>
            </Box>
            
            <TabPanel value={tabValue} index={0}>
              {lead.notes ? (
                <Box>
                  <Typography variant="h6" gutterBottom>Notes</Typography>
                  <Typography sx={{ whiteSpace: 'pre-wrap' }}>{lead.notes}</Typography>
                </Box>
              ) : (
                <Typography color="text.secondary">No additional details available.</Typography>
              )}
            </TabPanel>
            
            <TabPanel value={tabValue} index={1}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Activities</Typography>
                <Button 
                  variant="contained" 
                  startIcon={<AddIcon />} 
                  onClick={handleAddActivity}
                >
                  Add Activity
                </Button>
              </Box>
              <LeadActivity activities={activities} />
            </TabPanel>
            
            <TabPanel value={tabValue} index={2}>
              <Typography variant="h6" gutterBottom>Notes</Typography>
              {lead.notes ? (
                <Typography sx={{ whiteSpace: 'pre-wrap' }}>{lead.notes}</Typography>
              ) : (
                <Typography color="text.secondary">No notes available.</Typography>
              )}
            </TabPanel>
          </Paper>
        </Grid>
      </Grid>
      
      <AddLeadActivity 
        leadId={id || ''}
        open={addActivityOpen}
        onClose={() => setAddActivityOpen(false)}
        onActivityAdded={handleActivityAdded}
      />
    </Box>
  );
};

export default LeadDetail; 