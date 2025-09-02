'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useRouter } from 'next/navigation'
import { 
  Search, 
  Filter, 
  Download, 
  CheckCircle2, 
  XCircle,
  Clock,
  AlertCircle,
  FileText,
  CreditCard,
  Calendar
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Disbursement {
  id: string
  loanNumber: string
  borrowerId: string
  borrowerName: string
  amount: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  approvalDate: string
  requestedDate?: string
  processedDate?: string
  bankAccount?: string
  bankName?: string
  urgency: 'high' | 'normal' | 'low'
  notes?: string
}

export default function DisbursementsPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedDisbursement, setSelectedDisbursement] = useState<Disbursement | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [disbursements, setDisbursements] = useState<Disbursement[]>([
    {
      id: '1',
      loanNumber: 'LOAN-2024-001',
      borrowerId: '1',
      borrowerName: 'David Cohen',
      amount: 5000,
      status: 'pending',
      approvalDate: '2024-01-15',
      requestedDate: '2024-01-10',
      bankAccount: 'FR76 3000 6000 0112 3456 7890 189',
      bankName: 'BNP Paribas',
      urgency: 'high',
      notes: 'Prêt médical urgent'
    },
    {
      id: '2',
      loanNumber: 'LOAN-2024-002',
      borrowerId: '2',
      borrowerName: 'Sarah Levy',
      amount: 8000,
      status: 'pending',
      approvalDate: '2024-01-16',
      requestedDate: '2024-01-11',
      bankAccount: 'FR76 3000 6000 0112 3456 7890 190',
      bankName: 'Société Générale',
      urgency: 'normal'
    },
    {
      id: '3',
      loanNumber: 'LOAN-2024-003',
      borrowerId: '3',
      borrowerName: 'Michael Goldstein',
      amount: 12000,
      status: 'processing',
      approvalDate: '2024-01-14',
      requestedDate: '2024-01-09',
      processedDate: '2024-01-17',
      bankAccount: 'FR76 3000 6000 0112 3456 7890 191',
      bankName: 'Crédit Agricole',
      urgency: 'low'
    },
    {
      id: '4',
      loanNumber: 'LOAN-2024-004',
      borrowerId: '4',
      borrowerName: 'Rachel Azoulay',
      amount: 3500,
      status: 'completed',
      approvalDate: '2024-01-12',
      requestedDate: '2024-01-08',
      processedDate: '2024-01-13',
      bankAccount: 'FR76 3000 6000 0112 3456 7890 192',
      bankName: 'LCL',
      urgency: 'normal'
    }
  ])

  const [paymentMethod, setPaymentMethod] = useState('bank_transfer')
  const [transactionRef, setTransactionRef] = useState('')
  const [processingNotes, setProcessingNotes] = useState('')

  const filteredDisbursements = disbursements.filter(disbursement => {
    const matchesSearch = disbursement.loanNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         disbursement.borrowerName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = selectedStatus === 'all' || disbursement.status === selectedStatus
    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />En attente</Badge>
      case 'processing':
        return <Badge variant="default"><AlertCircle className="h-3 w-3 mr-1" />En cours</Badge>
      case 'completed':
        return <Badge variant="default" className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Complété</Badge>
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Échoué</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getUrgencyBadge = (urgency: string) => {
    switch(urgency) {
      case 'high':
        return <Badge variant="destructive">Urgent</Badge>
      case 'normal':
        return <Badge variant="secondary">Normal</Badge>
      case 'low':
        return <Badge variant="outline">Faible</Badge>
      default:
        return <Badge>{urgency}</Badge>
    }
  }

  const handleProcessDisbursement = async () => {
    if (!selectedDisbursement) return
    
    setIsProcessing(true)
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Update disbursement status
      setDisbursements(prev => prev.map(d => 
        d.id === selectedDisbursement.id 
          ? { ...d, status: 'processing' as const, processedDate: new Date().toISOString() }
          : d
      ))
      
      toast.success('Décaissement en cours de traitement')
      setSelectedDisbursement(null)
      setTransactionRef('')
      setProcessingNotes('')
    } catch (error) {
      toast.error('Erreur lors du traitement du décaissement')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCompleteDisbursement = async (id: string) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setDisbursements(prev => prev.map(d => 
        d.id === id 
          ? { ...d, status: 'completed' as const }
          : d
      ))
      
      toast.success('Décaissement marqué comme complété')
    } catch (error) {
      toast.error('Erreur lors de la complétion du décaissement')
    }
  }

  const stats = {
    pending: disbursements.filter(d => d.status === 'pending').length,
    processing: disbursements.filter(d => d.status === 'processing').length,
    completed: disbursements.filter(d => d.status === 'completed').length,
    totalAmount: disbursements.reduce((sum, d) => sum + d.amount, 0)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestion des Décaissements</h1>
          <p className="text-muted-foreground mt-1">
            Traiter et suivre les décaissements de prêts approuvés
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
          <Button variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Rapports
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En attente</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Décaissements à traiter</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En cours</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.processing}</div>
            <p className="text-xs text-muted-foreground">En traitement bancaire</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Complétés</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">Ce mois-ci</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Montant total</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{stats.totalAmount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">À décaisser</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
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
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="processing">En cours</SelectItem>
                <SelectItem value="completed">Complété</SelectItem>
                <SelectItem value="failed">Échoué</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Disbursements Table */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des décaissements</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numéro de prêt</TableHead>
                <TableHead>Emprunteur</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Urgence</TableHead>
                <TableHead>Date d&apos;approbation</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDisbursements.map((disbursement) => (
                <TableRow key={disbursement.id}>
                  <TableCell className="font-medium">{disbursement.loanNumber}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{disbursement.borrowerName}</p>
                      <p className="text-sm text-muted-foreground">{disbursement.bankName}</p>
                    </div>
                  </TableCell>
                  <TableCell className="font-bold">€{disbursement.amount.toLocaleString()}</TableCell>
                  <TableCell>{getUrgencyBadge(disbursement.urgency)}</TableCell>
                  <TableCell>
                    {format(new Date(disbursement.approvalDate), 'dd MMM yyyy', { locale: fr })}
                  </TableCell>
                  <TableCell>{getStatusBadge(disbursement.status)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {disbursement.status === 'pending' && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              size="sm" 
                              onClick={() => setSelectedDisbursement(disbursement)}
                            >
                              Traiter
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[500px]">
                            <DialogHeader>
                              <DialogTitle>Traiter le décaissement</DialogTitle>
                              <DialogDescription>
                                Prêt {disbursement.loanNumber} - {disbursement.borrowerName}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label>Montant</Label>
                                  <p className="text-xl font-bold">€{disbursement.amount.toLocaleString()}</p>
                                </div>
                                <div>
                                  <Label>Urgence</Label>
                                  <div className="mt-1">{getUrgencyBadge(disbursement.urgency)}</div>
                                </div>
                              </div>
                              
                              <div>
                                <Label>Compte bancaire</Label>
                                <p className="text-sm font-mono bg-muted p-2 rounded mt-1">
                                  {disbursement.bankAccount}
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {disbursement.bankName}
                                </p>
                              </div>

                              <div>
                                <Label htmlFor="payment-method">Méthode de paiement</Label>
                                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                  <SelectTrigger id="payment-method">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="bank_transfer">Virement bancaire</SelectItem>
                                    <SelectItem value="check">Chèque</SelectItem>
                                    <SelectItem value="cash">Espèces</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <Label htmlFor="transaction-ref">Référence de transaction</Label>
                                <Input
                                  id="transaction-ref"
                                  value={transactionRef}
                                  onChange={(e) => setTransactionRef(e.target.value)}
                                  placeholder="Ex: VIR-2024-001"
                                />
                              </div>

                              <div>
                                <Label htmlFor="notes">Notes de traitement</Label>
                                <Textarea
                                  id="notes"
                                  value={processingNotes}
                                  onChange={(e) => setProcessingNotes(e.target.value)}
                                  placeholder="Notes optionnelles..."
                                  rows={3}
                                />
                              </div>
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="outline" 
                                onClick={() => setSelectedDisbursement(null)}
                              >
                                Annuler
                              </Button>
                              <Button 
                                onClick={handleProcessDisbursement}
                                disabled={isProcessing || !transactionRef}
                              >
                                {isProcessing ? 'Traitement...' : 'Confirmer le décaissement'}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                      {disbursement.status === 'processing' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleCompleteDisbursement(disbursement.id)}
                        >
                          Marquer comme complété
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => router.push(`/treasurer/loans/${disbursement.id}`)}
                      >
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
    </div>
  )
}