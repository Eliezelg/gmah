'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  FileText,
  User,
  Calendar,
  Euro,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Pause,
  ArrowRight,
  Download,
  Eye,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Loan {
  id: string;
  loanNumber: string;
  amount: number;
  status: string;
  type: string;
  purpose: string;
  purposeDetails?: any;
  numberOfInstallments: number;
  installmentAmount: number;
  createdAt: string;
  reviewStartDate?: string;
  borrower: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  approvalVotes?: Array<{
    id: string;
    vote: 'APPROVE' | 'REJECT' | 'ABSTAIN' | 'REQUEST_INFO';
    comment?: string;
    createdAt: string;
    voter: {
      id: string;
      firstName: string;
      lastName: string;
    };
  }>;
  _count?: {
    approvalVotes: number;
    documents: number;
  };
}

const voteIcons = {
  APPROVE: ThumbsUp,
  REJECT: ThumbsDown,
  ABSTAIN: Pause,
  REQUEST_INFO: MessageSquare,
};

const voteColors = {
  APPROVE: 'text-green-600',
  REJECT: 'text-red-600',
  ABSTAIN: 'text-gray-600',
  REQUEST_INFO: 'text-blue-600',
};

export default function CommitteeReviewsPage() {
  const queryClient = useQueryClient();
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [voteDialogOpen, setVoteDialogOpen] = useState(false);
  const [voteType, setVoteType] = useState<'APPROVE' | 'REJECT' | 'ABSTAIN' | 'REQUEST_INFO'>('APPROVE');
  const [voteComment, setVoteComment] = useState('');

  const { data: loansData, isLoading } = useQuery({
    queryKey: ['committee-loans'],
    queryFn: async () => {
      const response = await apiClient.get<{ loans: Loan[]; total: number }>('/loans', {
        params: { status: 'UNDER_REVIEW' },
      });
      return response.data;
    },
  });

  const startReviewMutation = useMutation({
    mutationFn: async (loanId: string) => {
      const response = await apiClient.post(`/loans/${loanId}/start-review`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['committee-loans'] });
      toast.success('Examen démarré');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors du démarrage de l\'examen');
    },
  });

  const voteMutation = useMutation({
    mutationFn: async ({ loanId, vote, comment }: { loanId: string; vote: string; comment: string }) => {
      const response = await apiClient.post(`/loans/${loanId}/vote`, { vote, comment });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['committee-loans'] });
      setVoteDialogOpen(false);
      setVoteComment('');
      
      if (data.summary.approveVotes > data.summary.totalVotes / 2) {
        toast.success('Vote enregistré. Le prêt a été approuvé par la majorité!');
      } else if (data.summary.rejectVotes > data.summary.totalVotes / 2) {
        toast.error('Vote enregistré. Le prêt a été rejeté par la majorité.');
      } else {
        toast.success('Vote enregistré avec succès');
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors du vote');
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const pendingLoans = loansData?.loans?.filter(loan => loan.status === 'SUBMITTED') || [];
  const underReviewLoans = loansData?.loans?.filter(loan => loan.status === 'UNDER_REVIEW') || [];

  const handleStartReview = (loan: Loan) => {
    startReviewMutation.mutate(loan.id);
  };

  const handleVote = () => {
    if (!selectedLoan) return;
    voteMutation.mutate({
      loanId: selectedLoan.id,
      vote: voteType,
      comment: voteComment,
    });
  };

  const openVoteDialog = (loan: Loan) => {
    setSelectedLoan(loan);
    setVoteDialogOpen(true);
  };

  const hasUserVoted = (loan: Loan) => {
    // TODO: Check if current user has voted based on user ID from auth store
    return false;
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Comité d&apos;Approbation</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Examinez et votez sur les demandes de prêt
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En attente</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingLoans.length}</div>
            <p className="text-xs text-muted-foreground">
              Demandes à examiner
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En cours d&apos;examen</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{underReviewLoans.length}</div>
            <p className="text-xs text-muted-foreground">
              Votes en cours
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total à traiter</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loansData?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              Demandes actives
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Loans Tabs */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            En attente ({pendingLoans.length})
          </TabsTrigger>
          <TabsTrigger value="review">
            En examen ({underReviewLoans.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingLoans.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <CheckCircle className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-lg font-medium">Aucune demande en attente</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Toutes les demandes ont été traitées
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
                        <CardDescription>
                          {loan.borrower.firstName} {loan.borrower.lastName} - {loan.borrower.email}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary">En attente</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Montant</p>
                        <p className="font-semibold">{formatCurrency(loan.amount)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Type</p>
                        <p className="font-semibold">{loan.type}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Durée</p>
                        <p className="font-semibold">{loan.numberOfInstallments} mois</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Mensualité</p>
                        <p className="font-semibold">{formatCurrency(loan.installmentAmount)}</p>
                      </div>
                    </div>
                    <Separator className="my-4" />
                    <div className="mb-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Objet du prêt</p>
                      <p className="text-sm">{loan.purpose}</p>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        Soumis le {format(new Date(loan.createdAt), 'dd MMM yyyy', { locale: fr })}
                      </div>
                      <Button onClick={() => handleStartReview(loan)}>
                        Démarrer l'examen
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="review" className="space-y-4">
          {underReviewLoans.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-lg font-medium">Aucune demande en examen</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Sélectionnez une demande en attente pour commencer l'examen
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {underReviewLoans.map((loan) => (
                <Card key={loan.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{loan.loanNumber}</CardTitle>
                        <CardDescription>
                          {loan.borrower.firstName} {loan.borrower.lastName} - {loan.borrower.email}
                        </CardDescription>
                      </div>
                      <Badge variant="warning">En examen</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Montant</p>
                        <p className="font-semibold">{formatCurrency(loan.amount)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Type</p>
                        <p className="font-semibold">{loan.type}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Durée</p>
                        <p className="font-semibold">{loan.numberOfInstallments} mois</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Documents</p>
                        <p className="font-semibold">{loan._count?.documents || 0} fichiers</p>
                      </div>
                    </div>

                    {/* Voting Status */}
                    {loan.approvalVotes && loan.approvalVotes.length > 0 && (
                      <>
                        <Separator className="my-4" />
                        <div className="space-y-3">
                          <p className="text-sm font-medium">Votes du comité ({loan.approvalVotes.length})</p>
                          <div className="grid gap-2">
                            {loan.approvalVotes.map((vote) => {
                              const Icon = voteIcons[vote.vote];
                              return (
                                <div key={vote.id} className="flex items-start gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback className="text-xs">
                                      {vote.voter.firstName[0]}{vote.voter.lastName[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium">
                                        {vote.voter.firstName} {vote.voter.lastName}
                                      </span>
                                      <Icon className={`h-4 w-4 ${voteColors[vote.vote]}`} />
                                      <Badge variant="outline" className="text-xs">
                                        {vote.vote === 'APPROVE' && 'Approuvé'}
                                        {vote.vote === 'REJECT' && 'Rejeté'}
                                        {vote.vote === 'ABSTAIN' && 'Abstention'}
                                        {vote.vote === 'REQUEST_INFO' && 'Infos requises'}
                                      </Badge>
                                    </div>
                                    {vote.comment && (
                                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                        {vote.comment}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    )}

                    <Separator className="my-4" />
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          En examen depuis {loan.reviewStartDate && format(new Date(loan.reviewStartDate), 'dd MMM', { locale: fr })}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline">
                          <Download className="mr-2 h-4 w-4" />
                          Documents
                        </Button>
                        {!hasUserVoted(loan) && (
                          <Button onClick={() => openVoteDialog(loan)}>
                            Voter
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Vote Dialog */}
      <Dialog open={voteDialogOpen} onOpenChange={setVoteDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Voter pour le prêt {selectedLoan?.loanNumber}</DialogTitle>
            <DialogDescription>
              Votre vote est définitif et ne pourra pas être modifié.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-3">
              <Label>Votre décision</Label>
              <RadioGroup value={voteType} onValueChange={(value: any) => setVoteType(value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="APPROVE" id="approve" />
                  <Label htmlFor="approve" className="flex items-center gap-2 cursor-pointer">
                    <ThumbsUp className="h-4 w-4 text-green-600" />
                    Approuver le prêt
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="REJECT" id="reject" />
                  <Label htmlFor="reject" className="flex items-center gap-2 cursor-pointer">
                    <ThumbsDown className="h-4 w-4 text-red-600" />
                    Rejeter le prêt
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="ABSTAIN" id="abstain" />
                  <Label htmlFor="abstain" className="flex items-center gap-2 cursor-pointer">
                    <Pause className="h-4 w-4 text-gray-600" />
                    S'abstenir
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="REQUEST_INFO" id="request_info" />
                  <Label htmlFor="request_info" className="flex items-center gap-2 cursor-pointer">
                    <MessageSquare className="h-4 w-4 text-blue-600" />
                    Demander plus d'informations
                  </Label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label htmlFor="comment">Commentaire (optionnel)</Label>
              <Textarea
                id="comment"
                placeholder="Ajoutez un commentaire pour expliquer votre décision..."
                value={voteComment}
                onChange={(e) => setVoteComment(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoteDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleVote} disabled={voteMutation.isPending}>
              {voteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmer le vote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}