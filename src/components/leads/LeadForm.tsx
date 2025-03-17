import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
    Box,
    Button,
    Grid,
    MenuItem,
    TextField,
    Typography
} from '@mui/material';
import { Lead } from '../../services/agent/processors/lead.processor';

interface LeadFormProps {
    initialData?: Lead | null;
    onSubmit: (data: Omit<Lead, 'id' | 'createdAt'>) => Promise<void>;
    onCancel: () => void;
}

const leadSourceOptions = [
    'Website',
    'Referral',
    'Social Media',
    'Direct Mail',
    'Phone',
    'Email Campaign',
    'Other'
];

const leadStatusOptions = [
    'New',
    'Contacted',
    'Qualified',
    'Proposal',
    'Negotiation',
    'Closed Won',
    'Closed Lost'
];

const LeadForm: React.FC<LeadFormProps> = ({ initialData, onSubmit, onCancel }) => {
    const { control, handleSubmit, formState: { errors } } = useForm({
        defaultValues: {
            firstName: initialData?.firstName || '',
            lastName: initialData?.lastName || '',
            email: initialData?.email || '',
            phone: initialData?.phone || '',
            company: initialData?.company || '',
            source: initialData?.source || 'Website',
            status: initialData?.status || 'New',
            notes: initialData?.notes || ''
        }
    });

    const onFormSubmit = handleSubmit(async (data) => {
        await onSubmit(data);
    });

    return (
        <Box component="form" onSubmit={onFormSubmit} noValidate sx={{ mt: 2 }}>
            <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                    <Controller
                        name="firstName"
                        control={control}
                        rules={{ required: 'First name is required' }}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                fullWidth
                                label="First Name"
                                error={!!errors.firstName}
                                helperText={errors.firstName?.message}
                            />
                        )}
                    />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <Controller
                        name="lastName"
                        control={control}
                        rules={{ required: 'Last name is required' }}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                fullWidth
                                label="Last Name"
                                error={!!errors.lastName}
                                helperText={errors.lastName?.message}
                            />
                        )}
                    />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <Controller
                        name="email"
                        control={control}
                        rules={{
                            required: 'Email is required',
                            pattern: {
                                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                message: 'Invalid email address'
                            }
                        }}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                fullWidth
                                label="Email"
                                error={!!errors.email}
                                helperText={errors.email?.message}
                            />
                        )}
                    />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <Controller
                        name="phone"
                        control={control}
                        rules={{
                            pattern: {
                                value: /^[0-9-+() ]*$/,
                                message: 'Invalid phone number'
                            }
                        }}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                fullWidth
                                label="Phone"
                                error={!!errors.phone}
                                helperText={errors.phone?.message}
                            />
                        )}
                    />
                </Grid>
                <Grid item xs={12}>
                    <Controller
                        name="company"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                fullWidth
                                label="Company"
                            />
                        )}
                    />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <Controller
                        name="source"
                        control={control}
                        rules={{ required: 'Source is required' }}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                select
                                fullWidth
                                label="Lead Source"
                                error={!!errors.source}
                                helperText={errors.source?.message}
                            >
                                {leadSourceOptions.map((option) => (
                                    <MenuItem key={option} value={option}>
                                        {option}
                                    </MenuItem>
                                ))}
                            </TextField>
                        )}
                    />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <Controller
                        name="status"
                        control={control}
                        rules={{ required: 'Status is required' }}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                select
                                fullWidth
                                label="Lead Status"
                                error={!!errors.status}
                                helperText={errors.status?.message}
                            >
                                {leadStatusOptions.map((option) => (
                                    <MenuItem key={option} value={option}>
                                        {option}
                                    </MenuItem>
                                ))}
                            </TextField>
                        )}
                    />
                </Grid>
                <Grid item xs={12}>
                    <Controller
                        name="notes"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                fullWidth
                                multiline
                                rows={4}
                                label="Notes"
                            />
                        )}
                    />
                </Grid>
            </Grid>
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button onClick={onCancel}>
                    Cancel
                </Button>
                <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                >
                    {initialData ? 'Update Lead' : 'Create Lead'}
                </Button>
            </Box>
        </Box>
    );
};

export default LeadForm; 