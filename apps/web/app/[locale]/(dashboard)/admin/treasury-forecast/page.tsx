'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, TrendingUp, TrendingDown, AlertTriangle, Info } from 'lucide-react';
import { TreasuryForecastChart } from '@/components/treasury/TreasuryForecastChart';
import { ForecastSummaryCards } from '@/components/treasury/ForecastSummaryCards';
import { AlertsPanel } from '@/components/treasury/AlertsPanel';
import { CashFlowTable } from '@/components/treasury/CashFlowTable';
import { ForecastControls } from '@/components/treasury/ForecastControls';
import { useTreasuryForecast } from '@/hooks/useTreasuryForecast';
import { TreasuryForecastResponseDto, ForecastSummaryDto } from '@/types/treasury-forecast';

export default function TreasuryForecastPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [forecastPeriod, setForecastPeriod] = useState(30);
  const [scenario, setScenario] = useState<'REALISTIC' | 'OPTIMISTIC' | 'PESSIMISTIC'>('REALISTIC');
  
  const {
    forecast,
    summary,
    isLoading,
    error,
    generateForecast,
    compareScenarios,
  } = useTreasuryForecast();

  useEffect(() => {
    // Load initial data
    generateForecast(forecastPeriod, scenario);
  }, []);

  const handleGenerateForecast = () => {
    generateForecast(forecastPeriod, scenario);
  };

  const handleCompareScenarios = () => {
    compareScenarios(forecastPeriod);
  };

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Erreur lors du chargement des prévisions: {error.message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Prévisions de Trésorerie</h1>
          <p className="text-muted-foreground">
            Analyse prévisionnelle des flux de trésorerie et gestion des risques
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleCompareScenarios}
            disabled={isLoading}
          >
            Comparer Scénarios
          </Button>
          <Button 
            onClick={handleGenerateForecast}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Générer Prévision
          </Button>
        </div>
      </div>

      {/* Controls */}
      <ForecastControls
        period={forecastPeriod}
        scenario={scenario}
        onPeriodChange={setForecastPeriod}
        onScenarioChange={setScenario}
        onGenerate={handleGenerateForecast}
        isLoading={isLoading}
      />

      {/* Summary Cards */}
      {summary && <ForecastSummaryCards summary={summary} />}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="forecast">Prévisions</TabsTrigger>
          <TabsTrigger value="alerts">Alertes</TabsTrigger>
          <TabsTrigger value="flows">Flux de trésorerie</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {forecast ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Balance Actuelle */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Balance Actuelle</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {new Intl.NumberFormat('fr-FR', { 
                      style: 'currency', 
                      currency: 'EUR' 
                    }).format(Number(forecast.currentBalance))}
                  </div>
                </CardContent>
              </Card>

              {/* Balance Projetée */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Balance Projetée</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {new Intl.NumberFormat('fr-FR', { 
                      style: 'currency', 
                      currency: 'EUR' 
                    }).format(Number(forecast.projectedBalance))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    à {forecastPeriod} jours
                  </p>
                </CardContent>
              </Card>

              {/* Risque de Liquidité */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Risque de Liquidité</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {Math.round(forecast.liquidityRisk)}%
                  </div>
                  <Badge 
                    variant={forecast.liquidityRisk > 75 ? "destructive" : 
                            forecast.liquidityRisk > 50 ? "secondary" : "default"}
                  >
                    {forecast.liquidityRisk > 75 ? "Élevé" : 
                     forecast.liquidityRisk > 50 ? "Moyen" : "Faible"}
                  </Badge>
                </CardContent>
              </Card>

              {/* Flux Net */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Flux Net Projeté</CardTitle>
                  {Number(forecast.netCashFlow) >= 0 ? 
                    <TrendingUp className="h-4 w-4 text-green-600" /> :
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  }
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${Number(forecast.netCashFlow) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {new Intl.NumberFormat('fr-FR', { 
                      style: 'currency', 
                      currency: 'EUR' 
                    }).format(Number(forecast.netCashFlow))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex items-center justify-center h-48">
              <div className="text-center">
                <Info className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Générez une prévision pour voir les données
                </p>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="forecast" className="space-y-4">
          {forecast ? (
            <TreasuryForecastChart forecast={forecast} />
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-48">
                <div className="text-center">
                  <Info className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Aucune prévision disponible. Générez une prévision pour voir le graphique.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          {forecast?.alerts ? (
            <AlertsPanel alerts={forecast.alerts} />
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-48">
                <div className="text-center">
                  <Info className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Aucune alerte disponible
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="flows" className="space-y-4">
          {forecast?.flows ? (
            <CashFlowTable flows={forecast.flows} />
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-48">
                <div className="text-center">
                  <Info className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Aucun flux de trésorerie disponible
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}