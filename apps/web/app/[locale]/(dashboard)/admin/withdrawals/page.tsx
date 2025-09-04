'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { 
  Settings, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Filter,
  Download,
  BarChart3,
  Users,
  RefreshCw,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/use-toast';

import { WithdrawalsList } from '@/components/withdrawals/WithdrawalsList';
import { WithdrawalsService, withdrawalUtils } from '@/lib/api/withdrawals';
import type { WithdrawalRequest, TreasuryImpact, WithdrawalStats } from '@/types/withdrawal';

export default function AdminWithdrawalsPage() {
  const t = useTranslations('withdrawals');
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [stats, setStats] = useState<WithdrawalStats | null>(null);
  const [treasuryImpact, setTreasuryImpact] = useState<TreasuryImpact | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [allWithdrawals, impactData] = await Promise.all([
          WithdrawalsService.getAll({ limit: 1000 }),
          WithdrawalsService.getTreasuryImpact()
        ]);
        
        // Calculate stats
        const totalRequests = allWithdrawals.total;
        const pendingApproval = allWithdrawals.data.filter(w => 
          w.status === 'PENDING' || w.status === 'UNDER_REVIEW'
        ).length;
        const approved = allWithdrawals.data.filter(w => w.status === 'APPROVED').length;
        const completed = allWithdrawals.data.filter(w => w.status === 'COMPLETED').length;
        const totalAmount = allWithdrawals.data.reduce((sum, w) => sum + w.amount, 0);
        
        // Calculate average processing time (mock data for now)
        const avgProcessingTime = 2.5; // days

        setStats({
          totalRequests,
          pendingApproval,
          approved,
          completed,
          totalAmount,
          avgProcessingTime,
        });

        setTreasuryImpact(impactData);
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    };

    loadData();
  }, [refreshTrigger]);

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleApprove = async (withdrawal: WithdrawalRequest) => {
    setSelectedWithdrawal(withdrawal);
    setShowApprovalDialog(true);
  };

  const handleReject = async (withdrawal: WithdrawalRequest) => {
    setSelectedWithdrawal(withdrawal);
    setShowRejectionDialog(true);
  };

  const confirmApproval = async (comments?: string) => {
    if (!selectedWithdrawal) return;
    
    setIsLoading(true);
    try {
      await WithdrawalsService.approve(selectedWithdrawal.id, {
        approvalComments: comments,
      });
      
      toast({
        title: t('messages.requestApproved'),
        description: `Request ${selectedWithdrawal.requestNumber} has been approved.`,
      });
      
      setShowApprovalDialog(false);
      setRefreshTrigger(prev => prev + 1);
    } catch (error: any) {
      toast({
        title: t('errors.approvalFailed'),
        description: error.response?.data?.message || 'Failed to approve request',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const confirmRejection = async (reason: string) => {
    if (!selectedWithdrawal) return;
    
    setIsLoading(true);
    try {
      await WithdrawalsService.reject(selectedWithdrawal.id, {
        rejectionReason: reason,
      });
      
      toast({
        title: t('messages.requestRejected'),
        description: `Request ${selectedWithdrawal.requestNumber} has been rejected.`,
      });
      
      setShowRejectionDialog(false);
      setRefreshTrigger(prev => prev + 1);
    } catch (error: any) {
      toast({
        title: t('errors.rejectionFailed'),
        description: error.response?.data?.message || 'Failed to reject request',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getRiskLevel = (impact: TreasuryImpact): { level: string; color: string } => {
    const totalImpact = Math.abs(impact.total || 0);
    
    if (totalImpact > 100000) return { level: 'HIGH', color: 'red' };
    if (totalImpact > 50000) return { level: 'MEDIUM', color: 'orange' };
    return { level: 'LOW', color: 'green' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t('admin.title')}</h1>
          <p className="text-muted-foreground">Manage and approve withdrawal requests</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" onClick={() => setShowSettingsDialog(true)}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRequests}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pendingApproval}</div>
              <p className="text-xs text-muted-foreground">Needs attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
              <p className="text-xs text-muted-foreground">Ready to process</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {withdrawalUtils.formatAmount(stats.totalAmount)}
              </div>
              <p className="text-xs text-muted-foreground">Total requested</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Processing</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgProcessingTime}d</div>
              <p className="text-xs text-muted-foreground">Processing time</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Treasury Impact Card */}
      {treasuryImpact && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              {t('treasury.impact.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium">Risk Level</span>
                  <Badge 
                    variant={getRiskLevel(treasuryImpact).level === 'HIGH' ? 'destructive' : 'secondary'}
                    className="flex items-center gap-1"
                  >
                    <AlertTriangle className="h-3 w-3" />
                    {getRiskLevel(treasuryImpact).level}
                  </Badge>
                </div>
                <div className="text-2xl font-bold">
                  {withdrawalUtils.formatAmount(Math.abs(treasuryImpact.total))}
                </div>
                <p className="text-xs text-muted-foreground">Total projected outflow</p>
              </div>

              <div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Pending:</span>
                    <span>{withdrawalUtils.formatAmount(treasuryImpact.PENDING || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Approved:</span>
                    <span>{withdrawalUtils.formatAmount(treasuryImpact.APPROVED || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Processing:</span>
                    <span>{withdrawalUtils.formatAmount(treasuryImpact.PROCESSING || 0)}</span>
                  </div>
                </div>
              </div>

              <div>
                <div className="space-y-2">
                  {treasuryImpact.byUrgency && Object.entries(treasuryImpact.byUrgency).map(([urgency, amount]) => (
                    <div key={urgency} className="flex justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div 
                          className={`w-2 h-2 rounded-full bg-${withdrawalUtils.getUrgencyColor(urgency)}-500`} 
                        />
                        <span>{t(`urgencyLevels.${urgency}` as any)}:</span>
                      </div>
                      <span>{withdrawalUtils.formatAmount(amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="queue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="queue">
            {t('admin.queue.title')}
            {stats?.pendingApproval && stats.pendingApproval > 0 && (
              <Badge variant="secondary" className="ml-2">
                {stats.pendingApproval}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="all">All Requests</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('admin.queue.subtitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              <WithdrawalsList
                userRole="ADMIN"
                onViewDetails={(withdrawal) => {
                  setSelectedWithdrawal(withdrawal);
                  setShowDetailsDialog(true);
                }}
                onApprove={handleApprove}
                onReject={handleReject}
                showActions={true}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          <WithdrawalsList
            userRole="ADMIN"
            onViewDetails={(withdrawal) => {
              setSelectedWithdrawal(withdrawal);
              setShowDetailsDialog(true);
            }}
            onApprove={handleApprove}
            onReject={handleReject}
            showActions={true}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Processing Time Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48 flex items-center justify-center text-muted-foreground">
                  Chart placeholder - Would show processing time trends
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Approval Rates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Approved</span>
                      <span>85%</span>
                    </div>
                    <Progress value={85} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Rejected</span>
                      <span>10%</span>
                    </div>
                    <Progress value={10} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Pending</span>
                      <span>5%</span>
                    </div>
                    <Progress value={5} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('approval.approveTitle')}</DialogTitle>
            <DialogDescription>
              Approve withdrawal request {selectedWithdrawal?.requestNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedWithdrawal && (
              <div className="bg-muted p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Amount:</span>
                    <p className="font-medium">{withdrawalUtils.formatAmount(selectedWithdrawal.amount)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Depositor:</span>
                    <p className="font-medium">
                      {selectedWithdrawal.depositor?.firstName} {selectedWithdrawal.depositor?.lastName}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div>
              <Label htmlFor="approval-comments">{t('approval.comments')}</Label>
              <Input
                id="approval-comments"
                placeholder={t('approval.commentsPlaceholder')}
                className="mt-1"
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowApprovalDialog(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button 
                onClick={() => confirmApproval()}
                disabled={isLoading}
              >
                {isLoading ? 'Approving...' : t('approval.approveButton')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('approval.rejectTitle')}</DialogTitle>
            <DialogDescription>
              Reject withdrawal request {selectedWithdrawal?.requestNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejection-reason">{t('approval.rejectionReason')}</Label>
              <Input
                id="rejection-reason"
                placeholder={t('approval.rejectionPlaceholder')}
                className="mt-1"
                required
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowRejectionDialog(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={() => {
                  const input = document.getElementById('rejection-reason') as HTMLInputElement;
                  if (input?.value) {
                    confirmRejection(input.value);
                  }
                }}
                disabled={isLoading}
              >
                {isLoading ? 'Rejecting...' : t('approval.rejectButton')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('admin.settings.title')}</DialogTitle>
            <DialogDescription>
              Configure withdrawal approval thresholds and settings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="auto-threshold">{t('admin.settings.autoApprovalThreshold')}</Label>
                <Input
                  id="auto-threshold"
                  type="number"
                  placeholder="1000"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Amounts below this will be auto-approved
                </p>
              </div>
              
              <div>
                <Label htmlFor="manual-threshold">{t('admin.settings.manualApprovalThreshold')}</Label>
                <Input
                  id="manual-threshold"
                  type="number"
                  placeholder="10000"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Amounts above this require manual approval
                </p>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>{t('admin.settings.requireDocuments')}</Label>
                  <p className="text-sm text-muted-foreground">
                    Require supporting documents for all requests
                  </p>
                </div>
                <Switch />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Send email notifications for status changes
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowSettingsDialog(false)}>
                Cancel
              </Button>
              <Button>Save Settings</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}