import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import LeadForm from '../components/leads/LeadForm';
import api from '../services/api';

const AddLead = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  
  const handleSubmit = async (formData) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.post('/v1/leads', formData);
      
      enqueueSnackbar('Lead created successfully', { variant: 'success' });
      navigate(`/leads/${response.data.id}`);
    } catch (err) {
      console.error('Error creating lead:', err);
      setError(err.response?.data?.message || 'Failed to create lead. Please try again.');
      enqueueSnackbar('Failed to create lead', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Box>
      <Typography variant="h4" sx={{ p: 3, pb: 0 }}>
        Add New Lead
      </Typography>
      
      <LeadForm
        onSubmit={handleSubmit}
        isLoading={loading}
        error={error}
      />
    </Box>
  );
};

export default AddLead; 