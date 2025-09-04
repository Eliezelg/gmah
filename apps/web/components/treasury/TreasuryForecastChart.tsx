'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TreasuryForecastResponseDto, TreasuryFlowType } from '@/types/treasury-forecast';
import { format, addDays, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface TreasuryForecastChartProps {
  forecast: TreasuryForecastResponseDto;
  height?: number;
}

export function TreasuryForecastChart({ forecast, height = 400 }: TreasuryForecastChartProps) {
  // Generate chart data by processing flows over time
  const generateChartData = () => {
    const startDate = parseISO(forecast.forecastDate);
    const endDate = addDays(startDate, forecast.periodDays);
    const data: Array<{
      date: string;
      balance: number;
      inflows: number;
      outflows: number;
      netFlow: number;
      cumulativeInflows: number;
      cumulativeOutflows: number;
    }> = [];

    let currentBalance = forecast.currentBalance;
    let cumulativeInflows = 0;
    let cumulativeOutflows = 0;

    // Create daily data points
    for (let date = new Date(startDate); date <= endDate; date = addDays(date, 1)) {
      const dateStr = format(date, 'yyyy-MM-dd');
      
      // Find flows for this date
      const dailyFlows = forecast.flows.filter(flow => {
        const flowDate = format(parseISO(flow.expectedDate), 'yyyy-MM-dd');
        return flowDate === dateStr;
      });

      let dailyInflows = 0;
      let dailyOutflows = 0;

      dailyFlows.forEach(flow => {
        const adjustedAmount = flow.amount * (flow.probability / 100);
        if (flow.type === TreasuryFlowType.INFLOW) {
          dailyInflows += adjustedAmount;
          cumulativeInflows += adjustedAmount;
          currentBalance += adjustedAmount;
        } else {
          dailyOutflows += adjustedAmount;
          cumulativeOutflows += adjustedAmount;
          currentBalance -= adjustedAmount;
        }
      });

      data.push({
        date: format(date, 'dd MMM', { locale: fr }),
        balance: Math.round(currentBalance),
        inflows: Math.round(dailyInflows),
        outflows: Math.round(dailyOutflows),
        netFlow: Math.round(dailyInflows - dailyOutflows),
        cumulativeInflows: Math.round(cumulativeInflows),
        cumulativeOutflows: Math.round(cumulativeOutflows),
      });
    }

    return data;
  };

  const chartData = generateChartData();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      notation: 'compact',
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-4">
      {/* Balance Evolution Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Évolution de la Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={formatCurrency}
              />
              <Tooltip 
                formatter={(value: number) => [formatCurrency(value), '']}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Legend />
              
              {/* Critical threshold line */}
              <ReferenceLine 
                y={10000} 
                stroke="red" 
                strokeDasharray="5 5" 
                label="Seuil Critique" 
              />
              
              {/* Warning threshold line */}
              <ReferenceLine 
                y={25000} 
                stroke="orange" 
                strokeDasharray="5 5" 
                label="Seuil d'Alerte" 
              />
              
              <Area
                type="monotone"
                dataKey="balance"
                stroke="#2563eb"
                fill="#3b82f6"
                fillOpacity={0.3}
                name="Balance Projetée"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Cash Flow Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Flux de Trésorerie Quotidiens</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={formatCurrency}
              />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  formatCurrency(value), 
                  name === 'inflows' ? 'Entrées' : 
                  name === 'outflows' ? 'Sorties' : 'Flux Net'
                ]}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Legend />
              
              <Line
                type="monotone"
                dataKey="inflows"
                stroke="#10b981"
                strokeWidth={2}
                name="Entrées"
              />
              <Line
                type="monotone"
                dataKey="outflows"
                stroke="#ef4444"
                strokeWidth={2}
                name="Sorties"
              />
              <Line
                type="monotone"
                dataKey="netFlow"
                stroke="#6366f1"
                strokeWidth={3}
                name="Flux Net"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Cumulative Flows Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Flux Cumulés</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={formatCurrency}
              />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  formatCurrency(value), 
                  name === 'cumulativeInflows' ? 'Entrées Cumulées' : 'Sorties Cumulées'
                ]}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Legend />
              
              <Area
                type="monotone"
                dataKey="cumulativeInflows"
                stackId="1"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.6}
                name="Entrées Cumulées"
              />
              <Area
                type="monotone"
                dataKey="cumulativeOutflows"
                stackId="2"
                stroke="#ef4444"
                fill="#ef4444"
                fillOpacity={0.6}
                name="Sorties Cumulées"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}