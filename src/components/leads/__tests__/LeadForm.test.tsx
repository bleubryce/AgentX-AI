import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LeadForm from '../LeadForm';
import { Lead, LeadSource, LeadStatus } from '../../../services/agent/processors/lead.processor';

const mockLead: Lead = {
    id: '1',
    companyName: 'Test Company',
    contactName: 'John Doe',
    contactEmail: 'john@test.com',
    contactPhone: '123-456-7890',
    source: LeadSource.WEBSITE,
    status: LeadStatus.NEW,
    notes: 'Test notes',
    assignedTo: 'Jane Smith',
    nextFollowUp: '2024-12-31T10:00',
    score: 85,
    createdAt: new Date().toISOString()
};

describe('LeadForm', () => {
    const mockHandlers = {
        onSubmit: jest.fn(),
        onCancel: jest.fn()
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders empty form in create mode', () => {
        render(<LeadForm {...mockHandlers} />);

        expect(screen.getByLabelText(/company name/i)).toHaveValue('');
        expect(screen.getByLabelText(/contact name/i)).toHaveValue('');
        expect(screen.getByLabelText(/email/i)).toHaveValue('');
        expect(screen.getByLabelText(/phone/i)).toHaveValue('');
        expect(screen.getByLabelText(/source/i)).toHaveValue(LeadSource.WEBSITE);
        expect(screen.getByLabelText(/status/i)).toHaveValue(LeadStatus.NEW);
        expect(screen.getByText('Create')).toBeDisabled();
    });

    it('renders form with lead data in edit mode', () => {
        render(<LeadForm lead={mockLead} {...mockHandlers} />);

        expect(screen.getByLabelText(/company name/i)).toHaveValue(mockLead.companyName);
        expect(screen.getByLabelText(/contact name/i)).toHaveValue(mockLead.contactName);
        expect(screen.getByLabelText(/email/i)).toHaveValue(mockLead.contactEmail);
        expect(screen.getByLabelText(/phone/i)).toHaveValue(mockLead.contactPhone);
        expect(screen.getByLabelText(/source/i)).toHaveValue(mockLead.source);
        expect(screen.getByLabelText(/status/i)).toHaveValue(mockLead.status);
        expect(screen.getByText('Update')).toBeDisabled();
    });

    it('validates required fields', async () => {
        render(<LeadForm {...mockHandlers} />);

        const submitButton = screen.getByText('Create');
        const companyNameInput = screen.getByLabelText(/company name/i);
        const contactNameInput = screen.getByLabelText(/contact name/i);
        const emailInput = screen.getByLabelText(/email/i);

        // Try submitting empty form
        fireEvent.click(submitButton);
        
        await waitFor(() => {
            expect(screen.getByText('Company name is required')).toBeInTheDocument();
            expect(screen.getByText('Contact name is required')).toBeInTheDocument();
            expect(screen.getByText('Email is required')).toBeInTheDocument();
        });

        // Fill required fields
        fireEvent.change(companyNameInput, { target: { value: 'Test Company' } });
        fireEvent.change(contactNameInput, { target: { value: 'John Doe' } });
        fireEvent.change(emailInput, { target: { value: 'john@test.com' } });

        await waitFor(() => {
            expect(screen.queryByText('Company name is required')).not.toBeInTheDocument();
            expect(screen.queryByText('Contact name is required')).not.toBeInTheDocument();
            expect(screen.queryByText('Email is required')).not.toBeInTheDocument();
        });
    });

    it('validates email format', async () => {
        render(<LeadForm {...mockHandlers} />);

        const emailInput = screen.getByLabelText(/email/i);

        fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
        fireEvent.blur(emailInput);

        await waitFor(() => {
            expect(screen.getByText('Enter a valid email')).toBeInTheDocument();
        });

        fireEvent.change(emailInput, { target: { value: 'valid@email.com' } });
        
        await waitFor(() => {
            expect(screen.queryByText('Enter a valid email')).not.toBeInTheDocument();
        });
    });

    it('validates phone number format', async () => {
        render(<LeadForm {...mockHandlers} />);

        const phoneInput = screen.getByLabelText(/phone/i);

        fireEvent.change(phoneInput, { target: { value: 'invalid-phone' } });
        fireEvent.blur(phoneInput);

        await waitFor(() => {
            expect(screen.getByText('Enter a valid phone number')).toBeInTheDocument();
        });

        fireEvent.change(phoneInput, { target: { value: '123-456-7890' } });
        
        await waitFor(() => {
            expect(screen.queryByText('Enter a valid phone number')).not.toBeInTheDocument();
        });
    });

    it('handles form submission', async () => {
        render(<LeadForm {...mockHandlers} />);

        // Fill out the form
        fireEvent.change(screen.getByLabelText(/company name/i), { target: { value: 'New Company' } });
        fireEvent.change(screen.getByLabelText(/contact name/i), { target: { value: 'Jane Doe' } });
        fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'jane@test.com' } });
        fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: '123-456-7890' } });

        // Submit the form
        fireEvent.click(screen.getByText('Create'));

        await waitFor(() => {
            expect(mockHandlers.onSubmit).toHaveBeenCalledWith(expect.objectContaining({
                companyName: 'New Company',
                contactName: 'Jane Doe',
                contactEmail: 'jane@test.com',
                contactPhone: '123-456-7890',
                source: LeadSource.WEBSITE,
                status: LeadStatus.NEW
            }));
        });
    });

    it('handles cancel button click', () => {
        render(<LeadForm {...mockHandlers} />);

        fireEvent.click(screen.getByText('Cancel'));
        expect(mockHandlers.onCancel).toHaveBeenCalled();
    });

    it('validates notes length', async () => {
        render(<LeadForm {...mockHandlers} />);

        const notesInput = screen.getByLabelText(/notes/i);
        const longNotes = 'a'.repeat(1001);

        fireEvent.change(notesInput, { target: { value: longNotes } });
        fireEvent.blur(notesInput);

        await waitFor(() => {
            expect(screen.getByText('Notes should not exceed 1000 characters')).toBeInTheDocument();
        });

        fireEvent.change(notesInput, { target: { value: 'Short note' } });
        
        await waitFor(() => {
            expect(screen.queryByText('Notes should not exceed 1000 characters')).not.toBeInTheDocument();
        });
    });

    it('validates future date for next follow-up', async () => {
        render(<LeadForm {...mockHandlers} />);

        const followUpInput = screen.getByLabelText(/next follow-up/i);
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 1);
        const pastDateString = pastDate.toISOString().split('T')[0] + 'T10:00';

        fireEvent.change(followUpInput, { target: { value: pastDateString } });
        fireEvent.blur(followUpInput);

        await waitFor(() => {
            expect(screen.getByText('Follow-up date cannot be in the past')).toBeInTheDocument();
        });

        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 1);
        const futureDateString = futureDate.toISOString().split('T')[0] + 'T10:00';

        fireEvent.change(followUpInput, { target: { value: futureDateString } });
        
        await waitFor(() => {
            expect(screen.queryByText('Follow-up date cannot be in the past')).not.toBeInTheDocument();
        });
    });
}); 