import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert
} from '@mui/material';
import api from '../../services/api';

interface AddLeadActivityProps {
  leadId: string;
  open: boolean;
  onClose: () => void;
  onActivityAdded: () => void;
}

const activityTypes = [
  { value: 'CALL', label: 'Call' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'MEETING', label: 'Meeting' },
  { value: 'NOTE', label: 'Note' }
];

const AddLeadActivity = ({ leadId, open, onClose, onActivityAdded }: AddLeadActivityProps) => {
  const [formData, setFormData] = useState({
    type: 'NOTE',
    title: '',
    description: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    if (!name) return;
    
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  const validateForm = () => {
    if (!formData.title.trim()) {
      setError('Title is required');
      return false;
    }
    return true;
  };
  
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      await api.post(`/v1/leads/${leadId}/activities`, formData);
      
      // Reset form and close dialog
      setFormData({
        type: 'NOTE',
        title: '',
        description: ''
      });
      
      onActivityAdded();
      onClose();
    } catch (err: any) {
      console.error('Error adding activity:', err);
      setError(err.response?.data?.message || 'Failed to add activity. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleClose = () => {
    // Reset form when closing
    setFormData({
      type: 'NOTE',
      title: '',
      description: ''
    });
    setError(null);
    onClose();
  };
  
  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Activity</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Box sx={{ mt: 1 }}>
          <FormControl fullWidth margin="normal">
            <InputLabel>Activity Type</InputLabel>
            <Select
              name="type"
              value={formData.type}
              onChange={handleChange}
              label="Activity Type"
            >
              {activityTypes.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <TextField
            margin="normal"
            required
            fullWidth
            label="Title"
            name="title"
            value={formData.title}
            onChange={handleChange}
          />
          
          <TextField
            margin="normal"
            fullWidth
            label="Description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            multiline
            rows={4}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : 'Add Activity'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddLeadActivity; 