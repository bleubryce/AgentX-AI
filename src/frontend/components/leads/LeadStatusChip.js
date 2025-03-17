import React from 'react';
import { Chip } from '@mui/material';

const LeadStatusChip = ({ status }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'NEW':
        return 'info';
      case 'CONTACTED':
        return 'primary';
      case 'QUALIFIED':
        return 'success';
      case 'PROPOSAL':
        return 'secondary';
      case 'NEGOTIATION':
        return 'warning';
      case 'WON':
        return 'success';
      case 'LOST':
        return 'error';
      case 'INACTIVE':
        return 'default';
      default:
        return 'default';
    }
  };

  const formatStatus = (status) => {
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  return (
    <Chip
      label={formatStatus(status)}
      color={getStatusColor(status)}
      size="small"
      variant="outlined"
    />
  );
};

export default LeadStatusChip; 