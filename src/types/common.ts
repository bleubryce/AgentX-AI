import type { ReactElement, ReactNode } from 'react';

export type FC<P = {}> = (props: P) => JSX.Element;

export interface WithChildren {
    children?: React.ReactNode;
}

export interface TabPanelProps extends WithChildren {
    index: number;
    value: number;
}

export interface ChartData {
    name: string;
    value: number;
}

export interface ErrorBoundaryProps extends WithChildren {
    fallback?: JSX.Element;
} 