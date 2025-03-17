import React from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button, Alert } from '@mui/material';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends React.Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            error,
            errorInfo: null
        };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        this.setState({
            error,
            errorInfo
        });

        // Log error to monitoring service
        console.error('Error caught by boundary:', error, errorInfo);
    }

    private handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null
        });
    };

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <Box
                    sx={{
                        p: 3,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 2
                    }}
                >
                    <Alert severity="error" sx={{ width: '100%' }}>
                        <Typography variant="h6" gutterBottom>
                            Something went wrong
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {this.state.error?.message}
                        </Typography>
                    </Alert>

                    <Button
                        variant="contained"
                        color="primary"
                        onClick={this.handleReset}
                    >
                        Try Again
                    </Button>

                    {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                        <Box
                            sx={{
                                mt: 2,
                                p: 2,
                                bgcolor: 'grey.100',
                                borderRadius: 1,
                                overflow: 'auto'
                            }}
                        >
                            <Typography variant="caption" component="pre">
                                {this.state.errorInfo.componentStack}
                            </Typography>
                        </Box>
                    )}
                </Box>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary; 