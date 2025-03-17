import React from 'react';
import { Chip } from '@mui/material';

const LeadPriorityChip = ({ priority }) => {
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 1:
        return 'default';
      case 2:
        return 'info';
      case 3:
        return 'success';
      case 4:
        return 'warning';
      case 5:
        return 'error';
      default:
        return 'default';
    }
  };

  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 1:
        return 'Low';
      case 2:
        return 'Medium';
      case 3:
        return 'High';
      case 4:
        return 'Very High';
      case 5:
        return 'Urgent';
      default:
        return 'Unknown';
    }
  };

  return (
    <Chip
      label={getPriorityLabel(priority)}
      color={getPriorityColor(priority)}
      size="small"
      variant={priority >= 4 ? 'filled' : 'outlined'}
    />
  );
};

export default LeadPriorityChip; 