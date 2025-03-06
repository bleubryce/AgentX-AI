import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  FormControlLabel,
  Switch,
  Select,
  MenuItem,
  InputLabel,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { MarketAnalysis } from './types';

interface MarketAlert {
  id: string;
  type: 'price_change' | 'market_health' | 'inventory_level' | 'days_on_market';
  condition: 'above' | 'below' | 'equals' | 'changes_by';
  value: number;
  location: string;
  propertyType: string;
  isActive: boolean;
  createdAt: string;
  lastTriggered?: string;
}

interface MarketAlertsProps {
  alerts: MarketAlert[];
  onAddAlert: (alert: Omit<MarketAlert, 'id' | 'createdAt'>) => void;
  onDeleteAlert: (id: string) => void;
  onToggleAlert: (id: string) => void;
  locations: string[];
}

const ALERT_TYPES = [
  { value: 'price_change', label: 'Price Change' },
  { value: 'market_health', label: 'Market Health' },
  { value: 'inventory_level', label: 'Inventory Level' },
  { value: 'days_on_market', label: 'Days on Market' },
];

const CONDITIONS = [
  { value: 'above', label: 'Above' },
  { value: 'below', label: 'Below' },
  { value: 'equals', label: 'Equals' },
  { value: 'changes_by', label: 'Changes By' },
];

export const MarketAlerts: React.FC<MarketAlertsProps> = ({
  alerts,
  onAddAlert,
  onDeleteAlert,
  onToggleAlert,
  locations,
}) => {
  const [openDialog, setOpenDialog] = React.useState(false);
  const [newAlert, setNewAlert] = React.useState<Omit<MarketAlert, 'id' | 'createdAt'>>({
    type: 'price_change',
    condition: 'changes_by',
    value: 0,
    location: '',
    propertyType: 'SINGLE_FAMILY',
    isActive: true,
  });

  const handleAddAlert = () => {
    onAddAlert(newAlert);
    setOpenDialog(false);
    setNewAlert({
      type: 'price_change',
      condition: 'changes_by',
      value: 0,
      location: '',
      propertyType: 'SINGLE_FAMILY',
      isActive: true,
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getAlertIcon = (type: MarketAlert['type']) => {
    switch (type) {
      case 'price_change':
        return <TrendingUpIcon />;
      case 'market_health':
        return <WarningIcon />;
      case 'inventory_level':
        return <InfoIcon />;
      case 'days_on_market':
        return <InfoIcon />;
      default:
        return <NotificationsIcon />;
    }
  };

  const formatAlertDescription = (alert: MarketAlert) => {
    const type = ALERT_TYPES.find(t => t.value === alert.type)?.label || alert.type;
    const condition = CONDITIONS.find(c => c.value === alert.condition)?.label || alert.condition;
    
    switch (alert.type) {
      case 'price_change':
        return `${type} ${condition} ${alert.value}% in ${alert.location}`;
      case 'market_health':
        return `${type} ${condition} ${alert.value} in ${alert.location}`;
      case 'inventory_level':
        return `${type} ${condition} ${alert.value} properties in ${alert.location}`;
      case 'days_on_market':
        return `${type} ${condition} ${alert.value} days in ${alert.location}`;
      default:
        return `${type} alert for ${alert.location}`;
    }
  };

  return (
    <Box sx={{ mt: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Market Alerts
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
        >
          Add Alert
        </Button>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <List>
                {alerts.length === 0 ? (
                  <ListItem>
                    <ListItemText
                      primary="No alerts configured"
                      secondary="Click 'Add Alert' to create a new market alert"
                    />
                  </ListItem>
                ) : (
                  alerts.map((alert) => (
                    <ListItem
                      key={alert.id}
                      secondaryAction={
                        <Box>
                          <IconButton
                            edge="end"
                            onClick={() => onToggleAlert(alert.id)}
                            sx={{ mr: 1 }}
                          >
                            <Chip
                              label={alert.isActive ? 'Active' : 'Inactive'}
                              color={alert.isActive ? 'success' : 'default'}
                              size="small"
                            />
                          </IconButton>
                          <IconButton
                            edge="end"
                            onClick={() => onDeleteAlert(alert.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      }
                    >
                      <ListItemIcon>
                        {getAlertIcon(alert.type)}
                      </ListItemIcon>
                      <ListItemText
                        primary={formatAlertDescription(alert)}
                        secondary={`Created: ${formatDate(alert.createdAt)}${
                          alert.lastTriggered ? ` • Last triggered: ${formatDate(alert.lastTriggered)}` : ''
                        }`}
                      />
                    </ListItem>
                  ))
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Alert</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Alert Type</InputLabel>
              <Select
                value={newAlert.type}
                label="Alert Type"
                onChange={(e) => setNewAlert({ ...newAlert, type: e.target.value as MarketAlert['type'] })}
              >
                {ALERT_TYPES.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Location</InputLabel>
              <Select
                value={newAlert.location}
                label="Location"
                onChange={(e) => setNewAlert({ ...newAlert, location: e.target.value })}
              >
                {locations.map((location) => (
                  <MenuItem key={location} value={location}>
                    {location}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Condition</InputLabel>
              <Select
                value={newAlert.condition}
                label="Condition"
                onChange={(e) => setNewAlert({ ...newAlert, condition: e.target.value as MarketAlert['condition'] })}
              >
                {CONDITIONS.map((condition) => (
                  <MenuItem key={condition.value} value={condition.value}>
                    {condition.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Value"
              type="number"
              value={newAlert.value}
              onChange={(e) => setNewAlert({ ...newAlert, value: Number(e.target.value) })}
              sx={{ mb: 2 }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={newAlert.isActive}
                  onChange={(e) => setNewAlert({ ...newAlert, isActive: e.target.checked })}
                />
              }
              label="Active"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAddAlert}
            disabled={!newAlert.location}
          >
            Create Alert
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}; 