import { useState, useEffect, useCallback } from 'react';
import { salesAPI } from '../services/api/sales.api';
import { SalesOpportunity } from '../services/agent/processors/sales.processor';
import { SalesAnalysisResponse } from '../services/api/sales.api';

interface UseSalesOpportunitiesReturn {
    opportunities: SalesOpportunity[];
    loading: boolean;
    error: Error | null;
    selectedOpportunity: SalesOpportunity | null;
    opportunityAnalysis: SalesAnalysisResponse | null;
    analysisLoading: boolean;
    analysisError: Error | null;
    fetchOpportunities: () => Promise<void>;
    selectOpportunity: (id: string) => Promise<void>;
    createOpportunity: (data: Omit<SalesOpportunity, 'id'>) => Promise<SalesOpportunity>;
    updateOpportunity: (id: string, data: Partial<SalesOpportunity>) => Promise<SalesOpportunity>;
    deleteOpportunity: (id: string) => Promise<void>;
}

export const useSalesOpportunities = (): UseSalesOpportunitiesReturn => {
    const [opportunities, setOpportunities] = useState<SalesOpportunity[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<Error | null>(null);
    
    const [selectedOpportunity, setSelectedOpportunity] = useState<SalesOpportunity | null>(null);
    const [opportunityAnalysis, setOpportunityAnalysis] = useState<SalesAnalysisResponse | null>(null);
    const [analysisLoading, setAnalysisLoading] = useState<boolean>(false);
    const [analysisError, setAnalysisError] = useState<Error | null>(null);

    const fetchOpportunities = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await salesAPI.getOpportunities();
            setOpportunities(data);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to fetch opportunities'));
            console.error('Error fetching opportunities:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const selectOpportunity = useCallback(async (id: string) => {
        // Find the opportunity in the current list
        const opportunity = opportunities.find(opp => opp.id === id) || null;
        setSelectedOpportunity(opportunity);
        
        if (opportunity) {
            setAnalysisLoading(true);
            setAnalysisError(null);
            try {
                const analysis = await salesAPI.getOpportunityAnalysis(id);
                setOpportunityAnalysis(analysis);
            } catch (err) {
                setAnalysisError(err instanceof Error ? err : new Error('Failed to fetch opportunity analysis'));
                console.error('Error fetching opportunity analysis:', err);
            } finally {
                setAnalysisLoading(false);
            }
        } else {
            setOpportunityAnalysis(null);
        }
    }, [opportunities]);

    const createOpportunity = useCallback(async (data: Omit<SalesOpportunity, 'id'>) => {
        try {
            const newOpportunity = await salesAPI.createOpportunity(data);
            setOpportunities(prev => [...prev, newOpportunity]);
            return newOpportunity;
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Failed to create opportunity');
            console.error('Error creating opportunity:', err);
            throw error;
        }
    }, []);

    const updateOpportunity = useCallback(async (id: string, data: Partial<SalesOpportunity>) => {
        try {
            const updatedOpportunity = await salesAPI.updateOpportunity(id, data);
            setOpportunities(prev => 
                prev.map(opp => opp.id === id ? updatedOpportunity : opp)
            );
            
            // Update selected opportunity if it's the one being updated
            if (selectedOpportunity?.id === id) {
                setSelectedOpportunity(updatedOpportunity);
            }
            
            return updatedOpportunity;
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Failed to update opportunity');
            console.error('Error updating opportunity:', err);
            throw error;
        }
    }, [selectedOpportunity]);

    const deleteOpportunity = useCallback(async (id: string) => {
        try {
            await salesAPI.deleteOpportunity(id);
            setOpportunities(prev => prev.filter(opp => opp.id !== id));
            
            // Clear selected opportunity if it's the one being deleted
            if (selectedOpportunity?.id === id) {
                setSelectedOpportunity(null);
                setOpportunityAnalysis(null);
            }
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Failed to delete opportunity');
            console.error('Error deleting opportunity:', err);
            throw error;
        }
    }, [selectedOpportunity]);

    // Fetch opportunities on initial load
    useEffect(() => {
        fetchOpportunities();
    }, [fetchOpportunities]);

    return {
        opportunities,
        loading,
        error,
        selectedOpportunity,
        opportunityAnalysis,
        analysisLoading,
        analysisError,
        fetchOpportunities,
        selectOpportunity,
        createOpportunity,
        updateOpportunity,
        deleteOpportunity
    };
}; 