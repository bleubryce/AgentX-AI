import React from 'react';
import {
    Box,
    CircularProgress,
    Skeleton,
    Typography,
    useTheme
} from '@mui/material';

interface LoadingStateProps {
    variant?: 'circular' | 'skeleton' | 'overlay';
    text?: string;
    height?: number | string;
    width?: number | string;
    skeletonCount?: number;
}

const LoadingState: React.FC<LoadingStateProps> = ({
    variant = 'circular',
    text = 'Loading...',
    height = 400,
    width = '100%',
    skeletonCount = 3
}) => {
    const theme = useTheme();

    const renderCircular = () => (
        <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            minHeight={height}
            width={width}
        >
            <CircularProgress size={40} />
            {text && (
                <Typography
                    variant="body2"
                    color="textSecondary"
                    sx={{ mt: 2 }}
                >
                    {text}
                </Typography>
            )}
        </Box>
    );

    const renderSkeleton = () => (
        <Box sx={{ width }}>
            {Array.from({ length: skeletonCount }).map((_, index) => (
                <Skeleton
                    key={index}
                    variant="rectangular"
                    height={height ? Number(height) / skeletonCount : 100}
                    sx={{ mb: 2, borderRadius: 1 }}
                />
            ))}
        </Box>
    );

    const renderOverlay = () => (
        <Box
            sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                zIndex: theme.zIndex.modal - 1
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    p: 3,
                    borderRadius: 2,
                    bgcolor: 'background.paper',
                    boxShadow: 3
                }}
            >
                <CircularProgress size={40} />
                {text && (
                    <Typography
                        variant="body2"
                        color="textSecondary"
                        sx={{ mt: 2 }}
                    >
                        {text}
                    </Typography>
                )}
            </Box>
        </Box>
    );

    switch (variant) {
        case 'skeleton':
            return renderSkeleton();
        case 'overlay':
            return renderOverlay();
        default:
            return renderCircular();
    }
};

export default LoadingState; 