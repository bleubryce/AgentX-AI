import React from 'react';
import { render, screen, fireEvent, waitFor } from '../utils/test-utils';
import userEvent from '@testing-library/user-event';
import { LeadForm } from '../../components/LeadForm';
import { LeadStatus, LeadSource } from '../../types/lead';

describe('LeadForm', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders empty form correctly', () => {
    render(
      <LeadForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // Check if all form fields are present
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/company/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/source/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/status/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
  });

  it('renders form with initial values', () => {
    const initialValues = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '1234567890',
      company: 'Test Company',
      source: LeadSource.WEBSITE,
      status: LeadStatus.NEW,
      notes: 'Test notes'
    };

    render(
      <LeadForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        initialValues={initialValues}
      />
    );

    // Check if form fields have initial values
    expect(screen.getByLabelText(/first name/i)).toHaveValue(initialValues.firstName);
    expect(screen.getByLabelText(/last name/i)).toHaveValue(initialValues.lastName);
    expect(screen.getByLabelText(/email/i)).toHaveValue(initialValues.email);
    expect(screen.getByLabelText(/phone/i)).toHaveValue(initialValues.phone);
    expect(screen.getByLabelText(/company/i)).toHaveValue(initialValues.company);
    expect(screen.getByLabelText(/source/i)).toHaveValue(initialValues.source);
    expect(screen.getByLabelText(/status/i)).toHaveValue(initialValues.status);
    expect(screen.getByLabelText(/notes/i)).toHaveValue(initialValues.notes);
  });

  it('validates required fields', async () => {
    render(
      <LeadForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // Try to submit empty form
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    // Check for error messages
    await waitFor(() => {
      expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/last name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('validates email format', async () => {
    render(
      <LeadForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // Enter invalid email
    await userEvent.type(screen.getByLabelText(/email/i), 'invalid-email');
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    // Check for error message
    await waitFor(() => {
      expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('submits form with valid data', async () => {
    render(
      <LeadForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // Fill out form
    await userEvent.type(screen.getByLabelText(/first name/i), 'John');
    await userEvent.type(screen.getByLabelText(/last name/i), 'Doe');
    await userEvent.type(screen.getByLabelText(/email/i), 'john.doe@example.com');
    await userEvent.type(screen.getByLabelText(/phone/i), '1234567890');
    await userEvent.type(screen.getByLabelText(/company/i), 'Test Company');
    await userEvent.selectOptions(screen.getByLabelText(/source/i), LeadSource.WEBSITE);
    await userEvent.selectOptions(screen.getByLabelText(/status/i), LeadStatus.NEW);
    await userEvent.type(screen.getByLabelText(/notes/i), 'Test notes');

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    // Check if onSubmit was called with correct data
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '1234567890',
        company: 'Test Company',
        source: LeadSource.WEBSITE,
        status: LeadStatus.NEW,
        notes: 'Test notes'
      });
    });
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(
      <LeadForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(mockOnCancel).toHaveBeenCalled();
  });
}); 