'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { 
  TreasuryForecastResponseDto, 
  ForecastSummaryDto, 
  CreateTreasuryForecastDto,
  ForecastScenario,
  ForecastQueryDto
} from '@/types/treasury-forecast';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface UseTreasuryForecastOptions {
  autoRefresh?: boolean;
  refetchInterval?: number;
}

export function useTreasuryForecast(options: UseTreasuryForecastOptions = {}) {
  const queryClient = useQueryClient();
  const [currentQuery, setCurrentQuery] = useState<ForecastQueryDto>({});

  // Fetch forecast summary
  const { 
    data: summary, 
    isLoading: summaryLoading,
    error: summaryError 
  } = useQuery<ForecastSummaryDto>({
    queryKey: ['treasury-forecast', 'summary'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/treasury/forecast/summary`);
      return response.data;
    },
    refetchInterval: options.refetchInterval || 30000, // Refresh every 30 seconds
  });

  // Fetch current forecast
  const { 
    data: forecast, 
    isLoading: forecastLoading,
    error: forecastError,
    refetch: refetchForecast
  } = useQuery<TreasuryForecastResponseDto | null>({
    queryKey: ['treasury-forecast', 'current', currentQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (currentQuery.days) params.append('days', currentQuery.days.toString());
      if (currentQuery.scenario) params.append('scenario', currentQuery.scenario);
      if (currentQuery.startDate) params.append('startDate', currentQuery.startDate);
      if (currentQuery.includeInactiveAlerts) params.append('includeInactiveAlerts', 'true');
      
      const response = await axios.get(`${API_BASE_URL}/api/treasury/forecast?${params}`);
      return response.data;
    },
    enabled: Object.keys(currentQuery).length > 0,
  });

  // Generate new forecast mutation
  const generateForecastMutation = useMutation({
    mutationFn: async (dto: CreateTreasuryForecastDto) => {
      const response = await axios.post(`${API_BASE_URL}/api/treasury/forecast`, dto);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['treasury-forecast', 'current', currentQuery], data);
      queryClient.invalidateQueries({ queryKey: ['treasury-forecast', 'summary'] });
    },
  });

  // Quick forecast mutation
  const quickForecastMutation = useMutation({
    mutationFn: async (days: number) => {
      const response = await axios.get(`${API_BASE_URL}/api/treasury/forecast/quick/${days}`);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['treasury-forecast', 'current', { days: data.periodDays }], data);
      queryClient.invalidateQueries({ queryKey: ['treasury-forecast', 'summary'] });
    },
  });

  // Compare scenarios mutation
  const compareScenariosMutation = useMutation({
    mutationFn: async ({ periodDays, currentBalance }: { periodDays: number; currentBalance: number }) => {
      const response = await axios.post(`${API_BASE_URL}/api/treasury/forecast/scenarios/compare`, {
        forecastDate: new Date().toISOString(),
        periodDays,
        currentBalance,
      });
      return response.data;
    },
  });

  // Acknowledge alert mutation
  const acknowledgeAlertMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const response = await axios.post(`${API_BASE_URL}/api/treasury/forecast/alerts/${alertId}/acknowledge`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treasury-forecast'] });
    },
  });

  // Utility functions
  const generateForecast = useCallback(
    async (days: number, scenario: ForecastScenario = ForecastScenario.REALISTIC, currentBalance?: number) => {
      const query = { days, scenario, startDate: new Date().toISOString() };
      setCurrentQuery(query);

      if (currentBalance) {
        const dto: CreateTreasuryForecastDto = {
          forecastDate: new Date().toISOString(),
          periodDays: days,
          scenario,
          currentBalance,
        };
        return await generateForecastMutation.mutateAsync(dto);
      } else {
        return await quickForecastMutation.mutateAsync(days);
      }
    },
    [generateForecastMutation, quickForecastMutation]
  );

  const compareScenarios = useCallback(
    async (days: number, currentBalance: number = 50000) => {
      return await compareScenariosMutation.mutateAsync({ periodDays: days, currentBalance });
    },
    [compareScenariosMutation]
  );

  const acknowledgeAlert = useCallback(
    async (alertId: string) => {
      return await acknowledgeAlertMutation.mutateAsync(alertId);
    },
    [acknowledgeAlertMutation]
  );

  const getForecast = useCallback(
    (query: ForecastQueryDto) => {
      setCurrentQuery(query);
      return refetchForecast();
    },
    [refetchForecast]
  );

  return {
    // Data
    forecast,
    summary,
    scenarios: compareScenariosMutation.data,

    // Loading states
    isLoading: forecastLoading || summaryLoading || generateForecastMutation.isPending || quickForecastMutation.isPending,
    isSummaryLoading: summaryLoading,
    isForecastLoading: forecastLoading,
    isGenerating: generateForecastMutation.isPending || quickForecastMutation.isPending,
    isComparingScenarios: compareScenariosMutation.isPending,

    // Error states
    error: forecastError || summaryError || generateForecastMutation.error || quickForecastMutation.error,
    summaryError,
    forecastError,

    // Actions
    generateForecast,
    compareScenarios,
    acknowledgeAlert,
    getForecast,
    refetchForecast,

    // Utils
    currentQuery,
  };
}