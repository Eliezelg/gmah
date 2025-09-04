'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  Clock, 
  CheckCircle,
  TrendingDown,
  DollarSign,
  Users,
  Zap 
} from 'lucide-react';
import { ForecastAlertResponseDto, AlertSeverity, AlertType } from '@/types/treasury-forecast';
import { format, parseISO, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AlertsPanelProps {
  alerts: ForecastAlertResponseDto[];
  onAcknowledgeAlert?: (alertId: string) => void;
}

export function AlertsPanel({ alerts, onAcknowledgeAlert }: AlertsPanelProps) {
  const getSeverityIcon = (severity: AlertSeverity) => {
    switch (severity) {
      case AlertSeverity.URGENT:
        return <Zap className="h-4 w-4" />;
      case AlertSeverity.CRITICAL:
        return <AlertTriangle className="h-4 w-4" />;
      case AlertSeverity.WARNING:
        return <AlertCircle className="h-4 w-4" />;
      case AlertSeverity.INFO:
        return <Info className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getSeverityVariant = (severity: AlertSeverity) => {
    switch (severity) {
      case AlertSeverity.URGENT:
        return 'destructive' as const;
      case AlertSeverity.CRITICAL:
        return 'destructive' as const;
      case AlertSeverity.WARNING:
        return 'secondary' as const;
      case AlertSeverity.INFO:
        return 'outline' as const;
      default:
        return 'outline' as const;
    }
  };

  const getTypeIcon = (type: AlertType) => {
    switch (type) {
      case AlertType.LOW_CASH_FLOW:
        return <TrendingDown className="h-4 w-4" />;
      case AlertType.NEGATIVE_BALANCE:
        return <DollarSign className="h-4 w-4" />;
      case AlertType.HIGH_DEMAND:
        return <Users className="h-4 w-4" />;
      case AlertType.LIQUIDITY_WARNING:
        return <AlertTriangle className="h-4 w-4" />;
      case AlertType.PAYMENT_DELAY:
        return <Clock className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = parseISO(dateString);
      if (!isValid(date)) return 'N/A';
      return format(date, 'dd MMM yyyy à HH:mm', { locale: fr });
    } catch {
      return 'N/A';
    }
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const activeAlerts = alerts.filter(alert => alert.isActive);
  const acknowledgedAlerts = alerts.filter(alert => alert.isAcknowledged);

  if (alerts.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <div className="text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
            <h3 className="text-lg font-semibold text-green-700">Aucune alerte</h3>
            <p className="text-muted-foreground">
              Tout semble en ordre pour le moment
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertes Actives</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeAlerts.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertes Critiques</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {activeAlerts.filter(a => 
                a.severity === AlertSeverity.CRITICAL || 
                a.severity === AlertSeverity.URGENT
              ).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reconnues</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {acknowledgedAlerts.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Alertes Actives ({activeAlerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeAlerts.map((alert) => (
              <Alert
                key={alert.id}
                variant={alert.severity === AlertSeverity.URGENT || alert.severity === AlertSeverity.CRITICAL ? 'destructive' : 'default'}
              >
                <div className="flex items-start gap-3">
                  {getSeverityIcon(alert.severity)}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">{alert.title}</h4>
                      <div className="flex items-center gap-2">
                        <Badge variant={getSeverityVariant(alert.severity)}>
                          {alert.severity}
                        </Badge>
                        {getTypeIcon(alert.type)}
                      </div>
                    </div>
                    
                    <AlertDescription className="text-sm">
                      {alert.message}
                    </AlertDescription>

                    <div className="grid gap-2 text-xs text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Déclenchée:</span>
                        <span>{formatDate(alert.triggeredAt)}</span>
                      </div>
                      {alert.projectedDate && (
                        <div className="flex justify-between">
                          <span>Date projetée:</span>
                          <span>{formatDate(alert.projectedDate)}</span>
                        </div>
                      )}
                      {alert.amount && (
                        <div className="flex justify-between">
                          <span>Montant:</span>
                          <span className="font-medium">{formatCurrency(alert.amount)}</span>
                        </div>
                      )}
                      {alert.threshold && (
                        <div className="flex justify-between">
                          <span>Seuil:</span>
                          <span>{formatCurrency(alert.threshold)}</span>
                        </div>
                      )}
                    </div>

                    {alert.recommendations && alert.recommendations.length > 0 && (
                      <div className="mt-3">
                        <h5 className="text-sm font-medium mb-2">Recommandations:</h5>
                        <ul className="text-xs space-y-1">
                          {alert.recommendations.map((recommendation, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="text-blue-500 mt-0.5">•</span>
                              <span>{recommendation}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {onAcknowledgeAlert && !alert.isAcknowledged && (
                      <div className="flex justify-end pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onAcknowledgeAlert(alert.id)}
                        >
                          Reconnaître
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Acknowledged Alerts */}
      {acknowledgedAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Alertes Reconnues ({acknowledgedAlerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {acknowledgedAlerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {getSeverityIcon(alert.severity)}
                  <div>
                    <h5 className="font-medium text-sm">{alert.title}</h5>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(alert.triggeredAt)}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-green-600">
                  Reconnue
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}