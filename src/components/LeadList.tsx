import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Collapse,
  Box,
  Typography,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
} from '@mui/icons-material';
import { Lead, LeadStatus } from '../types/lead';

interface LeadListProps {
  leads: Lead[];
  onEdit: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
  onStatusChange: (lead: Lead, newStatus: LeadStatus) => void;
}

interface ExpandableRowProps {
  lead: Lead;
  onEdit: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
  onStatusChange: (lead: Lead, newStatus: LeadStatus) => void;
}

const ExpandableRow: React.FC<ExpandableRowProps> = ({
  lead,
  onEdit,
  onDelete,
  onStatusChange,
}) => {
  const [open, setOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleStatusChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    onStatusChange(lead, event.target.value as LeadStatus);
  };

  const handleDelete = () => {
    setDeleteDialogOpen(false);
    onDelete(lead);
  };

  return (
    <>
      <TableRow>
        <TableCell>
          <IconButton
            aria-label="expand row"
            size="small"
            onClick={() => setOpen(!open)}
          >
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell>
          {lead.firstName} {lead.lastName}
        </TableCell>
        <TableCell>{lead.email}</TableCell>
        <TableCell>
          <Chip label={lead.source} color="primary" variant="outlined" />
        </TableCell>
        <TableCell>
          <FormControl size="small">
            <InputLabel id={`status-label-${lead.id}`}>Status</InputLabel>
            <Select
              labelId={`status-label-${lead.id}`}
              value={lead.status}
              onChange={handleStatusChange}
              label="Status"
            >
              {Object.values(LeadStatus).map((status) => (
                <MenuItem key={status} value={status}>
                  {status}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </TableCell>
        <TableCell>
          <IconButton
            aria-label="edit"
            size="small"
            onClick={() => onEdit(lead)}
          >
            <EditIcon />
          </IconButton>
          <IconButton
            aria-label="delete"
            size="small"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <DeleteIcon />
          </IconButton>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 1 }}>
              <Typography variant="h6" gutterBottom component="div">
                Details
              </Typography>
              <Table size="small">
                <TableBody>
                  {lead.phone && (
                    <TableRow>
                      <TableCell component="th" scope="row">
                        Phone
                      </TableCell>
                      <TableCell>{lead.phone}</TableCell>
                    </TableRow>
                  )}
                  {lead.company && (
                    <TableRow>
                      <TableCell component="th" scope="row">
                        Company
                      </TableCell>
                      <TableCell>{lead.company}</TableCell>
                    </TableRow>
                  )}
                  {lead.notes && (
                    <TableRow>
                      <TableCell component="th" scope="row">
                        Notes
                      </TableCell>
                      <TableCell>{lead.notes}</TableCell>
                    </TableRow>
                  )}
                  <TableRow>
                    <TableCell component="th" scope="row">
                      Created
                    </TableCell>
                    <TableCell>
                      {new Date(lead.createdAt!).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell component="th" scope="row">
                      Updated
                    </TableCell>
                    <TableCell>
                      {new Date(lead.updatedAt!).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        aria-labelledby="delete-dialog-title"
      >
        <DialogTitle id="delete-dialog-title">Confirm Delete</DialogTitle>
        <DialogContent>
          Are you sure you want to delete this lead? This action cannot be undone.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export const LeadList: React.FC<LeadListProps> = ({
  leads,
  onEdit,
  onDelete,
  onStatusChange,
}) => {
  if (leads.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          No leads found
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell />
            <TableCell>Name</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Source</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {leads.map((lead) => (
            <ExpandableRow
              key={lead.id}
              lead={lead}
              onEdit={onEdit}
              onDelete={onDelete}
              onStatusChange={onStatusChange}
            />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}; 