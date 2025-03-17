import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Stack,
  FormHelperText,
} from '@mui/material';
import { LeadFormData, LeadSource, LeadStatus } from '../types/lead';

interface LeadFormProps {
  onSubmit: (data: LeadFormData) => void;
  onCancel: () => void;
  initialValues?: Partial<LeadFormData>;
}

export const LeadForm: React.FC<LeadFormProps> = ({
  onSubmit,
  onCancel,
  initialValues,
}) => {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LeadFormData>({
    defaultValues: {
      firstName: initialValues?.firstName || '',
      lastName: initialValues?.lastName || '',
      email: initialValues?.email || '',
      phone: initialValues?.phone || '',
      company: initialValues?.company || '',
      source: initialValues?.source || LeadSource.WEBSITE,
      status: initialValues?.status || LeadStatus.NEW,
      notes: initialValues?.notes || '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Stack spacing={3}>
        <Controller
          name="firstName"
          control={control}
          rules={{ required: 'First name is required' }}
          render={({ field }) => (
            <TextField
              {...field}
              label="First Name"
              error={!!errors.firstName}
              helperText={errors.firstName?.message}
              fullWidth
            />
          )}
        />

        <Controller
          name="lastName"
          control={control}
          rules={{ required: 'Last name is required' }}
          render={({ field }) => (
            <TextField
              {...field}
              label="Last Name"
              error={!!errors.lastName}
              helperText={errors.lastName?.message}
              fullWidth
            />
          )}
        />

        <Controller
          name="email"
          control={control}
          rules={{
            required: 'Email is required',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Invalid email format',
            },
          }}
          render={({ field }) => (
            <TextField
              {...field}
              label="Email"
              error={!!errors.email}
              helperText={errors.email?.message}
              fullWidth
            />
          )}
        />

        <Controller
          name="phone"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Phone"
              error={!!errors.phone}
              helperText={errors.phone?.message}
              fullWidth
            />
          )}
        />

        <Controller
          name="company"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Company"
              error={!!errors.company}
              helperText={errors.company?.message}
              fullWidth
            />
          )}
        />

        <Controller
          name="source"
          control={control}
          render={({ field }) => (
            <FormControl fullWidth>
              <InputLabel id="source-label">Source</InputLabel>
              <Select
                {...field}
                labelId="source-label"
                label="Source"
                error={!!errors.source}
              >
                {Object.values(LeadSource).map((source) => (
                  <MenuItem key={source} value={source}>
                    {source}
                  </MenuItem>
                ))}
              </Select>
              {errors.source && (
                <FormHelperText error>{errors.source.message}</FormHelperText>
              )}
            </FormControl>
          )}
        />

        <Controller
          name="status"
          control={control}
          render={({ field }) => (
            <FormControl fullWidth>
              <InputLabel id="status-label">Status</InputLabel>
              <Select
                {...field}
                labelId="status-label"
                label="Status"
                error={!!errors.status}
              >
                {Object.values(LeadStatus).map((status) => (
                  <MenuItem key={status} value={status}>
                    {status}
                  </MenuItem>
                ))}
              </Select>
              {errors.status && (
                <FormHelperText error>{errors.status.message}</FormHelperText>
              )}
            </FormControl>
          )}
        />

        <Controller
          name="notes"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Notes"
              multiline
              rows={4}
              error={!!errors.notes}
              helperText={errors.notes?.message}
              fullWidth
            />
          )}
        />

        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button onClick={onCancel} variant="outlined">
            Cancel
          </Button>
          <Button type="submit" variant="contained" color="primary">
            Submit
          </Button>
        </Stack>
      </Stack>
    </form>
  );
}; 