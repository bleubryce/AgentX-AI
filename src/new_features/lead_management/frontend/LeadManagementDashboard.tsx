import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  IconButton,
  Tooltip,
  Pagination,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Meeting as MeetingIcon,
} from '@mui/icons-material';
import { Lead, LeadStatus, LeadType, LeadSource } from './types';

interface LeadManagementDashboardProps {
  initialPage?: number;
  pageSize?: number;
}

export const LeadManagementDashboard: React.FC<LeadManagementDashboardProps> = ({
  initialPage = 1,
  pageSize = 20,
}) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(initialPage);
  const [totalCount, setTotalCount] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [formData, setFormData] = useState<Partial<Lead>>({});

  const fetchLeads = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/v2/leads?page=${page}&page_size=${pageSize}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch leads');
      }

      const data = await response.json();
      setLeads(data.leads);
      setTotalCount(data.total_count);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [page, pageSize]);

  const handleOpenDialog = (lead?: Lead) => {
    if (lead) {
      setSelectedLead(lead);
      setFormData(lead);
    } else {
      setSelectedLead(null);
      setFormData({});
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedLead(null);
    setFormData({});
  };

  const handleSubmit = async () => {
    try {
      const url = selectedLead
        ? `/api/v2/leads/${selectedLead.id}`
        : '/api/v2/leads';
      const method = selectedLead ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to save lead');
      }

      handleCloseDialog();
      fetchLeads();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleDelete = async (leadId: string) => {
    if (!window.confirm('Are you sure you want to delete this lead?')) {
      return;
    }

    try {
      const response = await fetch(`/api/v2/leads/${leadId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete lead');
      }

      fetchLeads();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const getStatusColor = (status: LeadStatus) => {
    switch (status) {
      case LeadStatus.NEW:
        return 'primary';
      case LeadStatus.CONTACTED:
        return 'info';
      case LeadStatus.QUALIFIED:
        return 'success';
      case LeadStatus.NEGOTIATING:
        return 'warning';
      case LeadStatus.CLOSED:
        return 'success';
      case LeadStatus.LOST:
        return 'error';
      default:
        return 'default';
    }
  };

  const renderLeadForm = () => (
    <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
      <DialogTitle>
        {selectedLead ? 'Edit Lead' : 'Create New Lead'}
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="First Name"
              value={formData.contact?.first_name || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  contact: {
                    ...formData.contact,
                    first_name: e.target.value,
                  },
                })
              }
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Last Name"
              value={formData.contact?.last_name || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  contact: {
                    ...formData.contact,
                    last_name: e.target.value,
                  },
                })
              }
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.contact?.email || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  contact: {
                    ...formData.contact,
                    email: e.target.value,
                  },
                })
              }
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Phone"
              value={formData.contact?.phone || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  contact: {
                    ...formData.contact,
                    phone: e.target.value,
                  },
                })
              }
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Lead Type</InputLabel>
              <Select
                value={formData.lead_type || ''}
                label="Lead Type"
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    lead_type: e.target.value as LeadType,
                  })
                }
              >
                {Object.values(LeadType).map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Source</InputLabel>
              <Select
                value={formData.source || ''}
                label="Source"
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    source: e.target.value as LeadSource,
                  })
                }
              >
                {Object.values(LeadSource).map((source) => (
                  <MenuItem key={source} value={source}>
                    {source}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Notes"
              value={formData.metadata?.notes || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  metadata: {
                    ...formData.metadata,
                    notes: e.target.value,
                  },
                })
              }
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCloseDialog}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">
          {selectedLead ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Lead Management</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Lead
        </Button>
      </Box>

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Source</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell>
                      {lead.contact.first_name} {lead.contact.last_name}
                    </TableCell>
                    <TableCell>{lead.lead_type}</TableCell>
                    <TableCell>{lead.source}</TableCell>
                    <TableCell>
                      <Chip
                        label={lead.status}
                        color={getStatusColor(lead.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Call">
                          <IconButton size="small">
                            <PhoneIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Email">
                          <IconButton size="small">
                            <EmailIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Schedule Meeting">
                          <IconButton size="small">
                            <MeetingIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDialog(lead)}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            onClick={() => lead.id && handleDelete(lead.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Pagination
              count={Math.ceil(totalCount / pageSize)}
              page={page}
              onChange={(_, value) => setPage(value)}
              color="primary"
            />
          </Box>
        </>
      )}

      {renderLeadForm()}
    </Box>
  );
}; 