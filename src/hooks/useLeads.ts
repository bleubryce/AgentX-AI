import { useState, useCallback, useEffect } from 'react';
import { LeadService } from '../services/api/leads';
import { Lead, LeadStatus, LeadSource } from '../types/lead';
import { ApiError } from '../services/api/client';

interface UseLeadsOptions {
  initialFilters?: {
    status?: LeadStatus;
    source?: LeadSource;
    assignedAgentId?: string;
    propertyType?: string;
    minPriority?: number;
    createdAfter?: Date;
    createdBefore?: Date;
    lastContactAfter?: Date;
    tags?: string[];
    skip?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: number;
  };
  autoFetch?: boolean;
}

interface UseLeadsResult {
  leads: Lead[];
  isLoading: boolean;
  error: ApiError | null;
  refetch: () => Promise<void>;
  createLead: (lead: Omit<Lead, 'id'>) => Promise<Lead>;
  updateLead: (id: string, lead: Partial<Lead>) => Promise<Lead>;
  deleteLead: (id: string) => Promise<void>;
  statistics: {
    totalLeads: number;
    activeLeads: number;
    convertedLeads: number;
    conversionRate: number;
    averageResponseTime: number;
    sourceDistribution: Record<LeadSource, number>;
    statusDistribution: Record<LeadStatus, number>;
  } | null;
  filters: UseLeadsOptions['initialFilters'];
  setFilters: (filters: UseLeadsOptions['initialFilters']) => void;
}

export function useLeads({ initialFilters = {}, autoFetch = true }: UseLeadsOptions = {}): UseLeadsResult {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [filters, setFilters] = useState(initialFilters);
  const [statistics, setStatistics] = useState<UseLeadsResult['statistics']>(null);

  const leadService = LeadService.getInstance();

  const fetchLeads = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const fetchedLeads = await leadService.getLeads(filters);
      setLeads(fetchedLeads);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(500, 'Unknown error occurred'));
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  const fetchStatistics = useCallback(async () => {
    try {
      const stats = await leadService.getLeadStatistics();
      setStatistics(stats);
    } catch (err) {
      console.error('Failed to fetch lead statistics:', err);
    }
  }, []);

  useEffect(() => {
    if (autoFetch) {
      fetchLeads();
      fetchStatistics();
    }
  }, [autoFetch, fetchLeads, fetchStatistics]);

  const createLead = useCallback(async (lead: Omit<Lead, 'id'>) => {
    try {
      setError(null);
      const newLead = await leadService.createLead(lead);
      setLeads((prevLeads: Lead[]) => [...prevLeads, newLead]);
      await fetchStatistics();
      return newLead;
    } catch (err) {
      const error = err instanceof ApiError ? err : new ApiError(500, 'Failed to create lead');
      setError(error);
      throw error;
    }
  }, [fetchStatistics]);

  const updateLead = useCallback(async (id: string, leadUpdate: Partial<Lead>) => {
    try {
      setError(null);
      const updatedLead = await leadService.updateLead(id, leadUpdate);
      setLeads((prevLeads: Lead[]) =>
        prevLeads.map((lead: Lead) => (lead.id === id ? updatedLead : lead))
      );
      await fetchStatistics();
      return updatedLead;
    } catch (err) {
      const error = err instanceof ApiError ? err : new ApiError(500, 'Failed to update lead');
      setError(error);
      throw error;
    }
  }, [fetchStatistics]);

  const deleteLead = useCallback(async (id: string) => {
    try {
      setError(null);
      await leadService.deleteLead(id);
      setLeads((prevLeads: Lead[]) => prevLeads.filter((lead: Lead) => lead.id !== id));
      await fetchStatistics();
    } catch (err) {
      const error = err instanceof ApiError ? err : new ApiError(500, 'Failed to delete lead');
      setError(error);
      throw error;
    }
  }, [fetchStatistics]);

  return {
    leads,
    isLoading,
    error,
    refetch: fetchLeads,
    createLead,
    updateLead,
    deleteLead,
    statistics,
    filters,
    setFilters,
  };
} 