import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Button,
  TextField,
  InputAdornment,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import api from '../../services/api';
import LeadStatusChip from './LeadStatusChip';
import LeadPriorityChip from './LeadPriorityChip';
import { LeadStatus } from '../../types/lead';

const LeadList = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  
  // Filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Sorting
  const [orderBy, setOrderBy] = useState('createdAt');
  const [order, setOrder] = useState('desc');
  
  const navigate = useNavigate();
  
  useEffect(() => {
    fetchLeads();
  }, [page, rowsPerPage, statusFilter, orderBy, order]);
  
  const fetchLeads = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        page: (page + 1).toString(),
        limit: rowsPerPage.toString(),
        sortBy: orderBy,
        sortOrder: order,
      });
      
      if (statusFilter) {
        params.append('status', statusFilter);
      }
      
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      
      const response = await api.get(`/v1/leads?${params.toString()}`);
      
      setLeads(response.data.leads);
      setTotalCount(response.data.totalCount);
      setError(null);
    } catch (err) {
      console.error('Error fetching leads:', err);
      setError('Failed to load leads. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSearch = () => {
    setPage(0);
    fetchLeads();
  };
  
  const handleClearSearch = () => {
    setSearchTerm('');
    setPage(0);
    fetchLeads();
  };
  
  const handleChangePage = (_event, newPage) => {
    setPage(newPage);
  };
  
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  const handleStatusFilterChange = (event) => {
    setStatusFilter(event.target.value);
    setPage(0);
  };
  
  const handleSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };
  
  const handleAddLead = () => {
    navigate('/leads/new');
  };
  
  const handleRowClick = (id) => {
    navigate(`/leads/${id}`);
  };
  
  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Leads</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddLead}
        >
          Add Lead
        </Button>
      </Box>
      
      <Paper sx={{ mb: 3, p: 2 }}>
        <Grid container spacing={2} alignItems="flex-end">
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              label="Search Leads"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={handleClearSearch}>
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                onChange={handleStatusFilterChange}
                label="Status"
              >
                <MenuItem value="">All Statuses</MenuItem>
                {Object.values(LeadStatus).map((status) => (
                  <MenuItem key={status} value={status}>
                    {status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <Button
              fullWidth
              variant="outlined"
              onClick={handleSearch}
            >
              Search
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <TableContainer component={Paper}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        cursor: 'pointer' 
                      }}
                      onClick={() => handleSort('firstName')}
                    >
                      Name
                      {orderBy === 'firstName' && (
                        order === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        cursor: 'pointer' 
                      }}
                      onClick={() => handleSort('status')}
                    >
                      Status
                      {orderBy === 'status' && (
                        order === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        cursor: 'pointer' 
                      }}
                      onClick={() => handleSort('priority')}
                    >
                      Priority
                      {orderBy === 'priority' && (
                        order === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        cursor: 'pointer' 
                      }}
                      onClick={() => handleSort('createdAt')}
                    >
                      Created
                      {orderBy === 'createdAt' && (
                        order === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {leads.length > 0 ? (
                  leads.map((lead) => (
                    <TableRow 
                      key={lead.id} 
                      hover 
                      onClick={() => handleRowClick(lead.id)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>{`${lead.firstName} ${lead.lastName}`}</TableCell>
                      <TableCell>
                        <LeadStatusChip status={lead.status} />
                      </TableCell>
                      <TableCell>
                        <LeadPriorityChip priority={lead.priority} />
                      </TableCell>
                      <TableCell>{lead.email}</TableCell>
                      <TableCell>{lead.phone}</TableCell>
                      <TableCell>{format(new Date(lead.createdAt), 'MMM d, yyyy')}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      No leads found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50]}
              component="div"
              count={totalCount}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </>
        )}
      </TableContainer>
    </Box>
  );
};

export default LeadList; 