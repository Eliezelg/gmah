'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { 
  Eye, 
  Edit2, 
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Calendar,
  CreditCard,
  FileText,
  Search,
  Filter,
  Download
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { toast } from '@/components/ui/use-toast';

import type { 
  WithdrawalRequest, 
  WithdrawalQuery, 
  WithdrawalListResponse,
  WithdrawalStatus,
  UrgencyLevel
} from '@/types/withdrawal';
import { WithdrawalsService, withdrawalUtils } from '@/lib/api/withdrawals';
import { format } from 'date-fns';

interface WithdrawalsListProps {
  userRole?: string;
  onViewDetails?: (withdrawal: WithdrawalRequest) => void;
  onEdit?: (withdrawal: WithdrawalRequest) => void;
  onApprove?: (withdrawal: WithdrawalRequest) => void;
  onReject?: (withdrawal: WithdrawalRequest) => void;
  showActions?: boolean;
}

export function WithdrawalsList({ 
  userRole,
  onViewDetails,
  onEdit,
  onApprove,
  onReject,
  showActions = true
}: WithdrawalsListProps) {
  const t = useTranslations('withdrawals');
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<WithdrawalStatus | 'all'>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyLevel | 'all'>('all');
  const [sortBy, setSortBy] = useState('requestDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const loadWithdrawals = async () => {
    setIsLoading(true);
    try {
      const query: WithdrawalQuery = {
        page: currentPage,
        limit: 10,
        search: search || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        sortBy,
        sortOrder,
      };

      const response = await WithdrawalsService.getAll(query);
      setWithdrawals(response.data);
      setTotalPages(response.totalPages);
      setTotal(response.total);
    } catch (error: any) {
      toast({
        title: t('errors.loadingFailed'),
        description: error.message || 'Failed to load withdrawals',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWithdrawals();
  }, [currentPage, search, statusFilter, urgencyFilter, sortBy, sortOrder]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value as WithdrawalStatus | 'all');
    setCurrentPage(1);
  };

  const handleUrgencyFilter = (value: string) => {
    setUrgencyFilter(value as UrgencyLevel | 'all');
    setCurrentPage(1);
  };

  const getStatusIcon = (status: WithdrawalStatus) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="h-4 w-4" />;
      case 'APPROVED':
        return <CheckCircle className="h-4 w-4" />;
      case 'REJECTED':
        return <XCircle className="h-4 w-4" />;
      case 'PROCESSING':
        return <CreditCard className="h-4 w-4" />;
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getUrgencyIcon = (urgency: UrgencyLevel) => {
    switch (urgency) {
      case 'URGENT':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'HIGH':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      default:
        return null;
    }
  };

  const canApproveOrReject = (withdrawal: WithdrawalRequest): boolean => {
    return (
      (userRole === 'ADMIN' || userRole === 'TREASURER' || userRole === 'COMMITTEE_MEMBER') &&
      withdrawalUtils.canApproveOrReject(withdrawal.status)
    );
  };

  const canEdit = (withdrawal: WithdrawalRequest): boolean => {
    return withdrawalUtils.canModify(withdrawal.status);
  };

  if (isLoading && withdrawals.length === 0) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading withdrawals...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-6 w-6" />
              {t('title')}
            </CardTitle>
            <p className="text-muted-foreground mt-1">
              {total} {total === 1 ? 'request' : 'requests'}
            </p>
          </div>
          
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search requests..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 w-full sm:w-60"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={handleStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {withdrawals.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t('list.noRequests')}</h3>
            <p className="text-muted-foreground">{t('list.noRequestsDesc')}</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('list.requestNumber')}</TableHead>
                    <TableHead>{t('list.deposit')}</TableHead>
                    <TableHead>{t('list.amount')}</TableHead>
                    <TableHead>{t('list.requestDate')}</TableHead>
                    <TableHead>{t('list.plannedDate')}</TableHead>
                    <TableHead>{t('list.status')}</TableHead>
                    <TableHead>{t('list.urgency')}</TableHead>
                    {showActions && <TableHead className="text-right">{t('list.actions')}</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withdrawals.map((withdrawal) => (
                    <TableRow key={withdrawal.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {getUrgencyIcon(withdrawal.urgency)}
                          {withdrawal.requestNumber}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{withdrawal.deposit?.depositNumber}</span>
                          <span className="text-sm text-muted-foreground">{withdrawal.deposit?.type}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {withdrawalUtils.formatAmount(withdrawal.amount)}
                      </TableCell>
                      <TableCell>
                        {format(new Date(withdrawal.requestDate), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        {withdrawal.plannedDate ? (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(withdrawal.plannedDate), 'MMM dd')}
                            {withdrawalUtils.isOverdue(withdrawal.plannedDate) && (
                              <Badge variant="destructive" className="ml-1">Overdue</Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={withdrawal.status === 'REJECTED' ? 'destructive' : 
                                 withdrawal.status === 'COMPLETED' ? 'default' : 'secondary'}
                          className="flex items-center gap-1 w-fit"
                        >
                          {getStatusIcon(withdrawal.status)}
                          {t(`statuses.${withdrawal.status}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline"
                          className={`border-${withdrawalUtils.getUrgencyColor(withdrawal.urgency)}-200`}
                        >
                          {t(`urgencyLevels.${withdrawal.urgency}`)}
                        </Badge>
                      </TableCell>
                      {showActions && (
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                onClick={() => onViewDetails?.(withdrawal)}
                                className="flex items-center gap-2"
                              >
                                <Eye className="h-4 w-4" />
                                {t('list.viewDetails')}
                              </DropdownMenuItem>
                              
                              {canEdit(withdrawal) && (
                                <DropdownMenuItem 
                                  onClick={() => onEdit?.(withdrawal)}
                                  className="flex items-center gap-2"
                                >
                                  <Edit2 className="h-4 w-4" />
                                  {t('list.edit')}
                                </DropdownMenuItem>
                              )}

                              {canApproveOrReject(withdrawal) && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => onApprove?.(withdrawal)}
                                    className="flex items-center gap-2 text-green-600"
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                    {t('list.approve')}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => onReject?.(withdrawal)}
                                    className="flex items-center gap-2 text-red-600"
                                  >
                                    <XCircle className="h-4 w-4" />
                                    {t('list.reject')}
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-4">
              {withdrawals.map((withdrawal) => (
                <Card key={withdrawal.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {getUrgencyIcon(withdrawal.urgency)}
                        <span className="font-medium">{withdrawal.requestNumber}</span>
                      </div>
                      <Badge 
                        variant={withdrawal.status === 'REJECTED' ? 'destructive' : 
                               withdrawal.status === 'COMPLETED' ? 'default' : 'secondary'}
                      >
                        {t(`statuses.${withdrawal.status}`)}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('list.amount')}:</span>
                        <span className="font-medium">{withdrawalUtils.formatAmount(withdrawal.amount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('list.deposit')}:</span>
                        <span>{withdrawal.deposit?.depositNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('list.requestDate')}:</span>
                        <span>{format(new Date(withdrawal.requestDate), 'MMM dd, yyyy')}</span>
                      </div>
                      {withdrawal.plannedDate && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('list.plannedDate')}:</span>
                          <div className="flex items-center gap-1">
                            {format(new Date(withdrawal.plannedDate), 'MMM dd')}
                            {withdrawalUtils.isOverdue(withdrawal.plannedDate) && (
                              <Badge variant="destructive" className="ml-1 text-xs">Overdue</Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {showActions && (
                      <div className="flex justify-end mt-4 gap-2">
                        <Button variant="outline" size="sm" onClick={() => onViewDetails?.(withdrawal)}>
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        {canApproveOrReject(withdrawal) && (
                          <>
                            <Button variant="outline" size="sm" onClick={() => onApprove?.(withdrawal)}>
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => onReject?.(withdrawal)}>
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-6">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage > 1) setCurrentPage(currentPage - 1);
                        }}
                        className={currentPage <= 1 ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>
                    
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                      return (
                        <PaginationItem key={page}>
                          <PaginationLink
                            href="#"
                            isActive={page === currentPage}
                            onClick={(e) => {
                              e.preventDefault();
                              setCurrentPage(page);
                            }}
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    
                    <PaginationItem>
                      <PaginationNext 
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                        }}
                        className={currentPage >= totalPages ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}