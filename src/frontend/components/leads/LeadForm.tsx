import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  TextField, 
  Button, 
  Grid, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  Select, 
  Chip,
  FormHelperText,
  CircularProgress,
  Divider,
  Alert
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { 
  Lead, 
  LeadCreate, 
  LeadUpdate, 
  LeadStatus, 
  LeadSource, 
  PropertyType, 
  Location, 
  Budget 
} from '../../types/lead';
import api from '../../services/api';

interface LeadFormProps {
  isEdit?: boolean;
}

const LeadForm: React.FC<LeadFormProps> = ({ isEdit = false }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  
  const [formData, setFormData] = useState<LeadCreate>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    status: LeadStatus.NEW,
    priority: 3,
    source: LeadSource.WEBSITE,
    tags: [],
    notes: '',
    location: {
      address: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'USA'
    },
    budget: {
      min: 0,
      max: 0,
      currency: 'USD'
    },
    propertyType: PropertyType.SINGLE_FAMILY,
    preferredContactMethod: 'email'
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  
  useEffect(() => {
    if (isEdit && id) {
      fetchLead(id);
    }
  }, [isEdit, id]);
  
  const fetchLead = async (leadId: string) => {
    try {
      setLoading(true);
      const response = await api.get(`/v1/leads/${leadId}`);
      const lead = response.data;
      
      setFormData({
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        status: lead.status,
        priority: lead.priority,
        source: lead.source,
        tags: lead.tags || [],
        notes: lead.notes || '',
        assignedAgentId: lead.assignedAgentId,
        location: lead.location || {
          address: '',
          city: '',
          state: '',
          zipCode: '',
          country: 'USA'
        },
        budget: lead.budget || {
          min: 0,
          max: 0,
          currency: 'USD'
        },
        propertyType: lead.propertyType || PropertyType.SINGLE_FAMILY,
        preferredContactMethod: lead.preferredContactMethod || 'email',
        nextFollowUp: lead.nextFollowUp
      });
      
      setError(null);
    } catch (err: any) {
      console.error('Error fetching lead:', err);
      setError('Failed to load lead data. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    
    if (!name) return;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData({
        ...formData,
        [parent]: {
          ...formData[parent as keyof LeadCreate],
          [child]: value
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };
  
  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...(formData.tags || []), tagInput.trim()]
      });
      setTagInput('');
    }
  };
  
  const handleDeleteTag = (tagToDelete: string) => {
    setFormData({
      ...formData,
      tags: formData.tags?.filter(tag => tag !== tagToDelete)
    });
  };
  
  const validateForm = () => {
    if (!formData.firstName.trim()) {
      setError('First name is required');
      return false;
    }
    
    if (!formData.lastName.trim()) {
      setError('Last name is required');
      return false;
    }
    
    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }
    
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setError('Email is invalid');
      return false;
    }
    
    if (!formData.phone.trim()) {
      setError('Phone number is required');
      return false;
    }
    
    if (formData.location?.state && formData.location.state.length !== 2) {
      setError('State code should be 2 letters');
      return false;
    }
    
    return true;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      if (isEdit && id) {
        // Update existing lead
        await api.put(`/v1/leads/${id}`, formData);
        enqueueSnackbar('Lead updated successfully', { variant: 'success' });
        navigate(`/leads/${id}`);
      } else {
        // Create new lead
        const response = await api.post('/v1/leads', formData);
        enqueueSnackbar('Lead created successfully', { variant: 'success' });
        navigate(`/leads/${response.data.id}`);
      }
    } catch (err: any) {
      console.error('Error saving lead:', err);
      setError(err.response?.data?.message || 'Failed to save lead. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleCancel = () => {
    if (isEdit && id) {
      navigate(`/leads/${id}`);
    } else {
      navigate('/leads');
    }
  };
  
  if (loading && isEdit) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        {isEdit ? 'Edit Lead' : 'Create Lead'}
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Paper sx={{ p: 3 }}>
        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* Basic Information */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Basic Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                label="First Name"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                label="Last Name"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                label="Phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  label="Status"
                >
                  {Object.values(LeadStatus).map((status) => (
                    <MenuItem key={status} value={status}>
                      {status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  label="Priority"
                >
                  <MenuItem value={1}>Low</MenuItem>
                  <MenuItem value={2}>Medium</MenuItem>
                  <MenuItem value={3}>High</MenuItem>
                  <MenuItem value={4}>Very High</MenuItem>
                  <MenuItem value={5}>Urgent</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Source</InputLabel>
                <Select
                  name="source"
                  value={formData.source}
                  onChange={handleChange}
                  label="Source"
                >
                  {Object.values(LeadSource).map((source) => (
                    <MenuItem key={source} value={source}>
                      {source.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Preferred Contact Method</InputLabel>
                <Select
                  name="preferredContactMethod"
                  value={formData.preferredContactMethod}
                  onChange={handleChange}
                  label="Preferred Contact Method"
                >
                  <MenuItem value="email">Email</MenuItem>
                  <MenuItem value="phone">Phone</MenuItem>
                  <MenuItem value="sms">SMS</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            {/* Property Information */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Property Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Property Type</InputLabel>
                <Select
                  name="propertyType"
                  value={formData.propertyType}
                  onChange={handleChange}
                  label="Property Type"
                >
                  {Object.values(PropertyType).map((type) => (
                    <MenuItem key={type} value={type}>
                      {type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            {/* Location */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Location
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Address"
                name="location.address"
                value={formData.location?.address || ''}
                onChange={handleChange}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="City"
                name="location.city"
                value={formData.location?.city || ''}
                onChange={handleChange}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="State"
                name="location.state"
                value={formData.location?.state || ''}
                onChange={handleChange}
                inputProps={{ maxLength: 2 }}
                helperText="2-letter state code"
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Zip Code"
                name="location.zipCode"
                value={formData.location?.zipCode || ''}
                onChange={handleChange}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Country"
                name="location.country"
                value={formData.location?.country || ''}
                onChange={handleChange}
              />
            </Grid>
            
            {/* Budget */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Budget
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label="Minimum Budget"
                name="budget.min"
                type="number"
                value={formData.budget?.min || 0}
                onChange={handleChange}
                InputProps={{ inputProps: { min: 0 } }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label="Maximum Budget"
                name="budget.max"
                type="number"
                value={formData.budget?.max || 0}
                onChange={handleChange}
                InputProps={{ inputProps: { min: 0 } }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth>
                <InputLabel>Currency</InputLabel>
                <Select
                  name="budget.currency"
                  value={formData.budget?.currency || 'USD'}
                  onChange={handleChange}
                  label="Currency"
                >
                  <MenuItem value="USD">USD</MenuItem>
                  <MenuItem value="EUR">EUR</MenuItem>
                  <MenuItem value="GBP">GBP</MenuItem>
                  <MenuItem value="CAD">CAD</MenuItem>
                  <MenuItem value="AUD">AUD</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            {/* Additional Information */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Additional Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                name="notes"
                multiline
                rows={4}
                value={formData.notes || ''}
                onChange={handleChange}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TextField
                  label="Tags"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  sx={{ mr: 1 }}
                />
                <Button variant="outlined" onClick={handleAddTag}>
                  Add Tag
                </Button>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {formData.tags?.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    onDelete={() => handleDeleteTag(tag)}
                  />
                ))}
              </Box>
            </Grid>
            
            <Grid item xs={12} sx={{ mt: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button variant="outlined" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={24} /> : isEdit ? 'Update Lead' : 'Create Lead'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Box>
  );
};

export default LeadForm; 