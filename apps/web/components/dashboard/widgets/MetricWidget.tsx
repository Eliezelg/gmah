import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricWidgetProps {
  data: any;
  config: any;
  isDarkMode: boolean;
  compactMode: boolean;
}

export function MetricWidget({ data, config, compactMode }: MetricWidgetProps) {
  if (typeof data === 'number' || typeof data === 'string') {
    // Simple metric
    return (
      <div className="text-center">
        <div className={cn('font-bold', compactMode ? 'text-2xl' : 'text-3xl')}>
          {formatValue(data, config.dataConfig?.format)}
        </div>
        {config.description && !compactMode && (
          <p className="text-sm text-muted-foreground mt-1">
            {config.description}
          </p>
        )}
      </div>
    );
  }

  // Complex metric with trend
  const { value, previousValue, change, changePercent, trend, unit } = data;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <div className={cn('font-bold', compactMode ? 'text-2xl' : 'text-3xl')}>
          {formatValue(value, config.dataConfig?.format, unit)}
        </div>
        {trend && (
          <div className={cn('flex items-center gap-1', getTrendColor(trend))}>
            {getTrendIcon(trend)}
            {changePercent !== undefined && (
              <span className="text-sm font-medium">
                {Math.abs(changePercent).toFixed(1)}%
              </span>
            )}
          </div>
        )}
      </div>
      
      {previousValue !== undefined && !compactMode && (
        <div className="text-sm text-muted-foreground">
          Précédent: {formatValue(previousValue, config.dataConfig?.format, unit)}
        </div>
      )}
      
      {change !== undefined && !compactMode && (
        <div className={cn('text-sm', getTrendColor(trend))}>
          {change > 0 ? '+' : ''}{formatValue(change, config.dataConfig?.format, unit)}
        </div>
      )}
    </div>
  );
}

function formatValue(value: any, format?: string, unit?: string): string {
  if (value === null || value === undefined) return '-';
  
  let formatted = value.toString();
  
  switch (format) {
    case 'currency':
      formatted = new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: unit || 'EUR',
      }).format(Number(value));
      break;
    case 'percent':
      formatted = `${Number(value).toFixed(1)}%`;
      break;
    case 'number':
      formatted = new Intl.NumberFormat('fr-FR').format(Number(value));
      if (unit) formatted += ` ${unit}`;
      break;
    default:
      if (unit) formatted += ` ${unit}`;
  }
  
  return formatted;
}

function getTrendColor(trend: string): string {
  switch (trend) {
    case 'up':
      return 'text-green-600';
    case 'down':
      return 'text-red-600';
    default:
      return 'text-muted-foreground';
  }
}

function getTrendIcon(trend: string) {
  switch (trend) {
    case 'up':
      return <TrendingUp className="h-4 w-4" />;
    case 'down':
      return <TrendingDown className="h-4 w-4" />;
    default:
      return <Minus className="h-4 w-4" />;
  }
}