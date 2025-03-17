import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import LeadForm from '../components/leads/LeadForm';
import api from '../services/api';

const EditLead = () => {
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  
  const { id } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  
  useEffect(() => {
    fetchLead();
  }, [id]);
  
  const fetchLead = async () => {
    try {
      setLoading(true);
      
      const response = await api.get(`/v1/leads/${id}`);
      setLead(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching lead:', err);
      setError('Failed to load lead details. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmit = async (formData) => {
    try {
      setSubmitting(true);
      setError(null);
      
      await api.put(`/v1/leads/${id}`, formData);
      
      enqueueSnackbar('Lead updated successfully', { variant: 'success' });
      navigate(`/leads/${id}`);
    } catch (err) {
      console.error('Error updating lead:', err);
      setError(err.response?.data?.message || 'Failed to update lead. Please try again.');
      enqueueSnackbar('Failed to update lead', { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (!lead && !loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Lead not found or you don't have permission to view it.
        </Alert>
      </Box>
    );
  }
  
  return (
    <Box>
      <Typography variant="h4" sx={{ p: 3, pb: 0 }}>
        Edit Lead: {lead.firstName} {lead.lastName}
      </Typography>
      
      <LeadForm
        lead={lead}
        onSubmit={handleSubmit}
        isLoading={submitting}
        error={error}
      />
    </Box>
  );
};

export default EditLead; 