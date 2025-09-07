'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft,
  Calendar,
  Clock,
  DollarSign,
  FileText,
  Shield,
  User,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  Download,
  Eye,
  Send,
} from 'lucide-react';

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-500',
  SUBMITTED: 'bg-blue-500',
  UNDER_REVIEW: 'bg-yellow-500',
  APPROVED: 'bg-green-500',
  REJECTED: 'bg-red-500',
  DISBURSED: 'bg-purple-500',
  ACTIVE: 'bg-indigo-500',
  COMPLETED: 'bg-teal-500',
  DEFAULTED: 'bg-orange-500',
  CANCELLED: 'bg-gray-400',
};

const statusLabels: Record<string, string> = {
  DRAFT: 'Brouillon',
  SUBMITTED: 'Soumis',
  UNDER_REVIEW: 'En examen',
  APPROVED: 'Approuvé',
  REJECTED: 'Rejeté',
  DISBURSED: 'Décaissé',
  ACTIVE: 'Actif',
  COMPLETED: 'Terminé',
  DEFAULTED: 'En défaut',
  CANCELLED: 'Annulé',
};

export default function LoanDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const loanId = params.id as string;
  
  const [loan, setLoan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<any[]>([]);
  const [guarantees, setGuarantees] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);

  useEffect(() => {
    if (loanId) {
      fetchLoanDetails();
    }
  }, [loanId]);

  const fetchLoanDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch loan details
      const loanResponse = await apiClient.get(`/loans/${loanId}`);
      setLoan(loanResponse.data);
      
      // Fetch related data (handle errors gracefully)
      try {
        const docsResponse = await apiClient.get(`/documents?loanId=${loanId}`);
        setDocuments(docsResponse.data);
      } catch (error) {
        console.warn('Could not fetch documents:', error);
      }
      
      try {
        const guaranteesResponse = await apiClient.get(`/guarantees?loanId=${loanId}`);
        setGuarantees(guaranteesResponse.data);
      } catch (error) {
        console.warn('Could not fetch guarantees:', error);
      }
      
      // Payments endpoint might not exist yet
      try {
        const paymentsResponse = await apiClient.get(`/payments?loanId=${loanId}`);
        setPayments(paymentsResponse.data);
      } catch (error) {
        console.warn('Could not fetch payments:', error);
        // This is expected if payments endpoint doesn't exist
      }
    } catch (error: any) {
      console.error('Error fetching loan:', error);
      toast.error('Erreur lors du chargement du prêt');
      router.push('/loans');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusAction = async (action: string) => {
    try {
      let endpoint = `/loans/${loanId}`;
      let method = 'patch';
      let data: any = {};
      
      switch (action) {
        case 'submit':
          data = { status: 'SUBMITTED' };
          break;
        case 'cancel':
          endpoint = `/loans/${loanId}/cancel`;
          method = 'post';
          break;
        case 'start-review':
          endpoint = `/loans/${loanId}/start-review`;
          method = 'post';
          break;
        default:
          return;
      }
      
      const response = method === 'patch' 
        ? await apiClient.patch(endpoint, data)
        : await apiClient.post(endpoint, data);
        
      toast.success('Action effectuée avec succès');
      fetchLoanDetails();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'action');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!loan) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 text-muted-foreground">
              <AlertCircle className="h-5 w-5" />
              <p>Prêt non trouvé</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalPaid = payments
    .filter(p => p.status === 'COMPLETED')
    .reduce((sum, p) => sum + p.amount, 0);
  const progressPercentage = (totalPaid / loan.amount) * 100;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/loans')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              Prêt #{loan.loanNumber || loan.id?.slice(-8) || 'N/A'}
            </h1>
            <p className="text-muted-foreground">
              {loan.createdAt && 
                `Créé le ${format(new Date(loan.createdAt), 'dd MMMM yyyy', { locale: fr })}`
              }
            </p>
          </div>
        </div>
        <Badge className={`${statusColors[loan.status]} text-white`}>
          {statusLabels[loan.status]}
        </Badge>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column - Loan Details */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Détails du prêt</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Montant</p>
                  <p className="text-2xl font-bold">{loan.amount.toLocaleString()} €</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p className="font-medium">{loan.type}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Nombre de mensualités</p>
                  <p className="font-medium">{loan.numberOfInstallments}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Objet</p>
                  <p className="font-medium">{loan.purpose || 'Non spécifié'}</p>
                </div>
              </div>
              
              {loan.status === 'ACTIVE' && (
                <div className="pt-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Progression du remboursement</span>
                    <span>{progressPercentage.toFixed(1)}%</span>
                  </div>
                  <Progress value={progressPercentage} />
                  <p className="text-xs text-muted-foreground mt-1">
                    {totalPaid.toLocaleString()} € sur {loan.amount.toLocaleString()} €
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tabs for Documents, Guarantees, Payments */}
          <Tabs defaultValue="documents">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="documents">
                Documents ({documents.length})
              </TabsTrigger>
              <TabsTrigger value="guarantees">
                Garanties ({guarantees.length})
              </TabsTrigger>
              <TabsTrigger value="payments">
                Paiements ({payments.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="documents" className="space-y-4">
              {documents.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center text-muted-foreground">
                    Aucun document
                  </CardContent>
                </Card>
              ) : (
                documents.map((doc) => (
                  <Card key={doc.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{doc.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {doc.type} • {(doc.size / 1024).toFixed(2)} KB
                            </p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="ghost">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
            
            <TabsContent value="guarantees" className="space-y-4">
              {guarantees.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center text-muted-foreground">
                    Aucune garantie
                  </CardContent>
                </Card>
              ) : (
                guarantees.map((guarantee) => (
                  <Card key={guarantee.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Shield className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">
                              {guarantee.guarantor?.firstName} {guarantee.guarantor?.lastName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {guarantee.type} • {guarantee.amount?.toLocaleString()} €
                            </p>
                          </div>
                        </div>
                        <Badge variant={guarantee.status === 'ACCEPTED' ? 'default' : 'secondary'}>
                          {guarantee.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
            
            <TabsContent value="payments" className="space-y-4">
              {payments.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center text-muted-foreground">
                    Aucun paiement
                  </CardContent>
                </Card>
              ) : (
                payments.map((payment) => (
                  <Card key={payment.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">
                            Échéance #{payment.installmentNumber}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {payment.dueDate && format(new Date(payment.dueDate), 'dd MMMM yyyy', { locale: fr })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{payment.amount.toLocaleString()} €</p>
                          <Badge variant={payment.status === 'COMPLETED' ? 'default' : 'secondary'}>
                            {payment.status}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Actions & Info */}
        <div className="space-y-6">
          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {loan.status === 'DRAFT' && (
                <>
                  <Button 
                    className="w-full"
                    onClick={() => router.push(`/loans/${loanId}/edit`)}
                  >
                    Modifier
                  </Button>
                  <Button 
                    className="w-full"
                    variant="default"
                    onClick={() => handleStatusAction('submit')}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Soumettre
                  </Button>
                </>
              )}
              
              {(loan.status === 'DRAFT' || loan.status === 'SUBMITTED') && (
                <Button 
                  className="w-full"
                  variant="destructive"
                  onClick={() => handleStatusAction('cancel')}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Annuler
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Borrower Info */}
          <Card>
            <CardHeader>
              <CardTitle>Emprunteur</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">
                    {loan.borrower?.firstName} {loan.borrower?.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {loan.borrower?.email}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Historique</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {loan.createdAt && (
                  <div className="flex items-start space-x-3">
                    <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                    <div>
                      <p className="text-sm font-medium">Créé</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(loan.createdAt), 'dd MMM yyyy HH:mm', { locale: fr })}
                      </p>
                    </div>
                  </div>
                )}
                {loan.updatedAt && loan.updatedAt !== loan.createdAt && (
                  <div className="flex items-start space-x-3">
                    <div className="h-2 w-2 rounded-full bg-muted-foreground mt-2" />
                    <div>
                      <p className="text-sm font-medium">Dernière modification</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(loan.updatedAt), 'dd MMM yyyy HH:mm', { locale: fr })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}