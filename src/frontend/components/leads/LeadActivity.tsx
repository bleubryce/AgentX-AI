import React from 'react';
import {
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Typography,
  Box
} from '@mui/material';
import {
  Event as EventIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Chat as ChatIcon,
  Assignment as AssignmentIcon,
  Person as PersonIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { LeadActivity as LeadActivityType } from '../../types/lead';

interface LeadActivityProps {
  activities: LeadActivityType[];
}

const LeadActivity = ({ activities }: LeadActivityProps) => {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'CALL':
        return <PhoneIcon />;
      case 'EMAIL':
        return <EmailIcon />;
      case 'MEETING':
        return <EventIcon />;
      case 'NOTE':
        return <ChatIcon />;
      case 'STATUS_CHANGE':
        return <AssignmentIcon />;
      case 'ASSIGNED':
        return <PersonIcon />;
      default:
        return <HistoryIcon />;
    }
  };

  const formatActivityType = (type: string): string => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  if (!activities || activities.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography color="text.secondary">No activities recorded</Typography>
      </Box>
    );
  }

  return (
    <List>
      {activities.map((activity, index) => (
        <React.Fragment key={activity.id || index}>
          <ListItem alignItems="flex-start">
            <ListItemIcon>
              {getActivityIcon(activity.type)}
            </ListItemIcon>
            <ListItemText
              primary={
                <Typography variant="subtitle1">
                  {activity.title || formatActivityType(activity.type)}
                </Typography>
              }
              secondary={
                <>
                  <Typography component="span" variant="body2" color="text.primary">
                    {format(new Date(activity.createdAt), 'MMM d, yyyy h:mm a')}
                  </Typography>
                  {activity.description && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {activity.description}
                    </Typography>
                  )}
                  {activity.oldValue && activity.newValue && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Changed from: {activity.oldValue} to: {activity.newValue}
                    </Typography>
                  )}
                </>
              }
            />
          </ListItem>
          {index < activities.length - 1 && <Divider variant="inset" component="li" />}
        </React.Fragment>
      ))}
    </List>
  );
};

export default LeadActivity; 