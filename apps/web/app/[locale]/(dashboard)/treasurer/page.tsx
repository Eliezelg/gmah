'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { 
  Euro, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  CreditCard,
  FileText,
  Users,
  Calendar,
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'

export default function TreasurerDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState({
    totalFunds: 250000,
    availableFunds: 175000,
    pendingDisbursements: 45000,
    activeLoans: 156,
    approvedAwaitingFunds: 12,
    overduePayments: 8,
    monthlyInflow: 35000,
    monthlyOutflow: 28000,
    defaultRate: 2.1
  })

  const [pendingDisbursements, setPendingDisbursements] = useState([
    {
      id: '1',
      loanNumber: 'LOAN-2024-001',
      borrowerName: 'David Cohen',
      amount: 5000,
      approvalDate: '2024-01-15',
      urgency: 'high'
    },
    {
      id: '2',
      loanNumber: 'LOAN-2024-002',
      borrowerName: 'Sarah Levy',
      amount: 8000,
      approvalDate: '2024-01-16',
      urgency: 'normal'
    },
    {
      id: '3',
      loanNumber: 'LOAN-2024-003',
      borrowerName: 'Michael Goldstein',
      amount: 12000,
      approvalDate: '2024-01-17',
      urgency: 'low'
    }
  ])

  const [recentTransactions, setRecentTransactions] = useState([
    {
      id: '1',
      type: 'disbursement',
      description: 'Prêt LOAN-2024-098',
      amount: -5000,
      date: '2024-01-14',
      status: 'completed'
    },
    {
      id: '2',
      type: 'repayment',
      description: 'Remboursement LOAN-2023-456',
      amount: 1500,
      date: '2024-01-14',
      status: 'completed'
    },
    {
      id: '3',
      type: 'contribution',
      description: 'Don de Abraham Rubin',
      amount: 10000,
      date: '2024-01-13',
      status: 'completed'
    }
  ])

  const getUrgencyColor = (urgency: string) => {
    switch(urgency) {
      case 'high': return 'text-red-600 bg-red-50'
      case 'normal': return 'text-yellow-600 bg-yellow-50'
      case 'low': return 'text-green-600 bg-green-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Tableau de bord Trésorier</h1>
          <p className="text-muted-foreground mt-1">
            Vue d'ensemble financière et gestion des décaissements
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => router.push('/treasurer/reports')}
          >
            <FileText className="h-4 w-4 mr-2" />
            Rapports
          </Button>
          <Button 
            onClick={() => router.push('/treasurer/disbursements')}
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Gérer les décaissements
          </Button>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fonds totaux</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{stats.totalFunds.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +15% par rapport au mois dernier
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fonds disponibles</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{stats.availableFunds.toLocaleString()}</div>
            <Progress value={70} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Décaissements en attente</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{stats.pendingDisbursements.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {stats.approvedAwaitingFunds} prêts approuvés
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux de défaut</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.defaultRate}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.overduePayments} paiements en retard
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cash Flow Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Flux de trésorerie mensuel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Entrées</p>
                <p className="text-xl font-bold text-green-600">
                  +€{stats.monthlyInflow.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">Sorties</p>
                <p className="text-xl font-bold text-red-600">
                  -€{stats.monthlyOutflow.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
          <div className="h-[200px] bg-muted rounded flex items-center justify-center text-muted-foreground">
            [Graphique des flux de trésorerie]
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="disbursements" className="space-y-4">
        <TabsList>
          <TabsTrigger value="disbursements">Décaissements en attente</TabsTrigger>
          <TabsTrigger value="transactions">Transactions récentes</TabsTrigger>
          <TabsTrigger value="overdue">Paiements en retard</TabsTrigger>
        </TabsList>

        <TabsContent value="disbursements" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Prêts approuvés en attente de décaissement</CardTitle>
                <Button size="sm" onClick={() => router.push('/treasurer/disbursements')}>
                  Voir tout
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingDisbursements.map((loan) => (
                  <div key={loan.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div>
                        <Badge className={getUrgencyColor(loan.urgency)}>
                          {loan.urgency === 'high' ? 'Urgent' : loan.urgency === 'normal' ? 'Normal' : 'Faible'}
                        </Badge>
                      </div>
                      <div>
                        <p className="font-medium">{loan.loanNumber}</p>
                        <p className="text-sm text-muted-foreground">{loan.borrowerName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold">€{loan.amount.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">
                          Approuvé le {new Date(loan.approvalDate).toLocaleDateString()}
                        </p>
                      </div>
                      <Button 
                        size="sm"
                        onClick={() => router.push(`/treasurer/disbursements/${loan.id}`)}
                      >
                        Traiter
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transactions récentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {transaction.type === 'disbursement' ? (
                        <TrendingDown className="h-5 w-5 text-red-600" />
                      ) : (
                        <TrendingUp className="h-5 w-5 text-green-600" />
                      )}
                      <div>
                        <p className="font-medium">{transaction.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(transaction.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`font-bold ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {transaction.amount > 0 ? '+' : ''}€{Math.abs(transaction.amount).toLocaleString()}
                      </span>
                      {transaction.status === 'completed' ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <Clock className="h-4 w-4 text-yellow-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overdue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Paiements en retard</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-center text-muted-foreground py-8">
                  {stats.overduePayments} paiements en retard nécessitant votre attention
                </div>
                <Button 
                  className="w-full"
                  variant="outline"
                  onClick={() => router.push('/treasurer/overdue-payments')}
                >
                  Gérer les paiements en retard
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions rapides</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-24 flex-col" onClick={() => router.push('/treasurer/disbursements')}>
              <CreditCard className="h-6 w-6 mb-2" />
              <span className="text-xs">Décaissements</span>
            </Button>
            <Button variant="outline" className="h-24 flex-col" onClick={() => router.push('/treasurer/payments')}>
              <Calendar className="h-6 w-6 mb-2" />
              <span className="text-xs">Paiements</span>
            </Button>
            <Button variant="outline" className="h-24 flex-col" onClick={() => router.push('/treasurer/reports')}>
              <FileText className="h-6 w-6 mb-2" />
              <span className="text-xs">Rapports</span>
            </Button>
            <Button variant="outline" className="h-24 flex-col" onClick={() => router.push('/treasurer/reconciliation')}>
              <Users className="h-6 w-6 mb-2" />
              <span className="text-xs">Réconciliation</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}