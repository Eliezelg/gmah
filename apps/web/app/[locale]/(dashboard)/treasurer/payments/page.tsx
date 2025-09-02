'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Search, 
  Filter, 
  Download,
  TrendingUp,
  TrendingDown,
  Calendar,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Clock
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'

interface Payment {
  id: string
  paymentNumber: string
  loanNumber: string
  borrowerName: string
  amount: number
  dueDate: string
  paidDate?: string
  status: 'pending' | 'paid' | 'overdue' | 'partial'
  method?: 'bank_transfer' | 'cash' | 'check' | 'direct_debit'
  installmentNumber: number
  totalInstallments: number
}

export default function PaymentsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedPeriod, setSelectedPeriod] = useState('month')
  
  const [payments] = useState<Payment[]>([
    {
      id: '1',
      paymentNumber: 'PAY-2024-001',
      loanNumber: 'LOAN-2023-456',
      borrowerName: 'David Cohen',
      amount: 500,
      dueDate: '2024-02-01',
      status: 'pending',
      installmentNumber: 5,
      totalInstallments: 12
    },
    {
      id: '2',
      paymentNumber: 'PAY-2024-002',
      loanNumber: 'LOAN-2023-457',
      borrowerName: 'Sarah Levy',
      amount: 750,
      dueDate: '2024-01-25',
      paidDate: '2024-01-24',
      status: 'paid',
      method: 'bank_transfer',
      installmentNumber: 3,
      totalInstallments: 10
    },
    {
      id: '3',
      paymentNumber: 'PAY-2024-003',
      loanNumber: 'LOAN-2023-458',
      borrowerName: 'Michael Goldstein',
      amount: 1000,
      dueDate: '2024-01-15',
      status: 'overdue',
      installmentNumber: 7,
      totalInstallments: 15
    },
    {
      id: '4',
      paymentNumber: 'PAY-2024-004',
      loanNumber: 'LOAN-2023-459',
      borrowerName: 'Rachel Azoulay',
      amount: 350,
      dueDate: '2024-01-28',
      paidDate: '2024-01-28',
      status: 'paid',
      method: 'direct_debit',
      installmentNumber: 2,
      totalInstallments: 8
    }
  ])

  const stats = {
    totalExpected: payments.reduce((sum, p) => sum + p.amount, 0),
    totalCollected: payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0),
    overdueAmount: payments.filter(p => p.status === 'overdue').reduce((sum, p) => sum + p.amount, 0),
    pendingCount: payments.filter(p => p.status === 'pending').length,
    overdueCount: payments.filter(p => p.status === 'overdue').length,
    collectionRate: 78.5
  }

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = payment.paymentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.borrowerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.loanNumber.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = selectedStatus === 'all' || payment.status === selectedStatus
    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'paid':
        return <Badge className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Payé</Badge>
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />En attente</Badge>
      case 'overdue':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />En retard</Badge>
      case 'partial':
        return <Badge variant="outline">Partiel</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getPaymentMethodLabel = (method?: string) => {
    switch(method) {
      case 'bank_transfer': return 'Virement'
      case 'cash': return 'Espèces'
      case 'check': return 'Chèque'
      case 'direct_debit': return 'Prélèvement'
      default: return '-'
    }
  }

  const handleRecordPayment = (paymentId: string) => {
    toast.success('Paiement enregistré avec succès')
  }

  const handleSendReminder = (paymentId: string) => {
    toast.success('Rappel envoyé à l\'emprunteur')
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestion des Paiements</h1>
          <p className="text-muted-foreground mt-1">
            Suivi et gestion des remboursements de prêts
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Montant attendu</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{stats.totalExpected.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Ce mois</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Montant collecté</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              €{stats.totalCollected.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Taux de collecte: {stats.collectionRate}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En retard</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              €{stats.overdueAmount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.overdueCount} paiements en retard
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En attente</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingCount}</div>
            <p className="text-xs text-muted-foreground">Paiements à venir</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">Tous les paiements</TabsTrigger>
          <TabsTrigger value="overdue">En retard</TabsTrigger>
          <TabsTrigger value="upcoming">À venir</TabsTrigger>
          <TabsTrigger value="completed">Complétés</TabsTrigger>
        </TabsList>

        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par numéro ou nom..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="paid">Payé</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="overdue">En retard</SelectItem>
                  <SelectItem value="partial">Partiel</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Période" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Cette semaine</SelectItem>
                  <SelectItem value="month">Ce mois</SelectItem>
                  <SelectItem value="quarter">Ce trimestre</SelectItem>
                  <SelectItem value="year">Cette année</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>Liste des paiements</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N° Paiement</TableHead>
                    <TableHead>Prêt</TableHead>
                    <TableHead>Emprunteur</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Échéance</TableHead>
                    <TableHead>Versement</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Méthode</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">{payment.paymentNumber}</TableCell>
                      <TableCell>{payment.loanNumber}</TableCell>
                      <TableCell>{payment.borrowerName}</TableCell>
                      <TableCell className="font-bold">€{payment.amount.toLocaleString()}</TableCell>
                      <TableCell>
                        {format(new Date(payment.dueDate), 'dd MMM yyyy', { locale: fr })}
                      </TableCell>
                      <TableCell>
                        {payment.installmentNumber}/{payment.totalInstallments}
                      </TableCell>
                      <TableCell>{getStatusBadge(payment.status)}</TableCell>
                      <TableCell>{getPaymentMethodLabel(payment.method)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {payment.status === 'pending' && (
                            <Button
                              size="sm"
                              onClick={() => handleRecordPayment(payment.id)}
                            >
                              Enregistrer
                            </Button>
                          )}
                          {payment.status === 'overdue' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSendReminder(payment.id)}
                            >
                              Rappel
                            </Button>
                          )}
                          <Button size="sm" variant="ghost">
                            Détails
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overdue">
          <Card>
            <CardHeader>
              <CardTitle>Paiements en retard</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {payments.filter(p => p.status === 'overdue').map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg bg-red-50">
                    <div>
                      <p className="font-medium">{payment.borrowerName}</p>
                      <p className="text-sm text-muted-foreground">
                        {payment.loanNumber} - Échéance: {format(new Date(payment.dueDate), 'dd MMM yyyy', { locale: fr })}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold text-red-600">€{payment.amount.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">
                          {Math.floor((new Date().getTime() - new Date(payment.dueDate).getTime()) / (1000 * 60 * 60 * 24))} jours de retard
                        </p>
                      </div>
                      <Button size="sm" onClick={() => handleSendReminder(payment.id)}>
                        Envoyer un rappel
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upcoming">
          <Card>
            <CardHeader>
              <CardTitle>Paiements à venir</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {payments.filter(p => p.status === 'pending').map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{payment.borrowerName}</p>
                      <p className="text-sm text-muted-foreground">
                        {payment.loanNumber} - Versement {payment.installmentNumber}/{payment.totalInstallments}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold">€{payment.amount.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">
                          Échéance: {format(new Date(payment.dueDate), 'dd MMM yyyy', { locale: fr })}
                        </p>
                      </div>
                      <Button size="sm" variant="outline">
                        Envoyer un rappel
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed">
          <Card>
            <CardHeader>
              <CardTitle>Paiements complétés</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date de paiement</TableHead>
                    <TableHead>Emprunteur</TableHead>
                    <TableHead>Prêt</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Méthode</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.filter(p => p.status === 'paid').map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        {payment.paidDate && format(new Date(payment.paidDate), 'dd MMM yyyy', { locale: fr })}
                      </TableCell>
                      <TableCell>{payment.borrowerName}</TableCell>
                      <TableCell>{payment.loanNumber}</TableCell>
                      <TableCell className="font-bold">€{payment.amount.toLocaleString()}</TableCell>
                      <TableCell>{getPaymentMethodLabel(payment.method)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}