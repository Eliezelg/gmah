import api from '@/lib/api';

export interface DashboardData {
  config: any;
  statistics: any;
  widgetsData: any[];
  metrics: any;
  insights: any[];
  notifications: any[];
  activities: any[];
  quickStats: any[];
  upcomingEvents: any[];
}

class DashboardService {
  async getConfig() {
    const response = await api.get('/dashboard/config');
    return response.data;
  }

  async getData(period: string = '30d', refresh: boolean = false) {
    const response = await api.get<DashboardData>('/dashboard/data', {
      params: { period, refresh },
    });
    return response.data;
  }

  async updateLayout(layouts: any[]) {
    const response = await api.put('/dashboard/config', {
      widgets: layouts,
    });
    return response.data;
  }

  async addWidget(widgetConfig: any) {
    const response = await api.post('/dashboard/widgets', widgetConfig);
    return response.data;
  }

  async removeWidget(widgetId: string) {
    const response = await api.delete(`/dashboard/widgets/${widgetId}`);
    return response.data;
  }

  async updateWidget(widgetId: string, updates: any) {
    const response = await api.put(`/dashboard/widgets/${widgetId}`, updates);
    return response.data;
  }

  async getWidgetData(widgetId: string, options?: any) {
    const response = await api.get(`/dashboard/widgets/${widgetId}/data`, {
      params: options,
    });
    return response.data;
  }

  async refreshWidget(widgetId: string) {
    const response = await api.post(`/dashboard/widgets/${widgetId}/refresh`);
    return response.data;
  }

  async getAvailableWidgets() {
    const response = await api.get('/dashboard/widgets');
    return response.data;
  }

  async getTemplates() {
    const response = await api.get('/dashboard/templates');
    return response.data;
  }

  async applyTemplate(templateId: string) {
    const response = await api.post(`/dashboard/templates/${templateId}/apply`);
    return response.data;
  }

  async exportConfig() {
    const response = await api.post('/dashboard/export');
    return response.data;
  }

  async importConfig(config: any) {
    const response = await api.post('/dashboard/import', config);
    return response.data;
  }

  async getMetrics(category?: string, period?: string) {
    const response = await api.get('/dashboard/metrics', {
      params: { category, period },
    });
    return response.data;
  }

  async getInsights(type?: string, priority?: string) {
    const response = await api.get('/dashboard/insights', {
      params: { type, priority },
    });
    return response.data;
  }

  async dismissInsight(insightId: string) {
    const response = await api.post(`/dashboard/insights/${insightId}/dismiss`);
    return response.data;
  }

  async getInsightActions(insightId: string) {
    const response = await api.get(`/dashboard/insights/${insightId}/actions`);
    return response.data;
  }

  async getQuickActions() {
    const response = await api.get('/dashboard/quick-actions');
    return response.data;
  }

  async executeQuickAction(actionId: string, params?: any) {
    const response = await api.post(`/dashboard/quick-actions/${actionId}/execute`, params);
    return response.data;
  }

  subscribeLiveMetrics(onData: (data: any) => void) {
    // In a real implementation, this would use WebSocket or SSE
    // For now, return a mock subscription
    const interval = setInterval(async () => {
      try {
        const response = await api.get('/dashboard/metrics/live');
        onData(response.data);
      } catch (error) {
        console.error('Error fetching live metrics:', error);
      }
    }, 5000);

    return {
      unsubscribe: () => clearInterval(interval),
    };
  }
}

export const dashboardService = new DashboardService();