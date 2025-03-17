import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  CircularProgress,
  Alert,
  Divider,
  Chip
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const LeadForm = ({ lead, onSubmit, isLoading, error }) => {
  const initialFormState = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    status: 'NEW',
    priority: 3,
    source: 'WEBSITE',
    notes: '',
    tags: [],
    location: {
      address: '',
      city: '',
      state: '',
      zipCode: ''
    },
    budget: {
      min: '',
      max: ''
    },
    propertyType: 'SINGLE_FAMILY'
  };

  const [formData, setFormData] = useState(initialFormState);
  const [tagInput, setTagInput] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  
  const navigate = useNavigate();
  
  useEffect(() => {
    if (lead) {
      // Format the lead data to match the form structure
      const formattedLead = {
        ...lead,
        location: lead.location || initialFormState.location,
        budget: lead.budget || initialFormState.budget
      };
      setFormData(formattedLead);
    }
  }, [lead]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData({
        ...formData,
        [parent]: {
          ...formData[parent],
          [child]: value
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
    
    // Clear validation error when field is updated
    if (validationErrors[name]) {
      setValidationErrors({
        ...validationErrors,
        [name]: null
      });
    }
  };
  
  const handleTagInputChange = (e) => {
    setTagInput(e.target.value);
  };
  
  const handleTagInputKeyDown = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      
      // Don't add duplicate tags
      if (!formData.tags.includes(tagInput.trim())) {
        setFormData({
          ...formData,
          tags: [...formData.tags, tagInput.trim()]
        });
      }
      
      setTagInput('');
    }
  };
  
  const handleDeleteTag = (tagToDelete) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToDelete)
    });
  };
  
  const validateForm = () => {
    const errors = {};
    
    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required';
    }
    
    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    }
    
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email is invalid';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit(formData);
    }
  };
  
  const handleCancel = () => {
    navigate('/leads');
  };
  
  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ p: 3 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Lead Information
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              required
              fullWidth
              label="First Name"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              error={!!validationErrors.firstName}
              helperText={validationErrors.firstName}
              margin="normal"
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
              error={!!validationErrors.lastName}
              helperText={validationErrors.lastName}
              margin="normal"
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              error={!!validationErrors.email}
              helperText={validationErrors.email}
              margin="normal"
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              margin="normal"
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth margin="normal">
              <InputLabel>Status</InputLabel>
              <Select
                name="status"
                value={formData.status}
                onChange={handleChange}
                label="Status"
              >
                <MenuItem value="NEW">New</MenuItem>
                <MenuItem value="CONTACTED">Contacted</MenuItem>
                <MenuItem value="QUALIFIED">Qualified</MenuItem>
                <MenuItem value="PROPOSAL">Proposal</MenuItem>
                <MenuItem value="NEGOTIATION">Negotiation</MenuItem>
                <MenuItem value="WON">Won</MenuItem>
                <MenuItem value="LOST">Lost</MenuItem>
                <MenuItem value="INACTIVE">Inactive</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth margin="normal">
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
            <FormControl fullWidth margin="normal">
              <InputLabel>Source</InputLabel>
              <Select
                name="source"
                value={formData.source}
                onChange={handleChange}
                label="Source"
              >
                <MenuItem value="WEBSITE">Website</MenuItem>
                <MenuItem value="REFERRAL">Referral</MenuItem>
                <MenuItem value="SOCIAL_MEDIA">Social Media</MenuItem>
                <MenuItem value="EMAIL_CAMPAIGN">Email Campaign</MenuItem>
                <MenuItem value="PHONE_INQUIRY">Phone Inquiry</MenuItem>
                <MenuItem value="PARTNER">Partner</MenuItem>
                <MenuItem value="OTHER">Other</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth margin="normal">
              <InputLabel>Property Type</InputLabel>
              <Select
                name="propertyType"
                value={formData.propertyType}
                onChange={handleChange}
                label="Property Type"
              >
                <MenuItem value="SINGLE_FAMILY">Single Family</MenuItem>
                <MenuItem value="MULTI_FAMILY">Multi Family</MenuItem>
                <MenuItem value="CONDO">Condo</MenuItem>
                <MenuItem value="TOWNHOUSE">Townhouse</MenuItem>
                <MenuItem value="LAND">Land</MenuItem>
                <MenuItem value="COMMERCIAL">Commercial</MenuItem>
                <MenuItem value="OTHER">Other</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              multiline
              rows={4}
              margin="normal"
            />
          </Grid>
        </Grid>
      </Paper>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Location
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Address"
              name="location.address"
              value={formData.location.address}
              onChange={handleChange}
              margin="normal"
            />
          </Grid>
          
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="City"
              name="location.city"
              value={formData.location.city}
              onChange={handleChange}
              margin="normal"
            />
          </Grid>
          
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="State"
              name="location.state"
              value={formData.location.state}
              onChange={handleChange}
              margin="normal"
            />
          </Grid>
          
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Zip Code"
              name="location.zipCode"
              value={formData.location.zipCode}
              onChange={handleChange}
              margin="normal"
            />
          </Grid>
        </Grid>
      </Paper>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Budget
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Minimum ($)"
              name="budget.min"
              type="number"
              value={formData.budget.min}
              onChange={handleChange}
              margin="normal"
              InputProps={{ inputProps: { min: 0 } }}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Maximum ($)"
              name="budget.max"
              type="number"
              value={formData.budget.max}
              onChange={handleChange}
              margin="normal"
              InputProps={{ inputProps: { min: 0 } }}
            />
          </Grid>
        </Grid>
      </Paper>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Tags
        </Typography>
        
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          {formData.tags.map((tag) => (
            <Chip
              key={tag}
              label={tag}
              onDelete={() => handleDeleteTag(tag)}
              color="primary"
              variant="outlined"
            />
          ))}
        </Box>
        
        <TextField
          fullWidth
          label="Add Tags (Press Enter to add)"
          value={tagInput}
          onChange={handleTagInputChange}
          onKeyDown={handleTagInputKeyDown}
          margin="normal"
        />
      </Paper>
      
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button
          variant="outlined"
          onClick={handleCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={isLoading}
        >
          {isLoading ? <CircularProgress size={24} /> : lead ? 'Update Lead' : 'Create Lead'}
        </Button>
      </Box>
    </Box>
  );
};

export default LeadForm; 