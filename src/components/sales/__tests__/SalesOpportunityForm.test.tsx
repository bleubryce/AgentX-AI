import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import SalesOpportunityForm from '../SalesOpportunityForm';
import { salesAPI } from '../../../services/api/sales.api';
import { SalesOpportunity } from '../../../services/agent/processors/sales.processor';

// Mock the salesAPI
jest.mock('../../../services/api/sales.api', () => ({
    salesAPI: {
        getOpportunityAnalysis: jest.fn(),
        createOpportunity: jest.fn(),
        updateOpportunity: jest.fn()
    }
}));

const mockOpportunity: SalesOpportunity = {
    id: '123',
    companyName: 'Test Company',
    contactName: 'John Doe',
    contactEmail: 'john@test.com',
    contactPhone: '123-456-7890',
    productInterest: ['AI Platform', 'Data Analytics'],
    stage: 'QUALIFICATION',
    priority: 'HIGH',
    budget: 50000,
};

const mockHandlers = {
    onSubmit: jest.fn(),
    onCancel: jest.fn(),
};

const renderWithProvider = (ui: React.ReactElement) => {
    return render(
        <LocalizationProvider dateAdapter={AdapterDateFns}>
            {ui}
        </LocalizationProvider>
    );
};

describe('SalesOpportunityForm', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders empty form in create mode', () => {
        render(<SalesOpportunityForm {...mockHandlers} />);

        expect(screen.getByLabelText(/company name/i)).toHaveValue('');
        expect(screen.getByLabelText(/contact name/i)).toHaveValue('');
        expect(screen.getByLabelText(/contact email/i)).toHaveValue('');
        expect(screen.getByLabelText(/contact phone/i)).toHaveValue('');
        expect(screen.getByLabelText(/budget/i)).toHaveValue(null);
        expect(screen.getByLabelText(/stage/i)).toHaveValue('PROSPECTING');
        expect(screen.getByLabelText(/priority/i)).toHaveValue('MEDIUM');
    });

    it('renders form with initial data in edit mode', () => {
        render(<SalesOpportunityForm {...mockHandlers} initialData={mockOpportunity} />);

        expect(screen.getByLabelText(/company name/i)).toHaveValue('Test Company');
        expect(screen.getByLabelText(/contact name/i)).toHaveValue('John Doe');
        expect(screen.getByLabelText(/contact email/i)).toHaveValue('john@test.com');
        expect(screen.getByLabelText(/contact phone/i)).toHaveValue('123-456-7890');
        expect(screen.getByLabelText(/budget/i)).toHaveValue(50000);
        expect(screen.getByLabelText(/stage/i)).toHaveValue('QUALIFICATION');
        expect(screen.getByLabelText(/priority/i)).toHaveValue('HIGH');
    });

    it('shows validation errors for required fields', async () => {
        render(<SalesOpportunityForm {...mockHandlers} />);

        // Submit empty form
        fireEvent.submit(screen.getByRole('button', { name: /create opportunity/i }));

        // Wait for validation errors
        await waitFor(() => {
            expect(screen.getByText(/company name is required/i)).toBeInTheDocument();
            expect(screen.getByText(/contact name is required/i)).toBeInTheDocument();
            expect(screen.getByText(/at least one product is required/i)).toBeInTheDocument();
        });

        // Verify submit was not called
        expect(mockHandlers.onSubmit).not.toHaveBeenCalled();
    });

    it('validates email format', async () => {
        render(<SalesOpportunityForm {...mockHandlers} />);

        const emailInput = screen.getByLabelText(/contact email/i);
        await userEvent.type(emailInput, 'invalid-email');
        fireEvent.blur(emailInput);

        await waitFor(() => {
            expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
        });
    });

    it('handles product interest selection', async () => {
        render(<SalesOpportunityForm {...mockHandlers} />);

        // Open product interest dropdown
        const productSelect = screen.getByLabelText(/products of interest/i);
        fireEvent.mouseDown(productSelect);

        // Select multiple products
        const aiPlatform = screen.getByText('AI Platform');
        const dataAnalytics = screen.getByText('Data Analytics');
        
        fireEvent.click(aiPlatform);
        fireEvent.click(dataAnalytics);

        // Close dropdown
        fireEvent.mouseDown(productSelect);

        // Verify selections are displayed
        expect(screen.getByText('AI Platform')).toBeInTheDocument();
        expect(screen.getByText('Data Analytics')).toBeInTheDocument();
    });

    it('submits form with valid data', async () => {
        render(<SalesOpportunityForm {...mockHandlers} />);

        // Fill out form
        await userEvent.type(screen.getByLabelText(/company name/i), 'New Company');
        await userEvent.type(screen.getByLabelText(/contact name/i), 'Jane Smith');
        await userEvent.type(screen.getByLabelText(/contact email/i), 'jane@company.com');
        await userEvent.type(screen.getByLabelText(/contact phone/i), '555-123-4567');
        await userEvent.type(screen.getByLabelText(/budget/i), '75000');

        // Select products
        const productSelect = screen.getByLabelText(/products of interest/i);
        fireEvent.mouseDown(productSelect);
        fireEvent.click(screen.getByText('AI Platform'));
        fireEvent.mouseDown(productSelect);

        // Select stage
        const stageSelect = screen.getByLabelText(/stage/i);
        fireEvent.mouseDown(stageSelect);
        fireEvent.click(screen.getByText('PROPOSAL'));

        // Select priority
        const prioritySelect = screen.getByLabelText(/priority/i);
        fireEvent.mouseDown(prioritySelect);
        fireEvent.click(screen.getByText('HIGH'));

        // Submit form
        fireEvent.click(screen.getByRole('button', { name: /create opportunity/i }));

        await waitFor(() => {
            expect(mockHandlers.onSubmit).toHaveBeenCalledWith({
                companyName: 'New Company',
                contactName: 'Jane Smith',
                contactEmail: 'jane@company.com',
                contactPhone: '555-123-4567',
                budget: 75000,
                productInterest: ['AI Platform'],
                stage: 'PROPOSAL',
                priority: 'HIGH',
            });
        });
    });

    it('handles cancel button click', () => {
        render(<SalesOpportunityForm {...mockHandlers} />);

        fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
        expect(mockHandlers.onCancel).toHaveBeenCalled();
    });

    it('disables submit button when form is pristine', () => {
        render(<SalesOpportunityForm {...mockHandlers} />);

        expect(screen.getByRole('button', { name: /create opportunity/i })).toBeDisabled();
    });

    it('enables submit button when form is dirty and valid', async () => {
        render(<SalesOpportunityForm {...mockHandlers} />);

        // Fill required fields
        await userEvent.type(screen.getByLabelText(/company name/i), 'New Company');
        await userEvent.type(screen.getByLabelText(/contact name/i), 'Jane Smith');

        // Select a product
        const productSelect = screen.getByLabelText(/products of interest/i);
        fireEvent.mouseDown(productSelect);
        fireEvent.click(screen.getByText('AI Platform'));

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /create opportunity/i })).not.toBeDisabled();
        });
    });

    describe('Create Mode', () => {
        it('validates required fields', async () => {
            renderWithProvider(<SalesOpportunityForm />);

            fireEvent.click(screen.getByText('Create'));

            await waitFor(() => {
                expect(screen.getByText('Company name is required')).toBeInTheDocument();
                expect(screen.getByText('Contact name is required')).toBeInTheDocument();
                expect(screen.getByText('At least one product interest is required')).toBeInTheDocument();
            });
        });

        it('validates email format', async () => {
            renderWithProvider(<SalesOpportunityForm />);

            const emailInput = screen.getByLabelText('Contact Email');
            fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
            fireEvent.blur(emailInput);

            await waitFor(() => {
                expect(screen.getByText('Invalid email address')).toBeInTheDocument();
            });
        });

        it('successfully creates new opportunity', async () => {
            const onSubmit = jest.fn();
            (salesAPI.createOpportunity as jest.Mock).mockResolvedValue(mockOpportunity);

            renderWithProvider(<SalesOpportunityForm onSubmit={onSubmit} />);

            // Fill in required fields
            fireEvent.change(screen.getByLabelText('Company Name'), {
                target: { value: mockOpportunity.companyName }
            });
            fireEvent.change(screen.getByLabelText('Contact Name'), {
                target: { value: mockOpportunity.contactName }
            });
            fireEvent.change(screen.getByLabelText('Contact Email'), {
                target: { value: mockOpportunity.contactEmail }
            });

            // Select product interest
            const productSelect = screen.getByLabelText('Product Interest');
            fireEvent.mouseDown(productSelect);
            const option = screen.getByText('AI Platform');
            fireEvent.click(option);

            // Submit form
            fireEvent.click(screen.getByText('Create'));

            await waitFor(() => {
                expect(salesAPI.createOpportunity).toHaveBeenCalled();
                expect(onSubmit).toHaveBeenCalledWith(mockOpportunity);
                expect(screen.getByText('Opportunity created successfully')).toBeInTheDocument();
            });
        });

        it('handles API errors during creation', async () => {
            (salesAPI.createOpportunity as jest.Mock).mockRejectedValue(new Error('API Error'));

            renderWithProvider(<SalesOpportunityForm />);

            // Fill in required fields
            fireEvent.change(screen.getByLabelText('Company Name'), {
                target: { value: mockOpportunity.companyName }
            });
            fireEvent.change(screen.getByLabelText('Contact Name'), {
                target: { value: mockOpportunity.contactName }
            });

            // Select product interest
            const productSelect = screen.getByLabelText('Product Interest');
            fireEvent.mouseDown(productSelect);
            const option = screen.getByText('AI Platform');
            fireEvent.click(option);

            // Submit form
            fireEvent.click(screen.getByText('Create'));

            await waitFor(() => {
                expect(screen.getByText('Failed to save opportunity. Please try again.')).toBeInTheDocument();
            });
        });
    });

    describe('Edit Mode', () => {
        beforeEach(() => {
            (salesAPI.getOpportunityAnalysis as jest.Mock).mockResolvedValue({
                opportunity: mockOpportunity
            });
        });

        it('loads existing opportunity data', async () => {
            renderWithProvider(<SalesOpportunityForm opportunityId="1" />);

            await waitFor(() => {
                expect(salesAPI.getOpportunityAnalysis).toHaveBeenCalledWith('1');
                expect(screen.getByLabelText('Company Name')).toHaveValue(mockOpportunity.companyName);
                expect(screen.getByLabelText('Contact Name')).toHaveValue(mockOpportunity.contactName);
                expect(screen.getByLabelText('Contact Email')).toHaveValue(mockOpportunity.contactEmail);
            });
        });

        it('successfully updates opportunity', async () => {
            (salesAPI.updateOpportunity as jest.Mock).mockResolvedValue(mockOpportunity);

            renderWithProvider(<SalesOpportunityForm opportunityId="1" />);

            await waitFor(() => {
                expect(screen.getByLabelText('Company Name')).toHaveValue(mockOpportunity.companyName);
            });

            // Update company name
            fireEvent.change(screen.getByLabelText('Company Name'), {
                target: { value: 'Updated Company' }
            });

            // Submit form
            fireEvent.click(screen.getByText('Update'));

            await waitFor(() => {
                expect(salesAPI.updateOpportunity).toHaveBeenCalledWith('1', expect.any(Object));
                expect(screen.getByText('Opportunity updated successfully')).toBeInTheDocument();
            });
        });

        it('handles API errors during update', async () => {
            (salesAPI.updateOpportunity as jest.Mock).mockRejectedValue(new Error('API Error'));

            renderWithProvider(<SalesOpportunityForm opportunityId="1" />);

            await waitFor(() => {
                expect(screen.getByLabelText('Company Name')).toHaveValue(mockOpportunity.companyName);
            });

            // Submit form
            fireEvent.click(screen.getByText('Update'));

            await waitFor(() => {
                expect(screen.getByText('Failed to save opportunity. Please try again.')).toBeInTheDocument();
            });
        });

        it('handles API errors during data loading', async () => {
            (salesAPI.getOpportunityAnalysis as jest.Mock).mockRejectedValue(new Error('API Error'));

            renderWithProvider(<SalesOpportunityForm opportunityId="1" />);

            await waitFor(() => {
                expect(screen.getByText('Failed to load opportunity. Please try again.')).toBeInTheDocument();
            });
        });
    });

    describe('Form Interactions', () => {
        it('clears validation errors when fields are updated', async () => {
            renderWithProvider(<SalesOpportunityForm />);

            // Submit empty form to trigger validation
            fireEvent.click(screen.getByText('Create'));

            await waitFor(() => {
                expect(screen.getByText('Company name is required')).toBeInTheDocument();
            });

            // Update company name
            fireEvent.change(screen.getByLabelText('Company Name'), {
                target: { value: 'Test Company' }
            });

            expect(screen.queryByText('Company name is required')).not.toBeInTheDocument();
        });

        it('handles cancel button click', () => {
            const onCancel = jest.fn();
            renderWithProvider(<SalesOpportunityForm onCancel={onCancel} />);

            fireEvent.click(screen.getByText('Cancel'));
            expect(onCancel).toHaveBeenCalled();
        });

        it('disables form submission while loading', async () => {
            (salesAPI.createOpportunity as jest.Mock).mockImplementation(
                () => new Promise(resolve => setTimeout(resolve, 100))
            );

            renderWithProvider(<SalesOpportunityForm />);

            // Fill required fields
            fireEvent.change(screen.getByLabelText('Company Name'), {
                target: { value: 'Test Company' }
            });
            fireEvent.change(screen.getByLabelText('Contact Name'), {
                target: { value: 'John Doe' }
            });

            // Select product interest
            const productSelect = screen.getByLabelText('Product Interest');
            fireEvent.mouseDown(productSelect);
            const option = screen.getByText('AI Platform');
            fireEvent.click(option);

            // Submit form
            fireEvent.click(screen.getByText('Create'));

            expect(screen.getByText('Saving...')).toBeInTheDocument();
            expect(screen.getByText('Saving...')).toBeDisabled();
        });
    });
}); 