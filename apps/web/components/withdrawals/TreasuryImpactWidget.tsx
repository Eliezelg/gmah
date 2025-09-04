'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { TrendingDown, AlertTriangle, TrendingUp, DollarSign, Calendar } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';

import { WithdrawalsService, withdrawalUtils } from '@/lib/api/withdrawals';
import type { TreasuryImpact } from '@/types/withdrawal';

interface TreasuryImpactWidgetProps {
  className?: string;
  showDetails?: boolean;
}

export function TreasuryImpactWidget({ className, showDetails = true }: TreasuryImpactWidgetProps) {
  const t = useTranslations('withdrawals.treasury');
  const [impact, setImpact] = useState<TreasuryImpact | null>(null);
  const [period, setPeriod] = useState<'7' | '30' | '90'>('30');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadImpact = async () => {
      setIsLoading(true);
      try {
        const now = new Date();
        const fromDate = new Date(now);
        fromDate.setDate(now.getDate() - parseInt(period));
        
        const toDate = new Date(now);
        toDate.setDate(now.getDate() + parseInt(period));

        const impactData = await WithdrawalsService.getTreasuryImpact({
          fromDate: fromDate.toISOString(),
          toDate: toDate.toISOString(),
        });
        
        setImpact(impactData);
      } catch (error) {
        console.error('Failed to load treasury impact:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadImpact();
  }, [period]);

  const getRiskLevel = (): { level: string; color: string; percentage: number } => {
    if (!impact) return { level: 'UNKNOWN', color: 'gray', percentage: 0 };
    
    const totalImpact = Math.abs(impact.total || 0);
    
    if (totalImpact > 500000) return { level: 'CRITICAL', color: 'red', percentage: 90 };
    if (totalImpact > 200000) return { level: 'HIGH', color: 'orange', percentage: 70 };
    if (totalImpact > 50000) return { level: 'MEDIUM', color: 'yellow', percentage: 40 };
    return { level: 'LOW', color: 'green', percentage: 20 };
  };

  const getStatusBreakdown = () => {
    if (!impact) return [];
    
    return [
      {
        status: 'PENDING',
        amount: impact.PENDING || 0,
        label: t('impact.byStatus.pending'),
        color: 'yellow',
      },
      {
        status: 'APPROVED', 
        amount: impact.APPROVED || 0,
        label: t('impact.byStatus.approved'),
        color: 'green',
      },
      {
        status: 'PROCESSING',
        amount: impact.PROCESSING || 0,
        label: t('impact.byStatus.processing'),
        color: 'blue',
      },
    ].filter(item => item.amount > 0);
  };

  const getUrgencyBreakdown = () => {
    if (!impact?.byUrgency) return [];
    
    return Object.entries(impact.byUrgency).map(([urgency, amount]) => ({
      urgency,
      amount: amount as number,
      label: t(`impact.byUrgency.${urgency.toLowerCase()}` as any),
      color: withdrawalUtils.getUrgencyColor(urgency),
    })).filter(item => item.amount > 0);
  };

  const riskLevel = getRiskLevel();

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            {t('impact.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-8 bg-muted rounded w-1/2"></div>
            <div className="h-20 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            {t('impact.title')}
          </CardTitle>
          <Select value={period} onValueChange={(value) => setPeriod(value as any)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 days</SelectItem>
              <SelectItem value="30">30 days</SelectItem>
              <SelectItem value="90">90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Main Impact Summary */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm text-muted-foreground">{t('impact.projectedOutflow')}</span>
              <Badge 
                variant={riskLevel.level === 'CRITICAL' || riskLevel.level === 'HIGH' ? 'destructive' : 'secondary'}
                className="flex items-center gap-1"
              >
                <AlertTriangle className="h-3 w-3" />
                {riskLevel.level}
              </Badge>
            </div>
            <div className="text-3xl font-bold">
              {impact ? withdrawalUtils.formatAmount(Math.abs(impact.total)) : '₪0'}
            </div>
            <p className="text-sm text-muted-foreground">{t('impact.currentPeriod')}</p>
          </div>
          
          {/* Risk Meter */}
          <div className="text-right">
            <div className="text-sm text-muted-foreground mb-2">{t('impact.riskLevel')}</div>
            <div className="w-20">
              <Progress 
                value={riskLevel.percentage} 
                className="h-2"
                // You might need to customize this based on your Progress component
              />
              <div className="text-xs text-center mt-1">{riskLevel.percentage}%</div>
            </div>
          </div>
        </div>

        {showDetails && impact && (
          <>
            <Separator />
            
            {/* Status Breakdown */}
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                By Status
              </h4>
              <div className="space-y-2">
                {getStatusBreakdown().map((item) => (
                  <div key={item.status} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full bg-${item.color}-500`} />
                      <span className="text-sm">{item.label}</span>
                    </div>
                    <span className="text-sm font-medium">
                      {withdrawalUtils.formatAmount(item.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Urgency Breakdown */}
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                By Urgency
              </h4>
              <div className="space-y-2">
                {getUrgencyBreakdown().map((item) => (
                  <div key={item.urgency} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full bg-${item.color}-500`} />
                      <span className="text-sm">{item.label}</span>
                    </div>
                    <span className="text-sm font-medium">
                      {withdrawalUtils.formatAmount(item.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Recommendations */}
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                {t('impact.recommendations')}
              </h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                {riskLevel.level === 'CRITICAL' && (
                  <div className="flex items-start gap-2 p-2 bg-red-50 rounded border-l-4 border-red-500">
                    <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-red-800">Critical Impact Alert</p>
                      <p className="text-red-700">Consider deferring non-urgent withdrawals and reviewing cash flow projections.</p>
                    </div>
                  </div>
                )}
                
                {riskLevel.level === 'HIGH' && (
                  <div className="flex items-start gap-2 p-2 bg-orange-50 rounded border-l-4 border-orange-500">
                    <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-orange-800">High Impact Warning</p>
                      <p className="text-orange-700">Monitor cash flow closely and prioritize urgent requests.</p>
                    </div>
                  </div>
                )}
                
                {riskLevel.level === 'LOW' && (
                  <div className="flex items-start gap-2 p-2 bg-green-50 rounded border-l-4 border-green-500">
                    <TrendingUp className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-green-800">Healthy Cash Flow</p>
                      <p className="text-green-700">Current withdrawal levels are manageable within normal operations.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-2">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  View Forecast
                </Button>
                <Button variant="outline" size="sm" className="flex items-center gap-1">
                  <TrendingDown className="h-4 w-4" />
                  Generate Report
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}