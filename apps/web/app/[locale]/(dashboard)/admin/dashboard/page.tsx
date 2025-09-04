'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Responsive, WidthProvider, Layout } from 'react-grid-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useTranslations } from 'next-intl';
import {
  Settings,
  Plus,
  RefreshCw,
  Download,
  Upload,
  Grid,
  Maximize2,
  Moon,
  Sun,
  Lock,
  Unlock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { DashboardWidget } from '@/components/dashboard/DashboardWidget';
import { WidgetLibrary } from '@/components/dashboard/WidgetLibrary';
import { MetricsOverview } from '@/components/dashboard/MetricsOverview';
import { InsightsPanel } from '@/components/dashboard/InsightsPanel';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { useDashboard } from '@/hooks/useDashboard';
import { cn } from '@/lib/utils';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

export default function AdminDashboardPage() {
  const t = useTranslations('dashboard');
  const {
    config,
    widgets,
    metrics,
    insights,
    isLoading,
    error,
    updateLayout,
    addWidget,
    removeWidget,
    updateWidget,
    refreshData,
    exportConfig,
    importConfig,
    applyTemplate,
  } = useDashboard();

  const [isEditMode, setIsEditMode] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showLibrary, setShowLibrary] = useState(false);
  const [layouts, setLayouts] = useState<{ [key: string]: Layout[] }>({});
  const [currentBreakpoint, setCurrentBreakpoint] = useState('lg');
  const [compactMode, setCompactMode] = useState(false);

  useEffect(() => {
    if (config) {
      const layoutsFromWidgets = {};
      ['lg', 'md', 'sm', 'xs'].forEach((breakpoint) => {
        layoutsFromWidgets[breakpoint] = config.widgets.map((widget) => ({
          i: widget.id,
          x: widget.position.x,
          y: widget.position.y,
          w: widget.position.w,
          h: widget.position.h,
          minW: widget.position.minW || 1,
          minH: widget.position.minH || 1,
          maxW: widget.position.maxW,
          maxH: widget.position.maxH,
          static: widget.isLocked,
        }));
      });
      setLayouts(layoutsFromWidgets);
      setIsDarkMode(config.theme === 'dark');
      setAutoRefresh(config.preferences.autoRefresh);
      setCompactMode(config.preferences.compactMode);
    }
  }, [config]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        refreshData();
      }, config?.preferences.refreshInterval || 60000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, config, refreshData]);

  const handleLayoutChange = useCallback(
    (currentLayout: Layout[], layouts: { [key: string]: Layout[] }) => {
      if (!isEditMode) return;
      
      setLayouts(layouts);
      // Debounce the update to avoid too many API calls
      const timer = setTimeout(() => {
        const widgetLayouts = currentLayout.map((item) => ({
          id: item.i,
          position: {
            x: item.x,
            y: item.y,
            w: item.w,
            h: item.h,
          },
        }));
        updateLayout(widgetLayouts);
      }, 500);
      
      return () => clearTimeout(timer);
    },
    [isEditMode, updateLayout]
  );

  const handleBreakpointChange = (breakpoint: string) => {
    setCurrentBreakpoint(breakpoint);
  };

  const handleAddWidget = async (widgetType: any) => {
    await addWidget(widgetType);
    setShowLibrary(false);
  };

  const handleRemoveWidget = (widgetId: string) => {
    if (confirm(t('confirmRemoveWidget'))) {
      removeWidget(widgetId);
    }
  };

  const handleExport = async () => {
    const configData = await exportConfig();
    const blob = new Blob([JSON.stringify(configData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-config-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (file) {
        const text = await file.text();
        const configData = JSON.parse(text);
        await importConfig(configData);
      }
    };
    input.click();
  };

  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
    if (!isEditMode) {
      // Entering edit mode
      const updatedLayouts = { ...layouts };
      Object.keys(updatedLayouts).forEach((breakpoint) => {
        updatedLayouts[breakpoint] = updatedLayouts[breakpoint].map((item) => ({
          ...item,
          static: false,
        }));
      });
      setLayouts(updatedLayouts);
    } else {
      // Exiting edit mode
      const updatedLayouts = { ...layouts };
      Object.keys(updatedLayouts).forEach((breakpoint) => {
        updatedLayouts[breakpoint] = updatedLayouts[breakpoint].map((item) => {
          const widget = config?.widgets.find((w) => w.id === item.i);
          return {
            ...item,
            static: widget?.isLocked || false,
          };
        });
      });
      setLayouts(updatedLayouts);
    }
  };

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-destructive">{t('errorLoadingDashboard')}</p>
            <Button onClick={refreshData} className="mt-4">
              {t('retry')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn('min-h-screen', isDarkMode && 'dark')}>
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{t('title')}</h1>
              <p className="text-muted-foreground">{t('subtitle')}</p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Quick Actions */}
              <QuickActions actions={config?.quickActions || []} />
              
              {/* Settings */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={refreshData}
                  disabled={isLoading}
                  title={t('refresh')}
                >
                  <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
                </Button>
                
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowLibrary(!showLibrary)}
                  title={t('addWidget')}
                >
                  <Plus className="h-4 w-4" />
                </Button>
                
                <Button
                  variant={isEditMode ? 'default' : 'outline'}
                  size="icon"
                  onClick={toggleEditMode}
                  title={t(isEditMode ? 'saveLayout' : 'editLayout')}
                >
                  {isEditMode ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                </Button>
                
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleExport}
                  title={t('exportConfig')}
                >
                  <Download className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleImport}
                  title={t('importConfig')}
                >
                  <Upload className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  title={t(isDarkMode ? 'lightMode' : 'darkMode')}
                >
                  {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
          
          {/* Status Bar */}
          <div className="flex items-center gap-4 mt-4 text-sm">
            <Badge variant="outline">
              {t('breakpoint')}: {currentBreakpoint.toUpperCase()}
            </Badge>
            <Badge variant={isEditMode ? 'default' : 'secondary'}>
              {t(isEditMode ? 'editMode' : 'viewMode')}
            </Badge>
            <div className="flex items-center gap-2">
              <Switch
                id="auto-refresh"
                checked={autoRefresh}
                onCheckedChange={setAutoRefresh}
              />
              <Label htmlFor="auto-refresh" className="text-sm">
                {t('autoRefresh')}
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="compact-mode"
                checked={compactMode}
                onCheckedChange={setCompactMode}
              />
              <Label htmlFor="compact-mode" className="text-sm">
                {t('compactMode')}
              </Label>
            </div>
          </div>
        </div>
      </div>

      {/* Widget Library Modal */}
      {showLibrary && (
        <WidgetLibrary
          onSelect={handleAddWidget}
          onClose={() => setShowLibrary(false)}
        />
      )}

      {/* Metrics Overview */}
      {metrics && (
        <div className="container mx-auto px-4 py-4">
          <MetricsOverview metrics={metrics} />
        </div>
      )}

      {/* Insights Panel */}
      {insights && insights.length > 0 && (
        <div className="container mx-auto px-4 pb-4">
          <InsightsPanel insights={insights} />
        </div>
      )}

      {/* Dashboard Grid */}
      <div className="container mx-auto px-4 pb-8">
        {config && widgets && (
          <ResponsiveGridLayout
            className="layout"
            layouts={layouts}
            onLayoutChange={handleLayoutChange}
            onBreakpointChange={handleBreakpointChange}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}
            cols={{ lg: 12, md: 10, sm: 6, xs: 4 }}
            rowHeight={60}
            isDraggable={isEditMode}
            isResizable={isEditMode}
            compactType={compactMode ? 'vertical' : null}
            preventCollision={!compactMode}
            margin={[16, 16]}
          >
            {config.widgets.map((widget) => (
              <div key={widget.id} className={cn(widget.isCollapsed && 'collapsed-widget')}>
                <DashboardWidget
                  widget={widget}
                  data={widgets.find((w) => w.widgetId === widget.id)?.data}
                  isEditMode={isEditMode}
                  onRemove={() => handleRemoveWidget(widget.id)}
                  onUpdate={(updates) => updateWidget(widget.id, updates)}
                  onRefresh={() => refreshData()}
                  isDarkMode={isDarkMode}
                  compactMode={compactMode}
                />
              </div>
            ))}
          </ResponsiveGridLayout>
        )}
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-background/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <Card>
            <CardContent className="flex items-center gap-3 p-6">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>{t('loading')}</span>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}