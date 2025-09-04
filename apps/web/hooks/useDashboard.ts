import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dashboardService } from '@/services/dashboard.service';
import { toast } from '@/components/ui/use-toast';

export interface DashboardWidget {
  widgetId: string;
  type: string;
  data: any;
  lastUpdated: Date;
  error?: string;
}

export interface DashboardConfig {
  id: string;
  name: string;
  theme: 'light' | 'dark' | 'auto';
  widgets: any[];
  preferences: {
    autoRefresh: boolean;
    refreshInterval: number;
    compactMode: boolean;
    showNotifications: boolean;
    defaultPeriod: string;
  };
  quickActions?: any[];
}

export interface DashboardMetrics {
  categories: any[];
  summary: {
    totalMetrics: number;
    lastUpdated: Date;
    nextUpdate: Date;
    dataQuality: number;
  };
}

export interface DashboardInsight {
  id: string;
  type: string;
  priority: string;
  title: string;
  description: string;
  data: any;
  actions?: any[];
}

export function useDashboard() {
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState('30d');

  // Fetch dashboard configuration
  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ['dashboard', 'config'],
    queryFn: () => dashboardService.getConfig(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch dashboard data
  const { 
    data: dashboardData,
    isLoading: dataLoading,
    error,
    refetch: refetchData,
  } = useQuery({
    queryKey: ['dashboard', 'data', period],
    queryFn: () => dashboardService.getData(period),
    staleTime: 60 * 1000, // 1 minute
    enabled: !!config,
  });

  // Update layout mutation
  const updateLayoutMutation = useMutation({
    mutationFn: (layouts: any[]) => dashboardService.updateLayout(layouts),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'config'] });
      toast({
        title: 'Layout mis à jour',
        description: 'La disposition du tableau de bord a été sauvegardée.',
      });
    },
    onError: () => {
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour la disposition.',
        variant: 'destructive',
      });
    },
  });

  // Add widget mutation
  const addWidgetMutation = useMutation({
    mutationFn: (widgetConfig: any) => dashboardService.addWidget(widgetConfig),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({
        title: 'Widget ajouté',
        description: 'Le widget a été ajouté au tableau de bord.',
      });
    },
    onError: () => {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'ajouter le widget.',
        variant: 'destructive',
      });
    },
  });

  // Remove widget mutation
  const removeWidgetMutation = useMutation({
    mutationFn: (widgetId: string) => dashboardService.removeWidget(widgetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({
        title: 'Widget supprimé',
        description: 'Le widget a été retiré du tableau de bord.',
      });
    },
    onError: () => {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le widget.',
        variant: 'destructive',
      });
    },
  });

  // Update widget mutation
  const updateWidgetMutation = useMutation({
    mutationFn: ({ widgetId, updates }: { widgetId: string; updates: any }) =>
      dashboardService.updateWidget(widgetId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: () => {
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour le widget.',
        variant: 'destructive',
      });
    },
  });

  // Export configuration
  const exportConfig = useCallback(async () => {
    try {
      const data = await dashboardService.exportConfig();
      return data;
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'exporter la configuration.',
        variant: 'destructive',
      });
      throw error;
    }
  }, []);

  // Import configuration
  const importConfig = useCallback(async (configData: any) => {
    try {
      await dashboardService.importConfig(configData);
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({
        title: 'Configuration importée',
        description: 'La configuration a été importée avec succès.',
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'importer la configuration.',
        variant: 'destructive',
      });
      throw error;
    }
  }, [queryClient]);

  // Apply template
  const applyTemplate = useCallback(async (templateId: string) => {
    try {
      await dashboardService.applyTemplate(templateId);
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({
        title: 'Modèle appliqué',
        description: 'Le modèle de tableau de bord a été appliqué.',
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'appliquer le modèle.',
        variant: 'destructive',
      });
      throw error;
    }
  }, [queryClient]);

  // Refresh data
  const refreshData = useCallback(() => {
    refetchData();
    toast({
      title: 'Actualisation',
      description: 'Les données du tableau de bord sont en cours d\'actualisation.',
    });
  }, [refetchData]);

  // Subscribe to real-time metrics
  useEffect(() => {
    if (config?.preferences.autoRefresh) {
      const subscription = dashboardService.subscribeLiveMetrics((data) => {
        // Update specific widget data in cache
        queryClient.setQueryData(['dashboard', 'data', period], (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            metrics: data.metrics,
          };
        });
      });

      return () => {
        subscription?.unsubscribe();
      };
    }
  }, [config?.preferences.autoRefresh, period, queryClient]);

  return {
    // Data
    config: config as DashboardConfig | undefined,
    widgets: dashboardData?.widgetsData as DashboardWidget[] || [],
    metrics: dashboardData?.metrics as DashboardMetrics | undefined,
    insights: dashboardData?.insights as DashboardInsight[] || [],
    statistics: dashboardData?.statistics,
    notifications: dashboardData?.notifications || [],
    activities: dashboardData?.activities || [],
    quickStats: dashboardData?.quickStats || [],
    upcomingEvents: dashboardData?.upcomingEvents || [],
    
    // State
    isLoading: configLoading || dataLoading,
    error,
    period,
    setPeriod,
    
    // Actions
    updateLayout: updateLayoutMutation.mutate,
    addWidget: addWidgetMutation.mutate,
    removeWidget: removeWidgetMutation.mutate,
    updateWidget: (widgetId: string, updates: any) =>
      updateWidgetMutation.mutate({ widgetId, updates }),
    refreshData,
    exportConfig,
    importConfig,
    applyTemplate,
  };
}