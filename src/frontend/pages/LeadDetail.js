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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Alert
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationOnIcon,
  AttachMoney as AttachMoneyIcon,
  Home as HomeIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useSnackbar } from 'notistack';
import api from '../services/api';
import LeadStatusChip from '../components/leads/LeadStatusChip';
import LeadPriorityChip from '../components/leads/LeadPriorityChip';
import LeadActivity from '../components/leads/LeadActivity';
import AddLeadActivity from '../components/leads/AddLeadActivity';

function TabPanel(props) {
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

const LeadDetail = () => {
  const [lead, setLead] = useState(null);
  const [activities, setActivities] = useState([]);
  const [interactions, setInteractions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [addActivityOpen, setAddActivityOpen] = useState(false);
  
  const { id } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  
  useEffect(() => {
    fetchLeadDetails();
  }, [id]);
  
  const fetchLeadDetails = async () => {
    try {
      setLoading(true);
      
      const [leadResponse, activitiesResponse] = await Promise.all([
        api.get(`/v1/leads/${id}`),
        api.get(`/v1/leads/${id}/activities`)
      ]);
      
      setLead(leadResponse.data);
      setActivities(activitiesResponse.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching lead details:', err);
      setError('Failed to load lead details. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  const handleEditLead = () => {
    navigate(`/leads/${id}/edit`);
  };
  
  const handleDeleteDialogOpen = () => {
    setDeleteDialogOpen(true);
  };
  
  const handleDeleteDialogClose = () => {
    setDeleteDialogOpen(false);
  };
  
  const handleDeleteLead = async () => {
    try {
      setDeleteLoading(true);
      
      await api.delete(`/v1/leads/${id}`);
      
      enqueueSnackbar('Lead deleted successfully', { variant: 'success' });
      navigate('/leads');
    } catch (err) {
      console.error('Error deleting lead:', err);
      enqueueSnackbar('Failed to delete lead', { variant: 'error' });
      setDeleteDialogOpen(false);
    } finally {
      setDeleteLoading(false);
    }
  };
  
  const handleBackToLeads = () => {
    navigate('/leads');
  };
  
  const handleAddActivity = () => {
    setAddActivityOpen(true);
  };
  
  const handleActivityAdded = () => {
    fetchLeadDetails();
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          {error}
        </Alert>
        <Button 
          variant="contained" 
          onClick={fetchLeadDetails}
          sx={{ mt: 2 }}
        >
          Retry
        </Button>
      </Box>
    );
  }
  
  if (!lead) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Lead not found or you don't have permission to view it.
        </Alert>
        <Button 
          variant="contained" 
          onClick={handleBackToLeads}
          sx={{ mt: 2 }}
        >
          Back to Leads
        </Button>
      </Box>
    );
  }
  
  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton onClick={handleBackToLeads} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4">
            {lead.firstName} {lead.lastName}
          </Typography>
        </Box>
        <Box>
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={handleEditLead}
            sx={{ mr: 1 }}
          >
            Edit
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleDeleteDialogOpen}
          >
            Delete
          </Button>
        </Box>
      </Box>
      
      {/* Lead Info */}
      <Paper sx={{ mb: 3 }}>
        <Grid container spacing={2} sx={{ p: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle2" color="text.secondary">
              Status
            </Typography>
            <Box sx={{ mt: 1 }}>
              <LeadStatusChip status={lead.status} />
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle2" color="text.secondary">
              Priority
            </Typography>
            <Box sx={{ mt: 1 }}>
              <LeadPriorityChip priority={lead.priority} />
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle2" color="text.secondary">
              Source
            </Typography>
            <Typography variant="body1">
              {lead.source.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle2" color="text.secondary">
              Property Type
            </Typography>
            <Typography variant="body1">
              {lead.propertyType.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
            </Typography>
          </Grid>
          
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
              <ListItemIcon sx={{ minWidth: 40 }}>
                <PhoneIcon color="primary" />
              </ListItemIcon>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Phone
                </Typography>
                <Typography variant="body1">
                  {lead.phone || 'Not provided'}
                </Typography>
              </Box>
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
              <ListItemIcon sx={{ minWidth: 40 }}>
                <EmailIcon color="primary" />
              </ListItemIcon>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Email
                </Typography>
                <Typography variant="body1">
                  {lead.email || 'Not provided'}
                </Typography>
              </Box>
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
              <ListItemIcon sx={{ minWidth: 40 }}>
                <LocationOnIcon color="primary" />
              </ListItemIcon>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Location
                </Typography>
                <Typography variant="body1">
                  {lead.location && (lead.location.address || lead.location.city || lead.location.state) ? (
                    <>
                      {lead.location.address && `${lead.location.address}, `}
                      {lead.location.city && `${lead.location.city}, `}
                      {lead.location.state && `${lead.location.state} `}
                      {lead.location.zipCode && lead.location.zipCode}
                    </>
                  ) : (
                    'Not provided'
                  )}
                </Typography>
              </Box>
            </Box>
          </Grid>
          
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle2" color="text.secondary">
              Created Date
            </Typography>
            <Typography variant="body1">
              {format(new Date(lead.createdAt), 'MMM d, yyyy')}
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle2" color="text.secondary">
              Last Contact
            </Typography>
            <Typography variant="body1">
              {lead.lastContactDate ? format(new Date(lead.lastContactDate), 'MMM d, yyyy') : 'Never'}
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle2" color="text.secondary">
              Next Follow-up
            </Typography>
            <Typography variant="body1">
              {lead.nextFollowUpDate ? format(new Date(lead.nextFollowUpDate), 'MMM d, yyyy') : 'Not scheduled'}
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
              <ListItemIcon sx={{ minWidth: 40 }}>
                <AttachMoneyIcon color="primary" />
              </ListItemIcon>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Budget
                </Typography>
                <Typography variant="body1">
                  {lead.budget && (lead.budget.min || lead.budget.max) ? (
                    <>
                      {lead.budget.min ? `$${lead.budget.min.toLocaleString()}` : '$0'}
                      {' - '}
                      {lead.budget.max ? `$${lead.budget.max.toLocaleString()}` : 'No max'}
                    </>
                  ) : (
                    'Not specified'
                  )}
                </Typography>
              </Box>
            </Box>
          </Grid>
          
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
          </Grid>
          
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Tags
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {lead.tags && lead.tags.length > 0 ? (
                lead.tags.map((tag) => (
                  <Chip key={tag} label={tag} size="small" />
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No tags
                </Typography>
              )}
            </Box>
          </Grid>
          
          {lead.notes && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Notes
              </Typography>
              <Typography variant="body2">
                {lead.notes}
              </Typography>
            </Grid>
          )}
        </Grid>
      </Paper>
      
      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="lead tabs">
            <Tab label="Activities" id="lead-tab-0" aria-controls="lead-tabpanel-0" />
            <Tab label="Interactions" id="lead-tab-1" aria-controls="lead-tabpanel-1" />
            <Tab label="Documents" id="lead-tab-2" aria-controls="lead-tabpanel-2" />
          </Tabs>
        </Box>
        
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Lead Activities</Typography>
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
        
        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>
            Interactions
          </Typography>
          {interactions && interactions.length > 0 ? (
            <List>
              {interactions.map((interaction) => (
                <ListItem key={interaction.id}>
                  <ListItemText
                    primary={interaction.type}
                    secondary={interaction.description}
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography color="text.secondary">
              No interactions recorded
            </Typography>
          )}
        </TabPanel>
        
        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>
            Documents
          </Typography>
          <Typography color="text.secondary">
            No documents available
          </Typography>
        </TabPanel>
      </Paper>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteDialogClose}
      >
        <DialogTitle>Delete Lead</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this lead? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteDialogClose}>Cancel</Button>
          <Button 
            onClick={handleDeleteLead} 
            color="error" 
            disabled={deleteLoading}
          >
            {deleteLoading ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Add Activity Dialog */}
      <AddLeadActivity
        leadId={id}
        open={addActivityOpen}
        onClose={() => setAddActivityOpen(false)}
        onActivityAdded={handleActivityAdded}
      />
    </Box>
  );
};

export default LeadDetail; 