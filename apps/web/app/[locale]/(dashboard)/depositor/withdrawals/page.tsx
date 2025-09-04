'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, CreditCard, TrendingDown, Clock, CheckCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';

import { WithdrawalRequestForm } from '@/components/withdrawals/WithdrawalRequestForm';
import { WithdrawalsList } from '@/components/withdrawals/WithdrawalsList';
import { WithdrawalsService, withdrawalUtils } from '@/lib/api/withdrawals';
import type { WithdrawalRequest, WithdrawalStats } from '@/types/withdrawal';

export default function DepositorWithdrawalsPage() {
  const t = useTranslations('withdrawals');
  const [showNewRequestDialog, setShowNewRequestDialog] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [stats, setStats] = useState<WithdrawalStats | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Load statistics
  useEffect(() => {
    const loadStats = async () => {
      try {
        // This would be a separate endpoint for user stats
        const response = await WithdrawalsService.getAll({ limit: 1000 });
        
        const totalRequests = response.total;
        const pendingApproval = response.data.filter(w => w.status === 'PENDING' || w.status === 'UNDER_REVIEW').length;
        const approved = response.data.filter(w => w.status === 'APPROVED').length;
        const completed = response.data.filter(w => w.status === 'COMPLETED').length;
        const totalAmount = response.data.reduce((sum, w) => sum + w.amount, 0);

        setStats({
          totalRequests,
          pendingApproval,
          approved,
          completed,
          totalAmount,
        });
      } catch (error) {
        console.error('Failed to load stats:', error);
      }
    };

    loadStats();
  }, [refreshTrigger]);

  const handleNewRequest = (withdrawal: WithdrawalRequest) => {
    setShowNewRequestDialog(false);
    setRefreshTrigger(prev => prev + 1);
    toast({
      title: t('messages.requestSubmitted'),
      description: `Request ${withdrawal.requestNumber} has been created successfully.`,
    });
  };

  const handleViewDetails = (withdrawal: WithdrawalRequest) => {
    setSelectedWithdrawal(withdrawal);
    setShowDetailsDialog(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t('dashboard.title')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        <Button onClick={() => setShowNewRequestDialog(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          {t('newRequest')}
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('dashboard.stats.totalRequests')}
              </CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRequests}</div>
              <p className="text-xs text-muted-foreground">
                All time requests
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('dashboard.stats.pendingApproval')}
              </CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pendingApproval}</div>
              <p className="text-xs text-muted-foreground">
                Awaiting review
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('dashboard.stats.completed')}
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
              <p className="text-xs text-muted-foreground">
                Successfully processed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('dashboard.stats.totalAmount')}
              </CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {withdrawalUtils.formatAmount(stats.totalAmount)}
              </div>
              <p className="text-xs text-muted-foreground">
                Total withdrawn
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs defaultValue="my-requests" className="space-y-4">
        <TabsList>
          <TabsTrigger value="my-requests">{t('myWithdrawals')}</TabsTrigger>
          <TabsTrigger value="pending">
            {t('pendingApproval')}
            {stats?.pendingApproval && stats.pendingApproval > 0 && (
              <Badge variant="secondary" className="ml-2">
                {stats.pendingApproval}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-requests" className="space-y-4">
          <WithdrawalsList
            onViewDetails={handleViewDetails}
            showActions={true}
          />
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <WithdrawalsList
            onViewDetails={handleViewDetails}
            showActions={true}
          />
        </TabsContent>
      </Tabs>

      {/* New Request Dialog */}
      <Dialog open={showNewRequestDialog} onOpenChange={setShowNewRequestDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('form.title')}</DialogTitle>
            <DialogDescription>
              Fill out the form below to submit a new withdrawal request.
            </DialogDescription>
          </DialogHeader>
          <WithdrawalRequestForm
            onSuccess={handleNewRequest}
            onCancel={() => setShowNewRequestDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('details.title')}</DialogTitle>
          </DialogHeader>
          {selectedWithdrawal && (
            <div className="space-y-6">
              {/* General Information */}
              <div>
                <h3 className="text-lg font-semibold mb-4">{t('details.generalInfo')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      {t('details.requestNumber')}
                    </label>
                    <p className="font-medium">{selectedWithdrawal.requestNumber}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      {t('details.amount')}
                    </label>
                    <p className="font-medium text-lg">{withdrawalUtils.formatAmount(selectedWithdrawal.amount)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      {t('details.deposit')}
                    </label>
                    <p className="font-medium">{selectedWithdrawal.deposit?.depositNumber} - {selectedWithdrawal.deposit?.type}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      {t('details.status')}
                    </label>
                    <Badge 
                      variant={selectedWithdrawal.status === 'REJECTED' ? 'destructive' : 
                             selectedWithdrawal.status === 'COMPLETED' ? 'default' : 'secondary'}
                      className="mt-1"
                    >
                      {t(`statuses.${selectedWithdrawal.status}`)}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      {t('details.urgency')}
                    </label>
                    <Badge variant="outline" className="mt-1">
                      {t(`urgencyLevels.${selectedWithdrawal.urgency}`)}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      {t('details.requestDate')}
                    </label>
                    <p className="font-medium">
                      {new Date(selectedWithdrawal.requestDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Reason */}
              <div>
                <h3 className="text-lg font-semibold mb-2">{t('details.reason')}</h3>
                <div className="bg-muted p-4 rounded-lg">
                  <p>{selectedWithdrawal.reason}</p>
                  {selectedWithdrawal.reasonCategory && (
                    <Badge variant="outline" className="mt-2">
                      {t(`reasonCategories.${selectedWithdrawal.reasonCategory}`)}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Approval Info */}
              {(selectedWithdrawal.approvalDate || selectedWithdrawal.rejectionDate) && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">{t('details.approvalInfo')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedWithdrawal.approvalDate && (
                      <>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            {t('details.approvedBy')}
                          </label>
                          <p className="font-medium">
                            {selectedWithdrawal.approver?.firstName} {selectedWithdrawal.approver?.lastName}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            {t('details.approvalDate')}
                          </label>
                          <p className="font-medium">
                            {new Date(selectedWithdrawal.approvalDate).toLocaleDateString()}
                          </p>
                        </div>
                      </>
                    )}
                    {selectedWithdrawal.rejectionDate && (
                      <>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            {t('details.rejectedBy')}
                          </label>
                          <p className="font-medium">
                            {selectedWithdrawal.rejecter?.firstName} {selectedWithdrawal.rejecter?.lastName}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            {t('details.rejectionDate')}
                          </label>
                          <p className="font-medium">
                            {new Date(selectedWithdrawal.rejectionDate).toLocaleDateString()}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                  
                  {selectedWithdrawal.approvalComments && (
                    <div className="mt-4">
                      <label className="text-sm font-medium text-muted-foreground">
                        {t('details.approvalComments')}
                      </label>
                      <div className="bg-muted p-4 rounded-lg mt-2">
                        <p>{selectedWithdrawal.approvalComments}</p>
                      </div>
                    </div>
                  )}
                  
                  {selectedWithdrawal.rejectionReason && (
                    <div className="mt-4">
                      <label className="text-sm font-medium text-muted-foreground">
                        {t('details.rejectionReason')}
                      </label>
                      <div className="bg-muted p-4 rounded-lg mt-2">
                        <p>{selectedWithdrawal.rejectionReason}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Payment Information */}
              {selectedWithdrawal.paymentMethod && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">{t('details.paymentInfo')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        {t('details.paymentMethod')}
                      </label>
                      <p className="font-medium">{selectedWithdrawal.paymentMethod.replace('_', ' ')}</p>
                    </div>
                    {selectedWithdrawal.transactionRef && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          {t('details.transactionRef')}
                        </label>
                        <p className="font-medium font-mono">{selectedWithdrawal.transactionRef}</p>
                      </div>
                    )}
                    {selectedWithdrawal.processingDate && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          {t('details.processingDate')}
                        </label>
                        <p className="font-medium">
                          {new Date(selectedWithdrawal.processingDate).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    {selectedWithdrawal.completedDate && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          {t('details.completedDate')}
                        </label>
                        <p className="font-medium">
                          {new Date(selectedWithdrawal.completedDate).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}