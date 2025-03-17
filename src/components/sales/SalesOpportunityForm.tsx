import React from 'react';
import {
    Box,
    Button,
    Chip,
    FormControl,
    FormHelperText,
    Grid,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    TextField,
    Typography
} from '@mui/material';
import { useFormik } from 'formik';
import * as yup from 'yup';
import { SalesOpportunity } from '../../services/agent/processors/sales.processor';

interface SalesOpportunityFormProps {
    initialData?: SalesOpportunity | null;
    onSubmit: (data: SalesOpportunity) => void;
    onCancel: () => void;
}

const validationSchema = yup.object({
    companyName: yup.string().required('Company name is required'),
    contactName: yup.string().required('Contact name is required'),
    contactEmail: yup.string().email('Invalid email address'),
    contactPhone: yup.string(),
    productInterest: yup.array().of(yup.string()).min(1, 'At least one product is required'),
    stage: yup.string().required('Stage is required'),
    priority: yup.string().required('Priority is required'),
    budget: yup.number().positive('Budget must be positive').nullable(),
});

const stages = [
    'PROSPECTING',
    'QUALIFICATION',
    'PROPOSAL',
    'NEGOTIATION',
    'CLOSED_WON',
    'CLOSED_LOST'
] as const;

const priorities = ['HIGH', 'MEDIUM', 'LOW'] as const;

const products = [
    'AI Platform',
    'Data Analytics',
    'Machine Learning',
    'Cloud Services',
    'Consulting',
    'Training'
] as const;

const SalesOpportunityForm: React.FC<SalesOpportunityFormProps> = ({
    initialData,
    onSubmit,
    onCancel
}) => {
    const formik = useFormik({
        initialValues: {
            companyName: initialData?.companyName || '',
            contactName: initialData?.contactName || '',
            contactEmail: initialData?.contactEmail || '',
            contactPhone: initialData?.contactPhone || '',
            productInterest: initialData?.productInterest || [],
            stage: initialData?.stage || 'PROSPECTING',
            priority: initialData?.priority || 'MEDIUM',
            budget: initialData?.budget || null,
        },
        validationSchema,
        onSubmit: (values) => {
            onSubmit({
                ...values,
                id: initialData?.id
            });
        },
    });

    return (
        <Box component="form" onSubmit={formik.handleSubmit} sx={{ mt: 2 }}>
            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>
                        Company Information
                    </Typography>
                </Grid>

                <Grid item xs={12}>
                    <TextField
                        fullWidth
                        id="companyName"
                        name="companyName"
                        label="Company Name"
                        value={formik.values.companyName}
                        onChange={formik.handleChange}
                        error={formik.touched.companyName && Boolean(formik.errors.companyName)}
                        helperText={formik.touched.companyName && formik.errors.companyName}
                    />
                </Grid>

                <Grid item xs={12} md={6}>
                    <TextField
                        fullWidth
                        id="contactName"
                        name="contactName"
                        label="Contact Name"
                        value={formik.values.contactName}
                        onChange={formik.handleChange}
                        error={formik.touched.contactName && Boolean(formik.errors.contactName)}
                        helperText={formik.touched.contactName && formik.errors.contactName}
                    />
                </Grid>

                <Grid item xs={12} md={6}>
                    <TextField
                        fullWidth
                        id="contactEmail"
                        name="contactEmail"
                        label="Contact Email"
                        value={formik.values.contactEmail}
                        onChange={formik.handleChange}
                        error={formik.touched.contactEmail && Boolean(formik.errors.contactEmail)}
                        helperText={formik.touched.contactEmail && formik.errors.contactEmail}
                    />
                </Grid>

                <Grid item xs={12} md={6}>
                    <TextField
                        fullWidth
                        id="contactPhone"
                        name="contactPhone"
                        label="Contact Phone"
                        value={formik.values.contactPhone}
                        onChange={formik.handleChange}
                        error={formik.touched.contactPhone && Boolean(formik.errors.contactPhone)}
                        helperText={formik.touched.contactPhone && formik.errors.contactPhone}
                    />
                </Grid>

                <Grid item xs={12} md={6}>
                    <TextField
                        fullWidth
                        id="budget"
                        name="budget"
                        label="Budget"
                        type="number"
                        value={formik.values.budget || ''}
                        onChange={formik.handleChange}
                        error={formik.touched.budget && Boolean(formik.errors.budget)}
                        helperText={formik.touched.budget && formik.errors.budget}
                        InputProps={{
                            startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>
                        }}
                    />
                </Grid>

                <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>
                        Opportunity Details
                    </Typography>
                </Grid>

                <Grid item xs={12}>
                    <FormControl
                        fullWidth
                        error={formik.touched.productInterest && Boolean(formik.errors.productInterest)}
                    >
                        <InputLabel id="productInterest-label">Products of Interest</InputLabel>
                        <Select
                            labelId="productInterest-label"
                            id="productInterest"
                            name="productInterest"
                            multiple
                            value={formik.values.productInterest}
                            onChange={formik.handleChange}
                            renderValue={(selected) => (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {selected.map((value) => (
                                        <Chip key={value} label={value} size="small" />
                                    ))}
                                </Box>
                            )}
                        >
                            {products.map((product) => (
                                <MenuItem key={product} value={product}>
                                    {product}
                                </MenuItem>
                            ))}
                        </Select>
                        {formik.touched.productInterest && formik.errors.productInterest && (
                            <FormHelperText>{formik.errors.productInterest}</FormHelperText>
                        )}
                    </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                    <FormControl
                        fullWidth
                        error={formik.touched.stage && Boolean(formik.errors.stage)}
                    >
                        <InputLabel id="stage-label">Stage</InputLabel>
                        <Select
                            labelId="stage-label"
                            id="stage"
                            name="stage"
                            value={formik.values.stage}
                            onChange={formik.handleChange}
                        >
                            {stages.map((stage) => (
                                <MenuItem key={stage} value={stage}>
                                    {stage.replace('_', ' ')}
                                </MenuItem>
                            ))}
                        </Select>
                        {formik.touched.stage && formik.errors.stage && (
                            <FormHelperText>{formik.errors.stage}</FormHelperText>
                        )}
                    </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                    <FormControl
                        fullWidth
                        error={formik.touched.priority && Boolean(formik.errors.priority)}
                    >
                        <InputLabel id="priority-label">Priority</InputLabel>
                        <Select
                            labelId="priority-label"
                            id="priority"
                            name="priority"
                            value={formik.values.priority}
                            onChange={formik.handleChange}
                        >
                            {priorities.map((priority) => (
                                <MenuItem key={priority} value={priority}>
                                    {priority}
                                </MenuItem>
                            ))}
                        </Select>
                        {formik.touched.priority && formik.errors.priority && (
                            <FormHelperText>{formik.errors.priority}</FormHelperText>
                        )}
                    </FormControl>
                </Grid>

                <Grid item xs={12}>
                    <Stack direction="row" spacing={2} justifyContent="flex-end">
                        <Button
                            variant="outlined"
                            onClick={onCancel}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="contained"
                            type="submit"
                            disabled={!formik.isValid || !formik.dirty}
                        >
                            {initialData ? 'Update' : 'Create'} Opportunity
                        </Button>
                    </Stack>
                </Grid>
            </Grid>
        </Box>
    );
};

export default SalesOpportunityForm; 