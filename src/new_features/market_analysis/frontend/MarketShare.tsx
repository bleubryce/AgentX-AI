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
  Chip,
  Avatar,
  Tooltip,
} from '@mui/material';
import {
  Share as ShareIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  Public as PublicIcon,
} from '@mui/icons-material';
import { MarketAnalysis } from './types';

interface MarketShareProps {
  analysis: MarketAnalysis;
  onShare: (share: ShareSettings) => void;
  onUpdateShare: (id: string, updates: Partial<ShareSettings>) => void;
  onDeleteShare: (id: string) => void;
}

interface ShareSettings {
  id: string;
  type: 'private' | 'team' | 'public';
  users: string[];
  teams: string[];
  permissions: 'view' | 'edit' | 'admin';
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface Team {
  id: string;
  name: string;
  members: string[];
}

const SHARE_TYPES = [
  { value: 'private', label: 'Private', icon: <PersonIcon /> },
  { value: 'team', label: 'Team', icon: <GroupIcon /> },
  { value: 'public', label: 'Public', icon: <PublicIcon /> },
];

const PERMISSIONS = [
  { value: 'view', label: 'View Only' },
  { value: 'edit', label: 'Can Edit' },
  { value: 'admin', label: 'Full Access' },
];

export const MarketShare: React.FC<MarketShareProps> = ({
  analysis,
  onShare,
  onUpdateShare,
  onDeleteShare,
}) => {
  const [openDialog, setOpenDialog] = React.useState(false);
  const [share, setShare] = React.useState<Omit<ShareSettings, 'id' | 'createdAt' | 'updatedAt'>>({
    type: 'private',
    users: [],
    teams: [],
    permissions: 'view',
  });

  const handleShare = () => {
    const newShare: ShareSettings = {
      ...share,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onShare(newShare);
    setOpenDialog(false);
  };

  const handleUpdateShare = (id: string, updates: Partial<ShareSettings>) => {
    onUpdateShare(id, updates);
  };

  const handleDeleteShare = (id: string) => {
    onDeleteShare(id);
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

  const getShareTypeIcon = (type: ShareSettings['type']) => {
    return SHARE_TYPES.find(t => t.value === type)?.icon || <ShareIcon />;
  };

  const getShareTypeLabel = (type: ShareSettings['type']) => {
    return SHARE_TYPES.find(t => t.value === type)?.label || type;
  };

  const getPermissionLabel = (permission: ShareSettings['permissions']) => {
    return PERMISSIONS.find(p => p.value === permission)?.label || permission;
  };

  return (
    <Box sx={{ mt: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Sharing Settings
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
        >
          Share Analysis
        </Button>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <ShareIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Current Sharing Settings"
                    secondary="Manage who can access this market analysis"
                  />
                </ListItem>
                <Divider />
                {/* Example shared items - replace with actual data */}
                <ListItem
                  secondaryAction={
                    <Box>
                      <Tooltip title="Edit sharing settings">
                        <IconButton
                          edge="end"
                          onClick={() => handleUpdateShare('1', { permissions: 'edit' })}
                          sx={{ mr: 1 }}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Remove access">
                        <IconButton
                          edge="end"
                          onClick={() => handleDeleteShare('1')}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  }
                >
                  <ListItemIcon>
                    {getShareTypeIcon('team')}
                  </ListItemIcon>
                  <ListItemText
                    primary="Marketing Team"
                    secondary={
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          {getPermissionLabel('edit')} • Shared on {formatDate(new Date().toISOString())}
                        </Typography>
                        <Box sx={{ mt: 1 }}>
                          <Chip
                            size="small"
                            label="5 members"
                            avatar={<Avatar sx={{ width: 20, height: 20 }}>5</Avatar>}
                            sx={{ mr: 1 }}
                          />
                          <Chip
                            size="small"
                            label="Expires in 30 days"
                            color="warning"
                          />
                        </Box>
                      </Box>
                    }
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Share Market Analysis</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Share Type</InputLabel>
              <Select
                value={share.type}
                label="Share Type"
                onChange={(e) => setShare({ ...share, type: e.target.value as ShareSettings['type'] })}
              >
                {SHARE_TYPES.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {type.icon}
                      <Typography sx={{ ml: 1 }}>{type.label}</Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Permissions</InputLabel>
              <Select
                value={share.permissions}
                label="Permissions"
                onChange={(e) => setShare({ ...share, permissions: e.target.value as ShareSettings['permissions'] })}
              >
                {PERMISSIONS.map((permission) => (
                  <MenuItem key={permission.value} value={permission.value}>
                    {permission.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Expiration Date (Optional)"
              type="date"
              value={share.expiresAt || ''}
              onChange={(e) => setShare({ ...share, expiresAt: e.target.value })}
              InputLabelProps={{ shrink: true }}
              sx={{ mb: 2 }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={share.type === 'public'}
                  onChange={(e) => setShare({ ...share, type: e.target.checked ? 'public' : 'private' })}
                />
              }
              label="Make Public"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleShare}
            startIcon={<ShareIcon />}
          >
            Share
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}; 