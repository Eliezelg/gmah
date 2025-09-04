'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  RotateCcw, 
  Settings, 
  Calendar,
  TrendingUp,
  Loader2 
} from 'lucide-react';
import { ForecastScenario } from '@/types/treasury-forecast';

interface ForecastControlsProps {
  period: number;
  scenario: ForecastScenario;
  onPeriodChange: (period: number) => void;
  onScenarioChange: (scenario: ForecastScenario) => void;
  onGenerate: () => void;
  isLoading?: boolean;
}

export function ForecastControls({
  period,
  scenario,
  onPeriodChange,
  onScenarioChange,
  onGenerate,
  isLoading = false,
}: ForecastControlsProps) {
  const scenarioLabels = {
    [ForecastScenario.OPTIMISTIC]: 'Optimiste',
    [ForecastScenario.REALISTIC]: 'Réaliste',
    [ForecastScenario.PESSIMISTIC]: 'Pessimiste',
  };

  const scenarioDescriptions = {
    [ForecastScenario.OPTIMISTIC]: 'Conditions favorables, probabilités élevées',
    [ForecastScenario.REALISTIC]: 'Conditions normales, probabilités moyennes',
    [ForecastScenario.PESSIMISTIC]: 'Conditions difficiles, probabilités réduites',
  };

  const scenarioColors = {
    [ForecastScenario.OPTIMISTIC]: 'text-green-600',
    [ForecastScenario.REALISTIC]: 'text-blue-600',
    [ForecastScenario.PESSIMISTIC]: 'text-orange-600',
  };

  const periodOptions = [
    { value: 15, label: '15 jours', description: 'Court terme' },
    { value: 30, label: '30 jours', description: '1 mois' },
    { value: 60, label: '60 jours', description: '2 mois' },
    { value: 90, label: '90 jours', description: '3 mois' },
    { value: 180, label: '180 jours', description: '6 mois' },
    { value: 365, label: '365 jours', description: '1 an' },
  ];

  const handleReset = () => {
    onPeriodChange(30);
    onScenarioChange(ForecastScenario.REALISTIC);
  };

  const getRecommendedPeriod = () => {
    if (period <= 30) return 'Idéal pour le suivi opérationnel quotidien';
    if (period <= 90) return 'Parfait pour la planification trimestrielle';
    if (period <= 180) return 'Recommandé pour la stratégie semestrielle';
    return 'Utile pour la planification annuelle';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Paramètres de Prévision
          </CardTitle>
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Réinitialiser
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Period Selection */}
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Période de Prévision
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Durée de la prévision en jours
              </p>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{period} jours</span>
                <Badge variant="outline">
                  {periodOptions.find(opt => opt.value === period)?.description || 'Personnalisé'}
                </Badge>
              </div>
              
              <Slider
                value={[period]}
                onValueChange={(value) => onPeriodChange(value[0])}
                max={365}
                min={7}
                step={1}
                className="w-full"
              />
              
              <div className="grid grid-cols-3 gap-2">
                {periodOptions.slice(0, 6).map((option) => (
                  <Button
                    key={option.value}
                    variant={period === option.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onPeriodChange(option.value)}
                    className="text-xs"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
              
              <p className="text-xs text-muted-foreground">
                {getRecommendedPeriod()}
              </p>
            </div>
          </div>

          {/* Scenario Selection */}
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Scénario de Prévision
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Hypothèses pour les calculs
              </p>
            </div>
            
            <Select
              value={scenario}
              onValueChange={(value) => onScenarioChange(value as ForecastScenario)}
            >
              <SelectTrigger>
                <SelectValue>
                  <div className="flex items-center gap-2">
                    <span className={scenarioColors[scenario]}>●</span>
                    {scenarioLabels[scenario]}
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(scenarioLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <span className={scenarioColors[key as ForecastScenario]}>●</span>
                      <div>
                        <div>{label}</div>
                        <div className="text-xs text-muted-foreground">
                          {scenarioDescriptions[key as ForecastScenario]}
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="p-3 bg-muted/50 rounded-lg">
              <h4 className="text-sm font-medium mb-2">Scénario Actuel</h4>
              <p className="text-xs text-muted-foreground">
                {scenarioDescriptions[scenario]}
              </p>
              <div className="flex items-center gap-1 mt-2">
                <span className={`text-sm font-medium ${scenarioColors[scenario]}`}>
                  {scenarioLabels[scenario]}
                </span>
                <span className={scenarioColors[scenario]}>●</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Actions Rapides</Label>
          <div className="grid gap-2 md:grid-cols-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onPeriodChange(30);
                onScenarioChange(ForecastScenario.REALISTIC);
                onGenerate();
              }}
              disabled={isLoading}
            >
              Prévision Standard
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onPeriodChange(90);
                onScenarioChange(ForecastScenario.PESSIMISTIC);
                onGenerate();
              }}
              disabled={isLoading}
            >
              Analyse de Risque
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onPeriodChange(180);
                onScenarioChange(ForecastScenario.OPTIMISTIC);
                onGenerate();
              }}
              disabled={isLoading}
            >
              Projection Long Terme
            </Button>
            <Button
              onClick={onGenerate}
              disabled={isLoading}
              className="font-medium"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Calcul...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Générer
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Current Configuration Summary */}
        <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div>
            <div>
              <p className="text-sm font-medium">Configuration Actuelle</p>
              <p className="text-xs text-muted-foreground">
                {period} jours • {scenarioLabels[scenario]}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="bg-white dark:bg-gray-900">
            Prêt
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}