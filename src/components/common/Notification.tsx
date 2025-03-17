import React from 'react';
import { Snackbar, Alert, AlertColor } from '@mui/material';

export interface NotificationProps {
    open: boolean;
    message: string;
    severity?: AlertColor;
    autoHideDuration?: number;
    onClose: () => void;
}

const Notification: React.FC<NotificationProps> = ({
    open,
    message,
    severity = 'success',
    autoHideDuration = 6000,
    onClose
}) => {
    return (
        <Snackbar
            open={open}
            autoHideDuration={autoHideDuration}
            onClose={onClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
            <Alert
                onClose={onClose}
                severity={severity}
                variant="filled"
                sx={{ width: '100%' }}
            >
                {message}
            </Alert>
        </Snackbar>
    );
};

export default Notification;

// Hook for managing notifications
export const useNotification = () => {
    const [notification, setNotification] = React.useState<{
        open: boolean;
        message: string;
        severity: AlertColor;
    }>({
        open: false,
        message: '',
        severity: 'success'
    });

    const showNotification = (message: string, severity: AlertColor = 'success') => {
        setNotification({
            open: true,
            message,
            severity
        });
    };

    const hideNotification = () => {
        setNotification(prev => ({
            ...prev,
            open: false
        }));
    };

    const notificationProps: NotificationProps = {
        open: notification.open,
        message: notification.message,
        severity: notification.severity,
        onClose: hideNotification
    };

    return {
        showNotification,
        hideNotification,
        notificationProps
    };
}; 