'use client';

import { useTranslations } from 'next-intl';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  CreditCard, 
  Eye,
  Calendar,
  User,
  Building,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';

import type { WithdrawalRequest } from '@/types/withdrawal';
import { withdrawalUtils } from '@/lib/api/withdrawals';

interface WithdrawalStatusCardProps {
  withdrawal: WithdrawalRequest;
  onViewDetails?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onEdit?: () => void;
  showActions?: boolean;
  compact?: boolean;
}

export function WithdrawalStatusCard({ 
  withdrawal, 
  onViewDetails,
  onApprove,
  onReject,
  onEdit,
  showActions = true,
  compact = false 
}: WithdrawalStatusCardProps) {
  const t = useTranslations('withdrawals');

  const getStatusIcon = () => {
    switch (withdrawal.status) {
      case 'PENDING':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'UNDER_REVIEW':
        return <FileText className="h-4 w-4 text-blue-600" />;
      case 'APPROVED':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'REJECTED':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'PROCESSING':
        return <CreditCard className="h-4 w-4 text-purple-600" />;
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-emerald-600" />;
      case 'CANCELLED':
        return <XCircle className="h-4 w-4 text-gray-600" />;
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  const getProgressPercentage = (): number => {
    switch (withdrawal.status) {
      case 'PENDING':
        return 20;
      case 'UNDER_REVIEW':
        return 40;
      case 'APPROVED':
        return 60;
      case 'PROCESSING':
        return 80;
      case 'COMPLETED':
        return 100;
      case 'REJECTED':
      case 'CANCELLED':
      case 'FAILED':
        return 0;
      default:
        return 0;
    }
  };

  const getProgressColor = (): string => {
    switch (withdrawal.status) {
      case 'COMPLETED':
        return 'bg-green-500';
      case 'REJECTED':
      case 'CANCELLED':
      case 'FAILED':
        return 'bg-red-500';
      default:
        return 'bg-blue-500';
    }
  };

  const getUrgencyIcon = () => {
    if (withdrawal.urgency === 'URGENT') {
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
    if (withdrawal.urgency === 'HIGH') {
      return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    }
    return null;
  };

  const isOverdue = withdrawal.plannedDate && withdrawalUtils.isOverdue(withdrawal.plannedDate);
  const canApprove = withdrawalUtils.canApproveOrReject(withdrawal.status);
  const canEdit = withdrawalUtils.canModify(withdrawal.status);
  const daysSinceRequest = withdrawalUtils.daysSinceRequest(withdrawal.requestDate);

  if (compact) {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getStatusIcon()}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{withdrawal.requestNumber}</span>
                  {getUrgencyIcon()}
                  {isOverdue && <Badge variant="destructive" className="text-xs">Overdue</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">
                  {withdrawalUtils.formatAmount(withdrawal.amount)}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge 
                variant={withdrawal.status === 'REJECTED' ? 'destructive' : 
                       withdrawal.status === 'COMPLETED' ? 'default' : 'secondary'}
              >
                {t(`statuses.${withdrawal.status}`)}
              </Badge>
              {showActions && (
                <Button variant="ghost" size="sm" onClick={onViewDetails}>
                  <Eye className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{withdrawal.requestNumber}</h3>
                {getUrgencyIcon()}
                {isOverdue && <Badge variant="destructive">Overdue</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">
                {t(`approvalModes.${withdrawal.approvalMode}`)} approval
              </p>
            </div>
          </div>
          
          <Badge 
            variant={withdrawal.status === 'REJECTED' ? 'destructive' : 
                   withdrawal.status === 'COMPLETED' ? 'default' : 'secondary'}
            className="flex items-center gap-1"
          >
            {getStatusIcon()}
            {t(`statuses.${withdrawal.status}`)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{getProgressPercentage()}%</span>
          </div>
          <Progress 
            value={getProgressPercentage()} 
            className="h-2"
          />
        </div>

        <Separator />

        {/* Key Information */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="flex items-center gap-1 text-muted-foreground mb-1">
              <CreditCard className="h-3 w-3" />
              Amount
            </div>
            <p className="font-semibold text-lg">{withdrawalUtils.formatAmount(withdrawal.amount)}</p>
          </div>
          
          <div>
            <div className="flex items-center gap-1 text-muted-foreground mb-1">
              <Building className="h-3 w-3" />
              Deposit
            </div>
            <p className="font-medium">{withdrawal.deposit?.depositNumber}</p>
            <p className="text-xs text-muted-foreground">{withdrawal.deposit?.type}</p>
          </div>

          <div>
            <div className="flex items-center gap-1 text-muted-foreground mb-1">
              <User className="h-3 w-3" />
              Depositor
            </div>
            <p className="font-medium">
              {withdrawal.depositor?.firstName} {withdrawal.depositor?.lastName}
            </p>
          </div>

          <div>
            <div className="flex items-center gap-1 text-muted-foreground mb-1">
              <Calendar className="h-3 w-3" />
              Requested
            </div>
            <p className="font-medium">
              {format(new Date(withdrawal.requestDate), 'MMM dd, yyyy')}
            </p>
            <p className="text-xs text-muted-foreground">
              {daysSinceRequest} days ago
            </p>
          </div>
        </div>

        {/* Planned Date */}
        {withdrawal.plannedDate && (
          <>
            <Separator />
            <div>
              <div className="flex items-center gap-1 text-muted-foreground mb-1 text-sm">
                <Calendar className="h-3 w-3" />
                Needed by
              </div>
              <div className="flex items-center gap-2">
                <p className="font-medium">
                  {format(new Date(withdrawal.plannedDate), 'MMM dd, yyyy')}
                </p>
                {isOverdue && (
                  <Badge variant="destructive" className="text-xs">
                    {Math.abs(Math.floor((Date.now() - new Date(withdrawal.plannedDate).getTime()) / (1000 * 60 * 60 * 24)))} days overdue
                  </Badge>
                )}
              </div>
            </div>
          </>
        )}

        {/* Reason Preview */}
        <div>
          <div className="flex items-center gap-1 text-muted-foreground mb-1 text-sm">
            <FileText className="h-3 w-3" />
            Reason
          </div>
          <p className="text-sm line-clamp-2">{withdrawal.reason}</p>
          {withdrawal.reasonCategory && (
            <Badge variant="outline" className="mt-1 text-xs">
              {t(`reasonCategories.${withdrawal.reasonCategory}`)}
            </Badge>
          )}
        </div>

        {/* Approval/Rejection Information */}
        {(withdrawal.approvalDate || withdrawal.rejectionDate) && (
          <>
            <Separator />
            <div>
              {withdrawal.approvalDate && (
                <div>
                  <p className="text-sm text-green-600 font-medium">
                    ✓ Approved by {withdrawal.approver?.firstName} {withdrawal.approver?.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(withdrawal.approvalDate), 'MMM dd, yyyy')}
                  </p>
                  {withdrawal.approvalComments && (
                    <p className="text-xs text-muted-foreground mt-1 italic">
                      "{withdrawal.approvalComments}"
                    </p>
                  )}
                </div>
              )}
              
              {withdrawal.rejectionDate && (
                <div>
                  <p className="text-sm text-red-600 font-medium">
                    ✗ Rejected by {withdrawal.rejecter?.firstName} {withdrawal.rejecter?.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(withdrawal.rejectionDate), 'MMM dd, yyyy')}
                  </p>
                  {withdrawal.rejectionReason && (
                    <p className="text-xs text-muted-foreground mt-1 italic">
                      "{withdrawal.rejectionReason}"
                    </p>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* Actions */}
        {showActions && (
          <>
            <Separator />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={onViewDetails}>
                <Eye className="h-4 w-4 mr-1" />
                {t('list.viewDetails')}
              </Button>
              
              {canEdit && (
                <Button variant="outline" size="sm" onClick={onEdit}>
                  <FileText className="h-4 w-4 mr-1" />
                  {t('list.edit')}
                </Button>
              )}
              
              {canApprove && (
                <div className="flex gap-2">
                  <Button variant="default" size="sm" onClick={onApprove}>
                    <CheckCircle className="h-4 w-4 mr-1" />
                    {t('list.approve')}
                  </Button>
                  <Button variant="destructive" size="sm" onClick={onReject}>
                    <XCircle className="h-4 w-4 mr-1" />
                    {t('list.reject')}
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}