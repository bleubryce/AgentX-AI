import React from 'react';
import { render, screen } from '@testing-library/react';
import LoadingState from '../LoadingState';

describe('LoadingState', () => {
    it('renders circular loading state by default', () => {
        render(<LoadingState />);
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
        expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('renders custom loading text', () => {
        render(<LoadingState text="Please wait..." />);
        expect(screen.getByText('Please wait...')).toBeInTheDocument();
    });

    it('renders skeleton loading state', () => {
        render(<LoadingState variant="skeleton" skeletonCount={3} />);
        const skeletons = document.querySelectorAll('.MuiSkeleton-root');
        expect(skeletons).toHaveLength(3);
    });

    it('renders overlay loading state', () => {
        render(<LoadingState variant="overlay" text="Processing..." />);
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
        expect(screen.getByText('Processing...')).toBeInTheDocument();
        expect(document.querySelector('[style*="position: absolute"]')).toBeInTheDocument();
    });

    it('applies custom dimensions', () => {
        render(<LoadingState height={200} width={300} />);
        const container = screen.getByText('Loading...').parentElement;
        expect(container).toHaveStyle({ minHeight: '200px', width: '300px' });
    });

    it('renders correct number of skeletons', () => {
        render(<LoadingState variant="skeleton" skeletonCount={5} />);
        const skeletons = document.querySelectorAll('.MuiSkeleton-root');
        expect(skeletons).toHaveLength(5);
    });

    it('calculates correct skeleton height based on total height', () => {
        const totalHeight = 300;
        const skeletonCount = 3;
        render(
            <LoadingState
                variant="skeleton"
                height={totalHeight}
                skeletonCount={skeletonCount}
            />
        );
        const skeletons = document.querySelectorAll('.MuiSkeleton-root');
        skeletons.forEach(skeleton => {
            expect(skeleton).toHaveStyle({ height: `${totalHeight / skeletonCount}px` });
        });
    });
}); 