import React, { useState, ChangeEvent } from 'react';
import {
    Box,
    IconButton,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    Tooltip,
    Typography,
    Collapse,
    Chip,
    CircularProgress,
    Alert,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    SelectChangeEvent,
} from '@mui/material';
import {
    Edit as EditIcon,
    Delete as DeleteIcon,
    KeyboardArrowDown,
    KeyboardArrowUp,
} from '@mui/icons-material';
import { useLeads } from '../../hooks/useLeads';
import { Lead, LeadStatus, LeadSource } from '../../types/lead';
import { format } from 'date-fns';

interface ExpandableRowProps {
    lead: Lead;
    onEdit: (lead: Lead) => void;
    onDelete: (id: string) => void;
}

const ExpandableRow = ({ lead, onEdit, onDelete }: ExpandableRowProps): JSX.Element => {
    const [open, setOpen] = useState(false);
    const createdDate = lead.createdAt ? new Date(lead.createdAt) : new Date();
    const updatedDate = lead.updatedAt ? new Date(lead.updatedAt) : new Date();

    return (
        <>
            <TableRow sx={{ '& > *': { borderBottom: 'unset' } }}>
                <TableCell>
                    <IconButton
                        aria-label="expand row"
                        size="small"
                        onClick={() => setOpen(!open)}
                    >
                        {open ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                    </IconButton>
                </TableCell>
                <TableCell>{lead.firstName} {lead.lastName}</TableCell>
                <TableCell>{lead.email}</TableCell>
                <TableCell>
                    <Chip
                        label={lead.status}
                        color={
                            lead.status === LeadStatus.CONVERTED
                                ? 'success'
                                : lead.status === LeadStatus.LOST
                                ? 'error'
                                : 'default'
                        }
                    />
                </TableCell>
                <TableCell>{lead.source}</TableCell>
                <TableCell>{format(createdDate, 'MMM d, yyyy')}</TableCell>
                <TableCell>
                    <IconButton onClick={() => onEdit(lead)} size="small">
                        <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => onDelete(lead.id)} size="small" color="error">
                        <DeleteIcon />
                    </IconButton>
                </TableCell>
            </TableRow>
            <TableRow>
                <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{ margin: 1 }}>
                            <Typography variant="h6" gutterBottom component="div">
                                Details
                            </Typography>
                            <Table size="small">
                                <TableBody>
                                    <TableRow>
                                        <TableCell component="th" scope="row">Phone</TableCell>
                                        <TableCell>{lead.phone || 'N/A'}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell component="th" scope="row">Notes</TableCell>
                                        <TableCell>{lead.notes || 'No notes'}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell component="th" scope="row">Last Updated</TableCell>
                                        <TableCell>
                                            {format(updatedDate, 'MMM d, yyyy HH:mm')}
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </>
    );
};

interface LeadListProps {
    onEdit: (lead: Lead) => void;
}

export const LeadList = ({ onEdit }: LeadListProps): JSX.Element => {
    const [page, setPage] = useState<number>(0);
    const [rowsPerPage, setRowsPerPage] = useState<number>(10);
    const [statusFilter, setStatusFilter] = useState<LeadStatus | ''>('');
    const [sourceFilter, setSourceFilter] = useState<LeadSource | ''>('');
    const [searchTerm, setSearchTerm] = useState<string>('');

    const { leads, isLoading, error, deleteLead, refetch } = useLeads({
        initialFilters: {
            status: statusFilter || undefined,
            source: sourceFilter || undefined,
            limit: rowsPerPage,
            skip: page * rowsPerPage,
        },
    });

    const filteredLeads = leads.filter((lead) => {
        const searchLower = searchTerm.toLowerCase();
        return (
            searchTerm === '' ||
            lead.firstName.toLowerCase().includes(searchLower) ||
            lead.lastName.toLowerCase().includes(searchLower) ||
            lead.email.toLowerCase().includes(searchLower)
        );
    });

    const handleChangePage = (_event: unknown, newPage: number): void => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: ChangeEvent<HTMLInputElement>): void => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleStatusChange = (event: SelectChangeEvent): void => {
        setStatusFilter(event.target.value as LeadStatus | '');
    };

    const handleSourceChange = (event: SelectChangeEvent): void => {
        setSourceFilter(event.target.value as LeadSource | '');
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this lead?')) {
            try {
                await deleteLead(id);
                await refetch();
            } catch (error) {
                console.error('Failed to delete lead:', error);
            }
        }
    };

    if (isLoading) {
        return (
            <Box display="flex" justifyContent="center" p={3}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Alert severity="error" sx={{ m: 2 }}>
                {error.message}
            </Alert>
        );
    }

    return (
        <Box sx={{ width: '100%' }}>
            <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
                <TextField
                    label="Search"
                    variant="outlined"
                    size="small"
                    value={searchTerm}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                    sx={{ flexGrow: 1 }}
                />
                <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Status</InputLabel>
                    <Select
                        value={statusFilter}
                        label="Status"
                        onChange={handleStatusChange}
                    >
                        <MenuItem value="">All</MenuItem>
                        {Object.values(LeadStatus).map((status) => (
                            <MenuItem key={status} value={status}>
                                {status}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Source</InputLabel>
                    <Select
                        value={sourceFilter}
                        label="Source"
                        onChange={handleSourceChange}
                    >
                        <MenuItem value="">All</MenuItem>
                        {Object.values(LeadSource).map((source) => (
                            <MenuItem key={source} value={source}>
                                {source}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Box>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell />
                            <TableCell>Name</TableCell>
                            <TableCell>Email</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Source</TableCell>
                            <TableCell>Created</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredLeads
                            .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                            .map((lead) => (
                                <ExpandableRow
                                    key={lead.id}
                                    lead={lead}
                                    onEdit={onEdit}
                                    onDelete={handleDelete}
                                />
                            ))}
                    </TableBody>
                </Table>
                <TablePagination
                    rowsPerPageOptions={[5, 10, 25]}
                    component="div"
                    count={filteredLeads.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                />
            </TableContainer>
        </Box>
    );
};

export default LeadList; 