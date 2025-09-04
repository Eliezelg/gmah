import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricsOverviewProps {
  metrics: any;
}

export function MetricsOverview({ metrics }: MetricsOverviewProps) {
  if (!metrics || !metrics.categories || metrics.categories.length === 0) {
    return null;
  }

  // Extract key metrics from categories
  const keyMetrics = [];
  metrics.categories.forEach((category) => {
    category.metrics.slice(0, 2).forEach((metric) => {
      keyMetrics.push({
        ...metric,
        categoryName: category.name,
      });
    });
  });

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {keyMetrics.slice(0, 4).map((metric) => (
        <Card key={metric.id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between space-x-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-muted-foreground truncate">
                  {metric.name}
                </p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold">
                    {formatMetricValue(metric.value, metric.format, metric.unit)}
                  </p>
                  {metric.trend && (
                    <div className={cn('flex items-center gap-1 text-sm', getTrendColor(metric.trend))}>
                      {getTrendIcon(metric.trend)}
                      {metric.changePercent !== undefined && (
                        <span>{Math.abs(metric.changePercent).toFixed(1)}%</span>
                      )}
                    </div>
                  )}
                </div>
                {metric.description && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {metric.description}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function formatMetricValue(value: any, format?: string, unit?: string): string {
  if (value === null || value === undefined) return '-';
  
  let formatted = value.toString();
  
  switch (format) {
    case 'currency':
      formatted = new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: unit || 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
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
  const className = "h-3 w-3";
  switch (trend) {
    case 'up':
      return <TrendingUp className={className} />;
    case 'down':
      return <TrendingDown className={className} />;
    default:
      return <Minus className={className} />;
  }
}