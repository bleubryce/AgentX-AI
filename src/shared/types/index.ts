export * from './lead.types';

// Add placeholder for future shared types
export interface PaginationParams {
    page: number;
    pageSize: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: Record<string, any>;
    };
    meta?: {
        pagination?: {
            total: number;
            page: number;
            pageSize: number;
            totalPages: number;
        };
        timestamp: string;
    };
}

export interface ErrorResponse {
    code: string;
    message: string;
    details?: Record<string, any>;
    stack?: string;
}

export interface ValidationError {
    field: string;
    message: string;
    code: string;
}

export interface ApiErrorResponse {
    success: false;
    error: ErrorResponse;
    validationErrors?: ValidationError[];
} 