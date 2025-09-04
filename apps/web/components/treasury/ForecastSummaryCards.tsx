'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  AlertTriangle, 
  Clock, 
  BarChart3,
  Calendar,
  AlertCircle 
} from 'lucide-react';
import { ForecastSummaryDto } from '@/types/treasury-forecast';
import { format, parseISO, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ForecastSummaryCardsProps {
  summary: ForecastSummaryDto;
}

export function ForecastSummaryCards({ summary }: ForecastSummaryCardsProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = parseISO(dateString);
      if (!isValid(date)) return 'N/A';
      return format(date, 'dd MMM yyyy', { locale: fr });
    } catch {
      return 'N/A';
    }
  };

  const getRiskLevel = (risk: number) => {
    if (risk >= 75) return { level: 'Élevé', variant: 'destructive' as const, color: 'text-red-600' };
    if (risk >= 50) return { level: 'Moyen', variant: 'secondary' as const, color: 'text-orange-600' };
    if (risk >= 25) return { level: 'Faible', variant: 'outline' as const, color: 'text-yellow-600' };
    return { level: 'Très Faible', variant: 'default' as const, color: 'text-green-600' };
  };

  const riskInfo = getRiskLevel(summary.averageLiquidityRisk);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
      {/* Total Forecasts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Prévisions Total</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.totalForecasts}</div>
          <p className="text-xs text-muted-foreground">
            Historique complet
          </p>
        </CardContent>
      </Card>

      {/* Active Alerts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Alertes Actives</CardTitle>
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.activeAlerts}</div>
          <p className="text-xs text-muted-foreground">
            Nécessitent attention
          </p>
        </CardContent>
      </Card>

      {/* Critical Alerts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Alertes Critiques</CardTitle>
          <AlertTriangle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            {summary.criticalAlerts}
          </div>
          <Badge variant="destructive" className="text-xs">
            Action urgente
          </Badge>
        </CardContent>
      </Card>

      {/* Average Liquidity Risk */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Risque Moyen</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${riskInfo.color}`}>
            {Math.round(summary.averageLiquidityRisk)}%
          </div>
          <Badge variant={riskInfo.variant} className="text-xs">
            {riskInfo.level}
          </Badge>
        </CardContent>
      </Card>

      {/* Last Forecast Date */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Dernière Prévision</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-sm font-bold">
            {formatDate(summary.lastForecastDate)}
          </div>
          <p className="text-xs text-muted-foreground">
            Dernière mise à jour
          </p>
        </CardContent>
      </Card>

      {/* Next Critical Date */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Prochaine Échéance</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-sm font-bold">
            {formatDate(summary.nextCriticalDate)}
          </div>
          <p className="text-xs text-muted-foreground">
            {summary.nextCriticalDate ? 'Date critique' : 'Aucune prévue'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}