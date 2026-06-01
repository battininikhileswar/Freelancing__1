import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import useAuthStore from '../store/authStore';

export function useMyComplaints(options = {}) {
  const { user } = useAuthStore();
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    page: 1,
    limit: 10,
    ...options.defaultFilters,
  });

  const queryKey = ['myComplaints', filters];

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.category) params.set('category', filters.category);
      params.set('page', filters.page);
      params.set('limit', filters.limit);
      return api.get(`/complaints/my?${params}`).then(r => r.data.data);
    },
    enabled: !!user,
    staleTime: 30000,
  });

  return {
    complaints: data?.complaints || [],
    total: data?.total || 0,
    isLoading,
    error,
    filters,
    setFilters,
    refetch,
  };
}

export function useAssignedComplaints(options = {}) {
  const { user } = useAuthStore();
  const [filters, setFilters] = useState({
    status: '',
    page: 1,
    limit: 20,
    ...options.defaultFilters,
  });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['assignedComplaints', filters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      params.set('page', filters.page);
      params.set('limit', filters.limit);
      return api.get(`/complaints/authority/assigned?${params}`).then(r => r.data.data);
    },
    enabled: !!user && ['ps_officer', 'acb_officer', 'municipal_officer', 'super_admin'].includes(user.role),
    refetchInterval: 30000,
    staleTime: 15000,
  });

  const complaints = data?.complaints || [];
  const stats = {
    total: complaints.length,
    pending: complaints.filter(c => c.status === 'pending').length,
    active: complaints.filter(c => ['under_review', 'investigating'].includes(c.status)).length,
    escalated: complaints.filter(c => c.isEscalated).length,
    closed: complaints.filter(c => c.status === 'closed').length,
  };

  return {
    complaints,
    stats,
    total: data?.total || 0,
    isLoading,
    error,
    filters,
    setFilters,
    refetch,
  };
}

export function useComplaintById(id) {
  return useQuery({
    queryKey: ['complaint', id],
    queryFn: () => api.get(`/complaints/${id}`).then(r => r.data.data),
    enabled: !!id,
    staleTime: 30000,
  });
}

export default useMyComplaints;
