import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreVertical,
  RefreshCw,
  Maximize2,
  Minimize2,
  Settings,
  Trash2,
  ChevronUp,
  ChevronDown,
  Lock,
  Unlock,
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MetricWidget } from './widgets/MetricWidget';
import { ChartWidget } from './widgets/ChartWidget';
import {
  TableWidget,
  ListWidget,
  CalendarWidget,
  GaugeWidget,
  ProgressWidget,
  AlertWidget,
  HeatmapWidget,
  TimelineWidget,
} from './widgets';

interface DashboardWidgetProps {
  widget: any;
  data: any;
  isEditMode: boolean;
  onRemove: () => void;
  onUpdate: (updates: any) => void;
  onRefresh: () => void;
  isDarkMode: boolean;
  compactMode: boolean;
}

export function DashboardWidget({
  widget,
  data,
  isEditMode,
  onRemove,
  onUpdate,
  onRefresh,
  isDarkMode,
  compactMode,
}: DashboardWidgetProps) {
  const [isCollapsed, setIsCollapsed] = useState(widget.isCollapsed || false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleExport = () => {
    // Export widget data as JSON
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${widget.id}-data-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleCollapse = () => {
    const collapsed = !isCollapsed;
    setIsCollapsed(collapsed);
    onUpdate({ isCollapsed: collapsed });
  };

  const toggleLock = () => {
    onUpdate({ isLocked: !widget.isLocked });
  };

  const renderWidget = () => {
    const props = {
      data,
      config: widget,
      isDarkMode,
      compactMode,
    };

    switch (widget.type) {
      case 'METRIC':
        return <MetricWidget {...props} />;
      case 'CHART':
        return <ChartWidget {...props} />;
      case 'TABLE':
        return <TableWidget {...props} />;
      case 'LIST':
        return <ListWidget {...props} />;
      case 'CALENDAR':
        return <CalendarWidget {...props} />;
      case 'GAUGE':
        return <GaugeWidget {...props} />;
      case 'PROGRESS':
        return <ProgressWidget {...props} />;
      case 'ALERT':
        return <AlertWidget {...props} />;
      case 'HEATMAP':
        return <HeatmapWidget {...props} />;
      case 'TIMELINE':
        return <TimelineWidget {...props} />;
      case 'CUSTOM':
        // For custom widgets, dynamically import the component
        return (
          <div className="p-4 text-center text-muted-foreground">
            Custom Widget: {widget.customComponent}
          </div>
        );
      default:
        return (
          <div className="p-4 text-center text-muted-foreground">
            Unknown widget type: {widget.type}
          </div>
        );
    }
  };

  return (
    <Card
      className={cn(
        'h-full overflow-hidden transition-all',
        isFullscreen && 'fixed inset-4 z-50',
        widget.isLocked && !isEditMode && 'cursor-default',
        isEditMode && 'cursor-move border-primary',
        isDarkMode && 'dark'
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          {widget.icon && (
            <span className="text-muted-foreground">
              {/* Dynamic icon component would go here */}
            </span>
          )}
          <div>
            <CardTitle className="text-base font-medium">
              {widget.title}
            </CardTitle>
            {widget.subtitle && !compactMode && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {widget.subtitle}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          {widget.interactionConfig?.refreshable !== false && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={toggleCollapse}
          >
            {isCollapsed ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {widget.interactionConfig?.fullscreenable !== false && (
                <DropdownMenuItem onClick={() => setIsFullscreen(!isFullscreen)}>
                  {isFullscreen ? (
                    <>
                      <Minimize2 className="mr-2 h-4 w-4" />
                      Réduire
                    </>
                  ) : (
                    <>
                      <Maximize2 className="mr-2 h-4 w-4" />
                      Plein écran
                    </>
                  )}
                </DropdownMenuItem>
              )}
              
              {widget.interactionConfig?.exportable !== false && (
                <DropdownMenuItem onClick={handleExport}>
                  <Download className="mr-2 h-4 w-4" />
                  Exporter
                </DropdownMenuItem>
              )}
              
              {isEditMode && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={toggleLock}>
                    {widget.isLocked ? (
                      <>
                        <Unlock className="mr-2 h-4 w-4" />
                        Déverrouiller
                      </>
                    ) : (
                      <>
                        <Lock className="mr-2 h-4 w-4" />
                        Verrouiller
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {/* Open settings modal */}}>
                    <Settings className="mr-2 h-4 w-4" />
                    Paramètres
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={onRemove}
                    className="text-destructive"
                    disabled={widget.isLocked}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Supprimer
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      {!isCollapsed && (
        <CardContent className={cn('p-4', compactMode && 'p-2')}>
          {data ? (
            renderWidget()
          ) : (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              <RefreshCw className="h-6 w-6 animate-spin" />
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}