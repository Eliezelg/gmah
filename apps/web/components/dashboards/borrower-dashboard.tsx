'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText,
  Plus,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Wallet,
  Calendar,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface LoanStatistics {
  totalLoans: number;
  activeLoans: number;
  completedLoans: number;
  totalDisbursed: number;
  totalRepaid: number;
  repaymentRate: number;
}

interface Loan {
  id: string;
  loanNumber: string;
  amount: number;
  status: string;
  type: string;
  purpose: string;
  createdAt: string;
  numberOfInstallments: number;
  installmentAmount: number;
  outstandingAmount: number;
  nextPaymentDate?: string;
}

const statusConfig = {
  DRAFT: { label: 'Brouillon', color: 'secondary' },
  SUBMITTED: { label: 'Soumis', color: 'default' },
  UNDER_REVIEW: { label: 'En examen', color: 'warning' },
  APPROVED: { label: 'Approuvé', color: 'success' },
  REJECTED: { label: 'Refusé', color: 'destructive' },
  DISBURSED: { label: 'Décaissé', color: 'success' },
  ACTIVE: { label: 'Actif', color: 'success' },
  COMPLETED: { label: 'Terminé', color: 'secondary' },
  CANCELLED: { label: 'Annulé', color: 'secondary' },
} as const;

export function BorrowerDashboard() {
  const { data: statistics } = useQuery({
    queryKey: ['loan-statistics'],
    queryFn: async () => {
      const response = await apiClient.get<LoanStatistics>('/loans/statistics');
      return response.data;
    },
  });

  const { data: loansData } = useQuery({
    queryKey: ['my-loans'],
    queryFn: async () => {
      const response = await apiClient.get<{ loans: Loan[]; total: number }>('/loans/my-loans');
      return response.data;
    },
  });

  const activeLoans = loansData?.loans?.filter(
    (loan) => ['ACTIVE', 'DISBURSED'].includes(loan.status)
  ) || [];
  
  const pendingLoans = loansData?.loans?.filter(
    (loan) => ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED'].includes(loan.status)
  ) || [];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Tableau de bord</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Gérez vos prêts et suivez vos remboursements
          </p>
        </div>
        <Button asChild>
          <Link href="/loans/new">
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle demande
          </Link>
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prêts actifs</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics?.activeLoans || 0}</div>
            <p className="text-xs text-muted-foreground">
              Sur {statistics?.totalLoans || 0} au total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total emprunté</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(statistics?.totalDisbursed || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Montant total décaissé</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remboursé</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(statistics?.totalRepaid || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {statistics?.repaymentRate || 0}% du total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prêts terminés</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics?.completedLoans || 0}</div>
            <p className="text-xs text-muted-foreground">Remboursés intégralement</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Loans Alert */}
      {activeLoans.length > 0 && activeLoans.some(loan => loan.nextPaymentDate) && (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <CardTitle className="text-base">Prochaines échéances</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {activeLoans
              .filter(loan => loan.nextPaymentDate)
              .slice(0, 3)
              .map((loan) => (
                <div key={loan.id} className="flex justify-between items-center py-2">
                  <div>
                    <p className="font-medium">{loan.loanNumber}</p>
                    <p className="text-sm text-gray-600">
                      {formatCurrency(loan.installmentAmount)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {loan.nextPaymentDate && format(new Date(loan.nextPaymentDate), 'dd MMM yyyy', { locale: fr })}
                    </p>
                    <Link href={`/loans/${loan.id}`} className="text-xs text-primary hover:underline">
                      Voir détails →
                    </Link>
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      {/* Loans Tabs */}
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="active">
            Actifs ({activeLoans.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            En cours ({pendingLoans.length})
          </TabsTrigger>
          <TabsTrigger value="all">
            Tous ({loansData?.total || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activeLoans.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-lg font-medium">Aucun prêt actif</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Vous n'avez pas de prêt en cours de remboursement
                </p>
                <Button asChild variant="outline">
                  <Link href="/loans/new">
                    Faire une demande de prêt
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {activeLoans.map((loan) => (
                <Card key={loan.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{loan.loanNumber}</CardTitle>
                        <CardDescription>{loan.purpose}</CardDescription>
                      </div>
                      <Badge variant={statusConfig[loan.status as keyof typeof statusConfig]?.color as any}>
                        {statusConfig[loan.status as keyof typeof statusConfig]?.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Montant</p>
                        <p className="font-semibold">{formatCurrency(loan.amount)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Restant dû</p>
                        <p className="font-semibold">{formatCurrency(loan.outstandingAmount)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Mensualité</p>
                        <p className="font-semibold">{formatCurrency(loan.installmentAmount)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Échéances</p>
                        <p className="font-semibold">{loan.numberOfInstallments} mois</p>
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/loans/${loan.id}`}>
                          Voir les détails
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          {pendingLoans.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Clock className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-lg font-medium">Aucune demande en cours</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Vous n'avez pas de demande en attente
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {pendingLoans.map((loan) => (
                <Card key={loan.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{loan.loanNumber}</CardTitle>
                        <CardDescription>{loan.purpose}</CardDescription>
                      </div>
                      <Badge variant={statusConfig[loan.status as keyof typeof statusConfig]?.color as any}>
                        {statusConfig[loan.status as keyof typeof statusConfig]?.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Montant demandé</p>
                        <p className="font-semibold">{formatCurrency(loan.amount)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Date de demande</p>
                        <p className="font-semibold">
                          {format(new Date(loan.createdAt), 'dd MMM yyyy', { locale: fr })}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Type</p>
                        <p className="font-semibold">{loan.type}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/loans/${loan.id}`}>
                          Voir les détails
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          {loansData?.loans?.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-lg font-medium">Aucun prêt</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Vous n'avez jamais fait de demande de prêt
                </p>
                <Button asChild>
                  <Link href="/loans/new">
                    Faire votre première demande
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {loansData?.loans?.map((loan) => (
                <Card key={loan.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{loan.loanNumber}</CardTitle>
                        <CardDescription>{loan.purpose}</CardDescription>
                      </div>
                      <Badge variant={statusConfig[loan.status as keyof typeof statusConfig]?.color as any}>
                        {statusConfig[loan.status as keyof typeof statusConfig]?.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Montant</p>
                        <p className="font-semibold">{formatCurrency(loan.amount)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Date</p>
                        <p className="font-semibold">
                          {format(new Date(loan.createdAt), 'dd MMM yyyy', { locale: fr })}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Type</p>
                        <p className="font-semibold">{loan.type}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Échéances</p>
                        <p className="font-semibold">{loan.numberOfInstallments} mois</p>
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/loans/${loan.id}`}>
                          Voir les détails
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}