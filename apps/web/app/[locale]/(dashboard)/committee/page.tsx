'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from '@/components/ui/use-toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import api from '@/lib/api';
import {
  BarChart3,
  TrendingUp,
  Users,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  Calendar,
  ArrowRight,
  Activity,
  Target,
} from 'lucide-react';

export default function CommitteeDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState({
    pendingReview: 0,
    myVotes: 0,
    approvalRate: 0,
    avgReviewTime: '0 jours',
    monthlyReviewed: 0,
    totalApproved: 0,
    totalRejected: 0,
    abstentions: 0,
  });
  const [recentLoans, setRecentLoans] = useState([]);
  const [myRecentVotes, setMyRecentVotes] = useState([]);
  const [upcomingMeetings, setUpcomingMeetings] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch statistics
      const statsResponse = await api.get('/loans/statistics');
      const loansResponse = await api.get('/loans?status=UNDER_REVIEW&take=5');
      
      // Process statistics
      const stats = statsResponse.data;
      setStatistics({
        pendingReview: (stats.byStatus?.SUBMITTED || 0) + (stats.byStatus?.UNDER_REVIEW || 0),
        myVotes: stats.votedByCurrentUser || 0,
        approvalRate: stats.approvalRate || 0,
        avgReviewTime: stats.avgApprovalTime || '0 jours',
        monthlyReviewed: stats.monthlyReviewed || 0,
        totalApproved: stats.byStatus?.APPROVED || 0,
        totalRejected: stats.byStatus?.REJECTED || 0,
        abstentions: stats.abstentions || 0,
      });

      // Set recent loans
      const loans = loansResponse.data.data || loansResponse.data;
      setRecentLoans(Array.isArray(loans) ? loans.slice(0, 5) : []);

      // Mock upcoming meetings (in real app, would fetch from backend)
      setUpcomingMeetings([
        {
          id: 1,
          title: 'Comité mensuel',
          date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          attendees: 5,
          loansToReview: 8,
        },
        {
          id: 2,
          title: 'Révision urgente',
          date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          attendees: 3,
          loansToReview: 2,
        },
      ]);

      // Mock recent votes (in real app, would fetch user's votes)
      setMyRecentVotes([
        {
          id: 1,
          loanNumber: 'LOAN-2025-001',
          borrower: 'Jean Dupont',
          amount: 5000,
          vote: 'APPROVE',
          date: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
        {
          id: 2,
          loanNumber: 'LOAN-2025-002',
          borrower: 'Marie Martin',
          amount: 3000,
          vote: 'REJECT',
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        },
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getVoteBadge = (vote) => {
    switch (vote) {
      case 'APPROVE':
        return <Badge className="bg-green-500">Approuvé</Badge>;
      case 'REJECT':
        return <Badge variant="destructive">Rejeté</Badge>;
      case 'ABSTAIN':
        return <Badge variant="secondary">Abstention</Badge>;
      default:
        return <Badge>{vote}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Tableau de Bord Comité</h1>
          <p className="text-muted-foreground">Vue d&apos;ensemble de votre activité au comité d&apos;approbation</p>
        </div>
        <Button onClick={() => router.push('/committee/loans')}>
          <FileText className="mr-2 h-4 w-4" />
          Voir toutes les demandes
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En attente</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.pendingReview}</div>
            <p className="text-xs text-muted-foreground">Demandes à examiner</p>
            <Progress value={33} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mes votes</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.myVotes}</div>
            <p className="text-xs text-muted-foreground">Ce mois-ci</p>
            <div className="flex gap-4 mt-2 text-xs">
              <span className="text-green-600">✓ {statistics.totalApproved}</span>
              <span className="text-red-600">✗ {statistics.totalRejected}</span>
              <span className="text-gray-600">○ {statistics.abstentions}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux d&apos;approbation</CardTitle>
            <Target className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.approvalRate}%</div>
            <p className="text-xs text-muted-foreground">Sur vos votes</p>
            <Progress value={statistics.approvalRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Temps moyen</CardTitle>
            <Clock className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.avgReviewTime}</div>
            <p className="text-xs text-muted-foreground">Délai de traitement</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Loans to Review */}
        <Card>
          <CardHeader>
            <CardTitle>Demandes récentes à examiner</CardTitle>
            <CardDescription>Prêts en attente de votre vote</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentLoans.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  Aucune demande en attente
                </p>
              ) : (
                recentLoans.map((loan) => (
                  <div
                    key={loan.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => router.push(`/loans/${loan.id}`)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">{loan.loanNumber}</span>
                        <Badge variant={loan.type === 'URGENT' ? 'destructive' : 'default'}>
                          {loan.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {loan.borrower?.firstName} {loan.borrower?.lastName}
                      </p>
                      <p className="font-semibold">{formatCurrency(loan.amount)}</p>
                    </div>
                    <Button variant="ghost" size="sm">
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* My Recent Votes */}
        <Card>
          <CardHeader>
            <CardTitle>Mes votes récents</CardTitle>
            <CardDescription>Historique de vos dernières décisions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {myRecentVotes.map((vote) => (
                <div key={vote.id} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">{vote.loanNumber}</span>
                      {getVoteBadge(vote.vote)}
                    </div>
                    <p className="text-sm text-muted-foreground">{vote.borrower}</p>
                    <p className="text-sm">{formatCurrency(vote.amount)}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(vote.date)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Meetings */}
      <Card>
        <CardHeader>
          <CardTitle>Prochaines réunions du comité</CardTitle>
          <CardDescription>Sessions d&apos;évaluation planifiées</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {upcomingMeetings.map((meeting) => (
              <div key={meeting.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Calendar className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold">{meeting.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(meeting.date)} • {meeting.attendees} participants
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">{meeting.loansToReview}</span> prêts à examiner
                    </p>
                  </div>
                </div>
                <Button variant="outline">
                  Voir détails
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions rapides</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => router.push('/committee/loans?status=URGENT')}
            >
              <AlertCircle className="mr-2 h-4 w-4 text-red-500" />
              Voir les demandes urgentes
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => router.push('/committee/history')}
            >
              <Clock className="mr-2 h-4 w-4 text-blue-500" />
              Historique des votes
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => router.push('/committee/statistics')}
            >
              <BarChart3 className="mr-2 h-4 w-4 text-green-500" />
              Statistiques détaillées
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}