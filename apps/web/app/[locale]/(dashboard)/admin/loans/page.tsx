'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  FileText,
  Eye,
  Download,
  Shield,
  Euro,
  Calendar,
  User,
  Loader2,
  TrendingUp,
  TrendingDown,
  CheckCheck,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Loan {
  id: string;
  loanNumber: string;
  borrowerId: string;
  borrower?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  type: string;
  amount: number;
  numberOfInstallments: number;
  purpose: string;
  status: string;
  createdAt: string;
  submittedAt?: string;
  documents?: any[];
  guarantees?: any[];
}

const statusConfig = {
  DRAFT: { label: 'Brouillon', color: 'secondary', icon: FileText },
  SUBMITTED: { label: 'Soumis', color: 'warning', icon: Clock },
  UNDER_REVIEW: { label: 'En révision', color: 'warning', icon: AlertCircle },
  APPROVED: { label: 'Approuvé', color: 'success', icon: CheckCircle },
  REJECTED: { label: 'Rejeté', color: 'destructive', icon: XCircle },
  DISBURSED: { label: 'Déboursé', color: 'info', icon: Euro },
  ACTIVE: { label: 'Actif', color: 'info', icon: TrendingUp },
  COMPLETED: { label: 'Complété', color: 'success', icon: CheckCheck },
  DEFAULTED: { label: 'En défaut', color: 'destructive', icon: TrendingDown },
  CANCELLED: { label: 'Annulé', color: 'secondary', icon: X },
};

export default function AdminLoansPage() {
  const router = useRouter();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [approvalDialog, setApprovalDialog] = useState(false);
  const [rejectionDialog, setRejectionDialog] = useState(false);
  const [detailsDialog, setDetailsDialog] = useState(false);
  const [approvalMode, setApprovalMode] = useState<'committee' | 'single'>('single');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    disbursed: 0,
  });

  // Approval form states
  const [approvalComments, setApprovalComments] = useState('');
  const [approvalConditions, setApprovalConditions] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionComments, setRejectionComments] = useState('');

  useEffect(() => {
    fetchLoans();
  }, []);

  const fetchLoans = async () => {
    try {
      const response = await apiClient.get('/loans');
      setLoans(response.data);
      calculateStats(response.data);
    } catch (error) {
      toast.error('Erreur lors du chargement des prêts');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (loansList: Loan[]) => {
    setStats({
      total: loansList.length,
      pending: loansList.filter(l => l.status === 'SUBMITTED').length,
      approved: loansList.filter(l => l.status === 'APPROVED').length,
      rejected: loansList.filter(l => l.status === 'REJECTED').length,
      disbursed: loansList.filter(l => ['DISBURSED', 'ACTIVE'].includes(l.status)).length,
    });
  };

  const handleDirectApprove = async () => {
    if (!selectedLoan) return;

    try {
      await apiClient.post(`/loans/${selectedLoan.id}/direct-approve`, {
        comments: approvalComments,
        conditions: approvalConditions,
      });

      toast.success('Prêt approuvé avec succès');
      setApprovalDialog(false);
      resetForms();
      fetchLoans();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'approbation');
    }
  };

  const handleDirectReject = async () => {
    if (!selectedLoan || !rejectionReason) {
      toast.error('Veuillez indiquer une raison de refus');
      return;
    }

    try {
      await apiClient.post(`/loans/${selectedLoan.id}/direct-reject`, {
        reason: rejectionReason,
        comments: rejectionComments,
      });

      toast.success('Prêt rejeté');
      setRejectionDialog(false);
      resetForms();
      fetchLoans();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors du rejet');
    }
  };

  const resetForms = () => {
    setSelectedLoan(null);
    setApprovalComments('');
    setApprovalConditions('');
    setRejectionReason('');
    setRejectionComments('');
  };

  const viewLoanDetails = async (loan: Loan) => {
    try {
      const response = await apiClient.get(`/loans/${loan.id}`);
      setSelectedLoan(response.data);
      setDetailsDialog(true);
    } catch (error) {
      toast.error('Erreur lors du chargement des détails');
    }
  };

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.DRAFT;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.color as any} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Gestion des Prêts</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Administrez les demandes de prêt - Mode {approvalMode === 'single' ? 'Décideur unique' : 'Comité'}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total</CardDescription>
            <CardTitle className="text-2xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>En attente</CardDescription>
            <CardTitle className="text-2xl text-yellow-600">{stats.pending}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Approuvés</CardDescription>
            <CardTitle className="text-2xl text-green-600">{stats.approved}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Rejetés</CardDescription>
            <CardTitle className="text-2xl text-red-600">{stats.rejected}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Déboursés</CardDescription>
            <CardTitle className="text-2xl text-blue-600">{stats.disbursed}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Approval Mode Switch */}
      <Card>
        <CardHeader>
          <CardTitle>Mode d&apos;approbation</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={approvalMode} onValueChange={(value: any) => setApprovalMode(value)}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="single">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Décideur unique (Admin)
                </div>
              </SelectItem>
              <SelectItem value="committee">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Comité d'approbation
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Loans Table */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des demandes</CardTitle>
          <CardDescription>
            Cliquez sur une demande pour voir les détails et prendre une décision
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending">
            <TabsList>
              <TabsTrigger value="pending">En attente</TabsTrigger>
              <TabsTrigger value="all">Toutes</TabsTrigger>
              <TabsTrigger value="approved">Approuvées</TabsTrigger>
              <TabsTrigger value="rejected">Rejetées</TabsTrigger>
            </TabsList>

            <TabsContent value="pending">
              <LoanTable 
                loans={loans.filter(l => ['SUBMITTED', 'UNDER_REVIEW'].includes(l.status))}
                onView={viewLoanDetails}
                onApprove={(loan) => { setSelectedLoan(loan); setApprovalDialog(true); }}
                onReject={(loan) => { setSelectedLoan(loan); setRejectionDialog(true); }}
                getStatusBadge={getStatusBadge}
              />
            </TabsContent>

            <TabsContent value="all">
              <LoanTable 
                loans={loans}
                onView={viewLoanDetails}
                getStatusBadge={getStatusBadge}
              />
            </TabsContent>

            <TabsContent value="approved">
              <LoanTable 
                loans={loans.filter(l => l.status === 'APPROVED')}
                onView={viewLoanDetails}
                getStatusBadge={getStatusBadge}
              />
            </TabsContent>

            <TabsContent value="rejected">
              <LoanTable 
                loans={loans.filter(l => l.status === 'REJECTED')}
                onView={viewLoanDetails}
                getStatusBadge={getStatusBadge}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Approval Dialog */}
      <Dialog open={approvalDialog} onOpenChange={setApprovalDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Approuver le prêt</DialogTitle>
            <DialogDescription>
              {selectedLoan && (
                <div className="mt-2">
                  <p>Emprunteur: {selectedLoan.borrower?.firstName} {selectedLoan.borrower?.lastName}</p>
                  <p>Montant: {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(selectedLoan.amount)}</p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Commentaires d&apos;approbation</Label>
              <Textarea
                placeholder="Ajoutez vos commentaires..."
                value={approvalComments}
                onChange={(e) => setApprovalComments(e.target.value)}
              />
            </div>

            <div>
              <Label>Conditions spéciales (optionnel)</Label>
              <Textarea
                placeholder="Conditions à respecter..."
                value={approvalConditions}
                onChange={(e) => setApprovalConditions(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovalDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleDirectApprove} className="bg-green-600 hover:bg-green-700">
              <CheckCircle className="mr-2 h-4 w-4" />
              Approuver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={rejectionDialog} onOpenChange={setRejectionDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Rejeter le prêt</DialogTitle>
            <DialogDescription>
              {selectedLoan && (
                <div className="mt-2">
                  <p>Emprunteur: {selectedLoan.borrower?.firstName} {selectedLoan.borrower?.lastName}</p>
                  <p>Montant: {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(selectedLoan.amount)}</p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Raison du rejet *</Label>
              <Select value={rejectionReason} onValueChange={setRejectionReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez une raison" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="insufficient_documents">Documents insuffisants</SelectItem>
                  <SelectItem value="high_risk">Risque trop élevé</SelectItem>
                  <SelectItem value="invalid_purpose">Objectif non conforme</SelectItem>
                  <SelectItem value="amount_too_high">Montant trop élevé</SelectItem>
                  <SelectItem value="no_guarantees">Garanties insuffisantes</SelectItem>
                  <SelectItem value="other">Autre raison</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Commentaires additionnels</Label>
              <Textarea
                placeholder="Expliquez la décision..."
                value={rejectionComments}
                onChange={(e) => setRejectionComments(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectionDialog(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleDirectReject} 
              variant="destructive"
              disabled={!rejectionReason}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Rejeter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={detailsDialog} onOpenChange={setDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Détails du prêt {selectedLoan?.loanNumber}</DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="h-[60vh] pr-4">
            {selectedLoan && <LoanDetails loan={selectedLoan} />}
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsDialog(false)}>
              Fermer
            </Button>
            {selectedLoan && ['SUBMITTED', 'UNDER_REVIEW'].includes(selectedLoan.status) && (
              <>
                <Button 
                  onClick={() => {
                    setDetailsDialog(false);
                    setApprovalDialog(true);
                  }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approuver
                </Button>
                <Button 
                  onClick={() => {
                    setDetailsDialog(false);
                    setRejectionDialog(true);
                  }}
                  variant="destructive"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Rejeter
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Loan Table Component
function LoanTable({ loans, onView, onApprove, onReject, getStatusBadge }: any) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>N° Prêt</TableHead>
          <TableHead>Emprunteur</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Montant</TableHead>
          <TableHead>Durée</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loans.map((loan: Loan) => (
          <TableRow key={loan.id}>
            <TableCell className="font-mono">{loan.loanNumber}</TableCell>
            <TableCell>
              <div>
                <p className="font-medium">
                  {loan.borrower?.firstName} {loan.borrower?.lastName}
                </p>
                <p className="text-sm text-gray-500">{loan.borrower?.email}</p>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="outline">{loan.type}</Badge>
            </TableCell>
            <TableCell>
              {new Intl.NumberFormat('fr-FR', { 
                style: 'currency', 
                currency: 'EUR' 
              }).format(loan.amount)}
            </TableCell>
            <TableCell>{loan.numberOfInstallments} mois</TableCell>
            <TableCell>{getStatusBadge(loan.status)}</TableCell>
            <TableCell>
              {format(new Date(loan.createdAt), 'dd MMM yyyy', { locale: fr })}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onView(loan)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                {['SUBMITTED', 'UNDER_REVIEW'].includes(loan.status) && onApprove && (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-green-600"
                      onClick={() => onApprove(loan)}
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600"
                      onClick={() => onReject && onReject(loan)}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
        {loans.length === 0 && (
          <TableRow>
            <TableCell colSpan={8} className="text-center text-gray-500 py-8">
              Aucun prêt trouvé
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

// Loan Details Component
function LoanDetails({ loan }: { loan: Loan }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="font-semibold mb-2">Informations du prêt</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Numéro:</dt>
              <dd className="font-medium">{loan.loanNumber}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Type:</dt>
              <dd>{loan.type}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Montant:</dt>
              <dd className="font-medium">
                {new Intl.NumberFormat('fr-FR', { 
                  style: 'currency', 
                  currency: 'EUR' 
                }).format(loan.amount)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Durée:</dt>
              <dd>{loan.numberOfInstallments} mois</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Objet:</dt>
              <dd>{loan.purpose}</dd>
            </div>
          </dl>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Emprunteur</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Nom:</dt>
              <dd className="font-medium">
                {loan.borrower?.firstName} {loan.borrower?.lastName}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Email:</dt>
              <dd>{loan.borrower?.email}</dd>
            </div>
          </dl>
        </div>
      </div>

      {loan.documents && loan.documents.length > 0 && (
        <div>
          <h3 className="font-semibold mb-2">Documents ({loan.documents.length})</h3>
          <div className="space-y-2">
            {loan.documents.map((doc: any) => (
              <div key={doc.id} className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm">{doc.name}</span>
                  <Badge variant={doc.isVerified ? 'success' : 'secondary'} className="text-xs">
                    {doc.isVerified ? 'Vérifié' : 'Non vérifié'}
                  </Badge>
                </div>
                <Button size="sm" variant="ghost">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {loan.guarantees && loan.guarantees.length > 0 && (
        <div>
          <h3 className="font-semibold mb-2">Garanties ({loan.guarantees.length})</h3>
          <div className="space-y-2">
            {loan.guarantees.map((guarantee: any) => (
              <div key={guarantee.id} className="p-2 border rounded">
                <div className="flex justify-between">
                  <span className="text-sm">
                    {guarantee.guarantor?.firstName} {guarantee.guarantor?.lastName}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {new Intl.NumberFormat('fr-FR', { 
                        style: 'currency', 
                        currency: 'EUR' 
                      }).format(guarantee.amount)}
                    </span>
                    <Badge variant={guarantee.status === 'ACTIVE' ? 'success' : 'secondary'}>
                      {guarantee.status}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}