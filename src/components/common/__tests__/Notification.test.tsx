import React from 'react';
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react';
import Notification, { useNotification } from '../Notification';

describe('Notification', () => {
    const defaultProps = {
        open: true,
        message: 'Test message',
        severity: 'success' as const,
        onClose: jest.fn()
    };

    it('renders notification with message', () => {
        render(<Notification {...defaultProps} />);
        expect(screen.getByText('Test message')).toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', () => {
        render(<Notification {...defaultProps} />);
        const closeButton = screen.getByRole('button');
        fireEvent.click(closeButton);
        expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('renders with different severities', () => {
        const severities = ['success', 'error', 'warning', 'info'] as const;
        severities.forEach(severity => {
            const { rerender } = render(
                <Notification {...defaultProps} severity={severity} />
            );
            expect(screen.getByRole('alert')).toHaveClass(`MuiAlert-${severity}`);
            rerender(<></>);
        });
    });

    it('does not render when open is false', () => {
        render(<Notification {...defaultProps} open={false} />);
        expect(screen.queryByText('Test message')).not.toBeInTheDocument();
    });

    it('renders notification with success message', () => {
        render(
            <Notification
                open={true}
                message="Operation successful"
                severity="success"
                onClose={() => {}}
            />
        );

        expect(screen.getByText('Operation successful')).toBeInTheDocument();
        expect(screen.getByRole('alert')).toHaveClass('MuiAlert-filledSuccess');
    });

    it('renders notification with error message', () => {
        render(
            <Notification
                open={true}
                message="Operation failed"
                severity="error"
                onClose={() => {}}
            />
        );

        expect(screen.getByText('Operation failed')).toBeInTheDocument();
        expect(screen.getByRole('alert')).toHaveClass('MuiAlert-filledError');
    });

    it('does not render when open is false', () => {
        render(
            <Notification
                open={false}
                message="Hidden message"
                onClose={() => {}}
            />
        );

        expect(screen.queryByText('Hidden message')).not.toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', () => {
        const handleClose = jest.fn();
        render(
            <Notification
                open={true}
                message="Test message"
                onClose={handleClose}
            />
        );

        fireEvent.click(screen.getByRole('button'));
        expect(handleClose).toHaveBeenCalledTimes(1);
    });
});

describe('useNotification', () => {
    it('initializes with default state', () => {
        const { result } = renderHook(() => useNotification());
        expect(result.current.notificationProps).toEqual({
            open: false,
            message: '',
            severity: 'success',
            onClose: expect.any(Function)
        });
    });

    it('shows notification with message', () => {
        const { result } = renderHook(() => useNotification());
        act(() => {
            result.current.showNotification('Test message');
        });
        expect(result.current.notificationProps).toEqual({
            open: true,
            message: 'Test message',
            severity: 'success',
            onClose: expect.any(Function)
        });
    });

    it('shows notification with custom severity', () => {
        const { result } = renderHook(() => useNotification());
        act(() => {
            result.current.showNotification('Error message', 'error');
        });
        expect(result.current.notificationProps).toEqual({
            open: true,
            message: 'Error message',
            severity: 'error',
            onClose: expect.any(Function)
        });
    });

    it('hides notification', () => {
        const { result } = renderHook(() => useNotification());
        act(() => {
            result.current.showNotification('Test message');
        });
        expect(result.current.notificationProps.open).toBe(true);

        act(() => {
            result.current.hideNotification();
        });
        expect(result.current.notificationProps.open).toBe(false);
        expect(result.current.notificationProps.message).toBe('Test message');
    });

    it('maintains message when hiding notification', () => {
        const { result } = renderHook(() => useNotification());
        act(() => {
            result.current.showNotification('Test message');
            result.current.hideNotification();
        });
        expect(result.current.notificationProps).toEqual({
            open: false,
            message: 'Test message',
            severity: 'success',
            onClose: expect.any(Function)
        });
    });

    // Test component to test the useNotification hook
    const TestComponent = () => {
        const { showNotification, hideNotification, notificationProps } = useNotification();

        return (
            <div>
                <button onClick={() => showNotification('Success message')}>
                    Show Success
                </button>
                <button onClick={() => showNotification('Error message', 'error')}>
                    Show Error
                </button>
                <button onClick={hideNotification}>Hide</button>
                <Notification {...notificationProps} />
            </div>
        );
    };

    it('shows success notification', () => {
        render(<TestComponent />);

        fireEvent.click(screen.getByText('Show Success'));
        expect(screen.getByText('Success message')).toBeInTheDocument();
        expect(screen.getByRole('alert')).toHaveClass('MuiAlert-filledSuccess');
    });

    it('shows error notification', () => {
        render(<TestComponent />);

        fireEvent.click(screen.getByText('Show Error'));
        expect(screen.getByText('Error message')).toBeInTheDocument();
        expect(screen.getByRole('alert')).toHaveClass('MuiAlert-filledError');
    });

    it('hides notification', () => {
        render(<TestComponent />);

        // Show notification
        fireEvent.click(screen.getByText('Show Success'));
        expect(screen.getByText('Success message')).toBeInTheDocument();

        // Hide notification
        fireEvent.click(screen.getByText('Hide'));
        
        // We need to wait for the animation to complete
        act(() => {
            jest.runAllTimers();
        });
        
        // The element might still be in the document during animation
        // but it should have attributes indicating it's being hidden
        const alert = screen.queryByRole('alert');
        expect(alert?.parentElement).toHaveAttribute('aria-hidden', 'true');
    });

    it('auto-hides notification after duration', () => {
        jest.useFakeTimers();
        render(<TestComponent />);

        fireEvent.click(screen.getByText('Show Success'));
        expect(screen.getByText('Success message')).toBeInTheDocument();

        // Fast-forward time
        act(() => {
            jest.advanceTimersByTime(6000);
        });

        // The element might still be in the document during animation
        // but it should have attributes indicating it's being hidden
        const alert = screen.queryByRole('alert');
        expect(alert?.parentElement).toHaveAttribute('aria-hidden', 'true');

        jest.useRealTimers();
    });
}); 