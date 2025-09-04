import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Info, AlertTriangle, TrendingUp, Lightbulb } from 'lucide-react';

interface InsightsPanelProps {
  insights: any[];
}

export function InsightsPanel({ insights }: InsightsPanelProps) {
  const topInsights = insights.slice(0, 3);

  return (
    <div className="space-y-3">
      {topInsights.map((insight) => (
        <Alert key={insight.id} className={getInsightVariant(insight.priority)}>
          <div className="flex items-start gap-3">
            {getInsightIcon(insight.type)}
            <div className="flex-1">
              <AlertTitle className="flex items-center gap-2">
                {insight.title}
                <Badge variant={getBadgeVariant(insight.priority)}>
                  {getPriorityLabel(insight.priority)}
                </Badge>
              </AlertTitle>
              <AlertDescription className="mt-2">
                {insight.description}
                {insight.actions && insight.actions.length > 0 && (
                  <div className="flex gap-2 mt-3">
                    {insight.actions.slice(0, 2).map((action) => (
                      <Button
                        key={action.id}
                        variant={action.type === 'primary' ? 'default' : 'outline'}
                        size="sm"
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>
                )}
              </AlertDescription>
            </div>
          </div>
        </Alert>
      ))}
    </div>
  );
}

function getInsightVariant(priority: string): string {
  switch (priority) {
    case 'CRITICAL':
    case 'HIGH':
      return 'destructive';
    case 'MEDIUM':
      return 'default';
    default:
      return 'default';
  }
}

function getInsightIcon(type: string) {
  const className = "h-4 w-4";
  switch (type) {
    case 'WARNING':
    case 'RISK':
      return <AlertTriangle className={className} />;
    case 'ANOMALY':
      return <AlertCircle className={className} />;
    case 'OPPORTUNITY':
    case 'TREND':
      return <TrendingUp className={className} />;
    case 'RECOMMENDATION':
      return <Lightbulb className={className} />;
    default:
      return <Info className={className} />;
  }
}

function getBadgeVariant(priority: string): "default" | "secondary" | "destructive" | "outline" {
  switch (priority) {
    case 'CRITICAL':
    case 'HIGH':
      return 'destructive';
    case 'MEDIUM':
      return 'secondary';
    default:
      return 'outline';
  }
}

function getPriorityLabel(priority: string): string {
  switch (priority) {
    case 'CRITICAL':
      return 'Critique';
    case 'HIGH':
      return 'Élevé';
    case 'MEDIUM':
      return 'Moyen';
    case 'LOW':
      return 'Faible';
    default:
      return priority;
  }
}