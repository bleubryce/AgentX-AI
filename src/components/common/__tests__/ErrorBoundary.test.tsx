import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from '../ErrorBoundary';

const ErrorComponent = () => {
    throw new Error('Test error');
};

const MockComponent = () => <div>Mock Component</div>;

describe('ErrorBoundary', () => {
    beforeEach(() => {
        // Prevent console.error from cluttering test output
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('renders children when there is no error', () => {
        render(
            <ErrorBoundary>
                <MockComponent />
            </ErrorBoundary>
        );

        expect(screen.getByText('Mock Component')).toBeInTheDocument();
    });

    it('renders error UI when an error occurs', () => {
        render(
            <ErrorBoundary>
                <ErrorComponent />
            </ErrorBoundary>
        );

        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
        expect(screen.getByText('Test error')).toBeInTheDocument();
    });

    it('renders custom fallback when provided', () => {
        const fallback = <div>Custom Error UI</div>;
        render(
            <ErrorBoundary fallback={fallback}>
                <ErrorComponent />
            </ErrorBoundary>
        );

        expect(screen.getByText('Custom Error UI')).toBeInTheDocument();
    });

    it('resets error state when Try Again button is clicked', () => {
        const { rerender } = render(
            <ErrorBoundary>
                <ErrorComponent />
            </ErrorBoundary>
        );

        expect(screen.getByText('Something went wrong')).toBeInTheDocument();

        fireEvent.click(screen.getByText('Try Again'));

        rerender(
            <ErrorBoundary>
                <MockComponent />
            </ErrorBoundary>
        );

        expect(screen.getByText('Mock Component')).toBeInTheDocument();
    });

    it('shows component stack in development mode', () => {
        const originalNodeEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';

        render(
            <ErrorBoundary>
                <ErrorComponent />
            </ErrorBoundary>
        );

        expect(screen.getByText(/in ErrorComponent/)).toBeInTheDocument();

        process.env.NODE_ENV = originalNodeEnv;
    });

    it('logs error to console', () => {
        const consoleSpy = jest.spyOn(console, 'error');
        render(
            <ErrorBoundary>
                <ErrorComponent />
            </ErrorBoundary>
        );

        expect(consoleSpy).toHaveBeenCalled();
    });
}); 