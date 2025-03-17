import React from 'react';
import { Chip } from '@mui/material';

interface LeadPriorityChipProps {
  priority: number;
}

type ChipColor = 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
type ChipVariant = 'filled' | 'outlined';

const LeadPriorityChip = ({ priority }: LeadPriorityChipProps) => {
  const getPriorityColor = (priority: number): ChipColor => {
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

  const getPriorityLabel = (priority: number): string => {
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