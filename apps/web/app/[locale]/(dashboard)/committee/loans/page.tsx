'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from '@/components/ui/use-toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import api from '@/lib/api';
import {
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  FileText,
  Users,
  TrendingUp,
  Calendar,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
} from 'lucide-react';

export default function CommitteeLoanReview() {
  const router = useRouter();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState({
    totalPending: 0,
    votedByMe: 0,
    avgApprovalTime: '0 jours',
    approvalRate: 0,
  });
  const [filters, setFilters] = useState({
    status: 'UNDER_REVIEW',
    search: '',
    type: 'all',
  });
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [voteDialog, setVoteDialog] = useState(false);
  const [voteData, setVoteData] = useState({
    vote: '',
    comment: '',
    conditions: '',
  });

  useEffect(() => {
    fetchLoans();
    fetchStatistics();
  }, [filters]);

  const fetchLoans = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.type !== 'all') params.append('type', filters.type);
      
      const response = await api.get(`/loans?${params}`);
      const loansData = response.data.data || response.data;
      
      // Filter for committee review
      const committeeLoans = Array.isArray(loansData) 
        ? loansData.filter(loan => 
            ['SUBMITTED', 'UNDER_REVIEW'].includes(loan.status)
          )
        : [];
      
      setLoans(committeeLoans);
    } catch (error) {
      console.error('Error fetching loans:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les prêts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await api.get('/loans/statistics');
      const stats = response.data;
      
      setStatistics({
        totalPending: (stats.byStatus?.SUBMITTED || 0) + (stats.byStatus?.UNDER_REVIEW || 0),
        votedByMe: stats.votedByCurrentUser || 0,
        avgApprovalTime: stats.avgApprovalTime || '0 jours',
        approvalRate: stats.approvalRate || 0,
      });
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const handleVote = async () => {
    if (!selectedLoan || !voteData.vote) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un vote",
        variant: "destructive",
      });
      return;
    }

    try {
      await api.post(`/loans/${selectedLoan.id}/vote`, {
        vote: voteData.vote,
        comment: voteData.comment,
        conditions: voteData.conditions,
      });

      toast({
        title: "Vote enregistré",
        description: "Votre vote a été enregistré avec succès",
      });

      setVoteDialog(false);
      setVoteData({ vote: '', comment: '', conditions: '' });
      fetchLoans();
    } catch (error) {
      toast({
        title: "Erreur",
        description: error.response?.data?.message || "Impossible d'enregistrer le vote",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      SUBMITTED: { label: 'Soumis', variant: 'secondary' },
      UNDER_REVIEW: { label: 'En révision', variant: 'warning' },
      APPROVED: { label: 'Approuvé', variant: 'success' },
      REJECTED: { label: 'Rejeté', variant: 'destructive' },
    };

    const config = statusConfig[status] || { label: status, variant: 'default' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getLoanTypeBadge = (type) => {
    const typeConfig = {
      STANDARD: { label: 'Standard', variant: 'default' },
      URGENT: { label: 'Urgent', variant: 'destructive' },
      SOCIAL: { label: 'Social', variant: 'secondary' },
      BUSINESS: { label: 'Professionnel', variant: 'outline' },
    };

    const config = typeConfig[type] || { label: type, variant: 'default' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Comité d&apos;Approbation</h1>
          <p className="text-muted-foreground">Examinez et votez sur les demandes de prêt</p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En attente</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.totalPending}</div>
            <p className="text-xs text-muted-foreground">Demandes à examiner</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mes votes</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.votedByMe}</div>
            <p className="text-xs text-muted-foreground">Votes effectués</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Temps moyen</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.avgApprovalTime}</div>
            <p className="text-xs text-muted-foreground">Délai d&apos;approbation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux d&apos;approbation</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.approvalRate}%</div>
            <p className="text-xs text-muted-foreground">Prêts approuvés</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  className="pl-8"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                />
              </div>
            </div>
            
            <Select
              value={filters.status}
              onValueChange={(value) => setFilters({ ...filters, status: value })}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="SUBMITTED">Soumis</SelectItem>
                <SelectItem value="UNDER_REVIEW">En révision</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.type}
              onValueChange={(value) => setFilters({ ...filters, type: value })}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="STANDARD">Standard</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
                <SelectItem value="SOCIAL">Social</SelectItem>
                <SelectItem value="BUSINESS">Professionnel</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Loans Table */}
      <Card>
        <CardHeader>
          <CardTitle>Demandes de prêt en attente</CardTitle>
          <CardDescription>
            Cliquez sur une demande pour voir les détails et voter
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : loans.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Aucune demande en attente d&apos;examen</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° Prêt</TableHead>
                  <TableHead>Emprunteur</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Durée</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date soumission</TableHead>
                  <TableHead>Votes</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loans.map((loan) => (
                  <TableRow key={loan.id}>
                    <TableCell className="font-mono">{loan.loanNumber}</TableCell>
                    <TableCell>
                      {loan.borrower?.firstName} {loan.borrower?.lastName}
                    </TableCell>
                    <TableCell>{getLoanTypeBadge(loan.type)}</TableCell>
                    <TableCell>{formatCurrency(loan.amount)}</TableCell>
                    <TableCell>{loan.numberOfInstallments} mois</TableCell>
                    <TableCell>{getStatusBadge(loan.status)}</TableCell>
                    <TableCell>{formatDate(loan.requestDate)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-green-600 flex items-center gap-1">
                          <ThumbsUp className="h-4 w-4" />
                          {loan.approvalVotes?.filter(v => v.vote === 'APPROVE').length || 0}
                        </span>
                        <span className="text-red-600 flex items-center gap-1">
                          <ThumbsDown className="h-4 w-4" />
                          {loan.approvalVotes?.filter(v => v.vote === 'REJECT').length || 0}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/loans/${loan.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Voir
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedLoan(loan);
                            setVoteDialog(true);
                          }}
                        >
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Voter
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Vote Dialog */}
      <Dialog open={voteDialog} onOpenChange={setVoteDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Voter sur la demande</DialogTitle>
            <DialogDescription>
              Prêt N° {selectedLoan?.loanNumber} - {formatCurrency(selectedLoan?.amount)}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Votre décision</Label>
              <RadioGroup
                value={voteData.vote}
                onValueChange={(value) => setVoteData({ ...voteData, vote: value })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="APPROVE" id="approve" />
                  <Label htmlFor="approve" className="flex items-center gap-2 cursor-pointer">
                    <ThumbsUp className="h-4 w-4 text-green-600" />
                    Approuver
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="REJECT" id="reject" />
                  <Label htmlFor="reject" className="flex items-center gap-2 cursor-pointer">
                    <ThumbsDown className="h-4 w-4 text-red-600" />
                    Rejeter
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="ABSTAIN" id="abstain" />
                  <Label htmlFor="abstain" className="flex items-center gap-2 cursor-pointer">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    S'abstenir
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {voteData.vote === 'APPROVE' && (
              <div className="space-y-2">
                <Label htmlFor="conditions">Conditions (optionnel)</Label>
                <Textarea
                  id="conditions"
                  placeholder="Conditions spécifiques pour l'approbation..."
                  value={voteData.conditions}
                  onChange={(e) => setVoteData({ ...voteData, conditions: e.target.value })}
                  rows={3}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="comment">Commentaire</Label>
              <Textarea
                id="comment"
                placeholder="Ajoutez vos observations..."
                value={voteData.comment}
                onChange={(e) => setVoteData({ ...voteData, comment: e.target.value })}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setVoteDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleVote} disabled={!voteData.vote}>
              Enregistrer mon vote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}