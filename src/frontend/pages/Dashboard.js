import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Button,
  CircularProgress,
  Divider,
  Alert
} from '@mui/material';
import {
  People as PeopleIcon,
  TrendingUp as TrendingUpIcon,
  AttachMoney as MoneyIcon,
  Assignment as AssignmentIcon,
  Phone as PhoneIcon,
  Email as EmailIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import api from '../services/api';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const navigate = useNavigate();
  
  useEffect(() => {
    fetchDashboardData();
  }, []);
  
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/v1/dashboard/stats');
      setStats(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
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
          onClick={fetchDashboardData}
          sx={{ mt: 2 }}
        >
          Retry
        </Button>
      </Box>
    );
  }
  
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      
      <Grid container spacing={3}>
        {/* Summary Cards */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={2} sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
            <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
              <PeopleIcon />
            </Avatar>
            <Box>
              <Typography variant="h5">{stats?.totalLeads || 0}</Typography>
              <Typography variant="body2" color="text.secondary">Total Leads</Typography>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={2} sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
            <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
              <TrendingUpIcon />
            </Avatar>
            <Box>
              <Typography variant="h5">{stats?.newLeadsToday || 0}</Typography>
              <Typography variant="body2" color="text.secondary">New Today</Typography>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={2} sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
            <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
              <AssignmentIcon />
            </Avatar>
            <Box>
              <Typography variant="h5">{stats?.activeLeads || 0}</Typography>
              <Typography variant="body2" color="text.secondary">Active Leads</Typography>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={2} sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
            <Avatar sx={{ bgcolor: 'info.main', mr: 2 }}>
              <MoneyIcon />
            </Avatar>
            <Box>
              <Typography variant="h5">{stats?.conversionRate || 0}%</Typography>
              <Typography variant="body2" color="text.secondary">Conversion Rate</Typography>
            </Box>
          </Paper>
        </Grid>
        
        {/* Recent Leads */}
        <Grid item xs={12} md={6}>
          <Card>
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">Recent Leads</Typography>
              <Button size="small" onClick={() => navigate('/leads')}>
                View All
              </Button>
            </Box>
            <Divider />
            <List sx={{ p: 0 }}>
              {stats?.recentLeads && stats.recentLeads.length > 0 ? (
                stats.recentLeads.map((lead) => (
                  <React.Fragment key={lead.id}>
                    <ListItem 
                      button 
                      onClick={() => navigate(`/leads/${lead.id}`)}
                    >
                      <ListItemAvatar>
                        <Avatar>{`${lead.firstName.charAt(0)}${lead.lastName.charAt(0)}`}</Avatar>
                      </ListItemAvatar>
                      <ListItemText 
                        primary={`${lead.firstName} ${lead.lastName}`}
                        secondary={
                          <>
                            <Typography component="span" variant="body2" color="text.primary">
                              {lead.status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
                            </Typography>
                            {` — ${format(new Date(lead.createdAt), 'MMM d, yyyy')}`}
                          </>
                        }
                      />
                    </ListItem>
                    <Divider variant="inset" component="li" />
                  </React.Fragment>
                ))
              ) : (
                <ListItem>
                  <ListItemText primary="No recent leads" />
                </ListItem>
              )}
            </List>
          </Card>
        </Grid>
        
        {/* Upcoming Activities */}
        <Grid item xs={12} md={6}>
          <Card>
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">Upcoming Activities</Typography>
              <Button size="small" onClick={() => navigate('/leads')}>
                View All
              </Button>
            </Box>
            <Divider />
            <List sx={{ p: 0 }}>
              {stats?.upcomingActivities && stats.upcomingActivities.length > 0 ? (
                stats.upcomingActivities.map((activity) => (
                  <React.Fragment key={activity.id}>
                    <ListItem 
                      button 
                      onClick={() => navigate(`/leads/${activity.leadId}`)}
                    >
                      <ListItemAvatar>
                        <Avatar>
                          {activity.type === 'CALL' ? <PhoneIcon /> : <EmailIcon />}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText 
                        primary={activity.title}
                        secondary={
                          <>
                            <Typography component="span" variant="body2" color="text.primary">
                              {activity.leadName}
                            </Typography>
                            {` — ${format(new Date(activity.dueDate), 'MMM d, yyyy')}`}
                          </>
                        }
                      />
                    </ListItem>
                    <Divider variant="inset" component="li" />
                  </React.Fragment>
                ))
              ) : (
                <ListItem>
                  <ListItemText primary="No upcoming activities" />
                </ListItem>
              )}
            </List>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard; 