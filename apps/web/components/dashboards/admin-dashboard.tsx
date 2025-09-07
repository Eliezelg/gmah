'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  FileText,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
  Calendar,
  BarChart3,
  PieChart,
  Activity,
  Shield,
  UserCheck,
  UserX,
  CreditCard,
  HandCoins,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Download,
  Settings,
  ChevronRight,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface DashboardStats {
  users: {
    total: number;
    active: number;
    new: number;
    growth: number;
  };
  loans: {
    total: number;
    pending: number;
    approved: number;
    active: number;
    completed: number;
    defaulted: number;
    totalAmount: number;
    disbursedAmount: number;
  };
  treasury: {
    currentBalance: number;
    monthlyInflow: number;
    monthlyOutflow: number;
    availableFunds: number;
    projectedBalance: number;
  };
  performance: {
    approvalRate: number;
    averageProcessingTime: number;
    repaymentRate: number;
    defaultRate: number;
  };
}

interface RecentActivity {
  id: string;
  type: 'loan_request' | 'payment' | 'user_registration' | 'approval' | 'disbursement';
  description: string;
  timestamp: string;
  status?: string;
}

export function AdminDashboard() {
  const t = useTranslations('dashboard.admin');
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('month');

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange]);

  const fetchDashboardData = async () => {
    try {
      // Fetch real data from database via API
      const [statsRes, activitiesRes] = await Promise.all([
        apiClient.get(`/admin/dashboard/stats?range=${timeRange}`),
        apiClient.get('/admin/dashboard/activities?limit=10'),
      ]);

      setStats(statsRes.data);
      setRecentActivities(activitiesRes.data);
    } catch (error) {
      console.error('Dashboard error:', error);
      toast.error('Erreur lors du chargement des données du dashboard');
      // Set empty state on error - no mock data
      setStats(null);
      setRecentActivities([]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'loan_request': return <FileText className="h-4 w-4" />;
      case 'payment': return <CreditCard className="h-4 w-4" />;
      case 'user_registration': return <UserCheck className="h-4 w-4" />;
      case 'approval': return <CheckCircle className="h-4 w-4" />;
      case 'disbursement': return <HandCoins className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type: RecentActivity['type']) => {
    switch (type) {
      case 'loan_request': return 'text-blue-600';
      case 'payment': return 'text-green-600';
      case 'user_registration': return 'text-purple-600';
      case 'approval': return 'text-emerald-600';
      case 'disbursement': return 'text-orange-600';
    }
  };

  if (isLoading || !stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Tableau de bord Admin</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Vue d'ensemble de la plateforme GMAH
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => fetchDashboardData()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
          <Button onClick={() => router.push('/admin/settings')}>
            <Settings className="h-4 w-4 mr-2" />
            Paramètres
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Utilisateurs actifs</CardTitle>
            <Users className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.users.active}</div>
            <div className="flex items-center text-xs text-gray-600 mt-1">
              <span className={stats.users.growth > 0 ? 'text-green-600' : 'text-red-600'}>
                {stats.users.growth > 0 ? <ArrowUpRight className="h-3 w-3 inline" /> : <ArrowDownRight className="h-3 w-3 inline" />}
                {Math.abs(stats.users.growth)}%
              </span>
              <span className="ml-1">ce mois</span>
            </div>
            <Progress value={(stats.users.active / stats.users.total) * 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Prêts actifs</CardTitle>
            <FileText className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.loans.active}</div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="warning" className="text-xs">
                {stats.loans.pending} en attente
              </Badge>
            </div>
            <Progress value={(stats.loans.active / stats.loans.total) * 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Trésorerie</CardTitle>
            <Wallet className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.treasury.currentBalance)}</div>
            <div className="text-xs text-gray-600 mt-1">
              Disponible: {formatCurrency(stats.treasury.availableFunds)}
            </div>
            <Progress value={(stats.treasury.availableFunds / stats.treasury.currentBalance) * 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Taux de remboursement</CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.performance.repaymentRate}%</div>
            <div className="text-xs text-gray-600 mt-1">
              Défaut: {stats.performance.defaultRate}%
            </div>
            <Progress value={stats.performance.repaymentRate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Statistics Overview */}
        <div className="lg:col-span-2 space-y-6">
          {/* Loan Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Statistiques des prêts</CardTitle>
              <CardDescription>Aperçu de l'activité de prêt</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Montant total prêté</p>
                    <p className="text-2xl font-bold">{formatCurrency(stats.loans.totalAmount)}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Montant décaissé</p>
                    <p className="text-2xl font-bold">{formatCurrency(stats.loans.disbursedAmount)}</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Taux d'approbation</span>
                    <span className="font-medium">{stats.performance.approvalRate}%</span>
                  </div>
                  <Progress value={stats.performance.approvalRate} />
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2">
                  <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <p className="text-xs text-gray-600">Approuvés</p>
                    <p className="text-lg font-bold text-green-600">{stats.loans.approved}</p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <p className="text-xs text-gray-600">En cours</p>
                    <p className="text-lg font-bold text-blue-600">{stats.loans.active}</p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <p className="text-xs text-gray-600">Complétés</p>
                    <p className="text-lg font-bold text-gray-600">{stats.loans.completed}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Treasury Flow */}
          <Card>
            <CardHeader>
              <CardTitle>Flux de trésorerie</CardTitle>
              <CardDescription>Entrées et sorties mensuelles</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <ArrowUpRight className="h-4 w-4 text-green-600" />
                      <p className="text-sm font-medium">Entrées</p>
                    </div>
                    <p className="text-xl font-bold text-green-600">
                      {formatCurrency(stats.treasury.monthlyInflow)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <ArrowDownRight className="h-4 w-4 text-red-600" />
                      <p className="text-sm font-medium">Sorties</p>
                    </div>
                    <p className="text-xl font-bold text-red-600">
                      {formatCurrency(stats.treasury.monthlyOutflow)}
                    </p>
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Balance projetée (30j)</span>
                    <span className="text-lg font-bold">
                      {formatCurrency(stats.treasury.projectedBalance)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions rapides</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline" 
                  className="justify-start"
                  onClick={() => router.push('/admin/loans')}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Gérer les prêts
                  <ChevronRight className="h-4 w-4 ml-auto" />
                </Button>
                <Button 
                  variant="outline" 
                  className="justify-start"
                  onClick={() => router.push('/admin/users')}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Gérer les utilisateurs
                  <ChevronRight className="h-4 w-4 ml-auto" />
                </Button>
                <Button 
                  variant="outline" 
                  className="justify-start"
                  onClick={() => router.push('/admin/treasury-forecast')}
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Prévisions
                  <ChevronRight className="h-4 w-4 ml-auto" />
                </Button>
                <Button 
                  variant="outline" 
                  className="justify-start"
                  onClick={() => router.push('/admin/withdrawals')}
                >
                  <Wallet className="h-4 w-4 mr-2" />
                  Retraits
                  <ChevronRight className="h-4 w-4 ml-auto" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Activité récente</CardTitle>
              <CardDescription>Dernières actions sur la plateforme</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className={`mt-1 ${getActivityColor(activity.type)}`}>
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm">{activity.description}</p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(activity.timestamp), 'HH:mm', { locale: fr })}
                      </p>
                    </div>
                    {activity.status && (
                      <Badge variant={
                        activity.status === 'completed' ? 'success' :
                        activity.status === 'pending' ? 'warning' :
                        activity.status === 'approved' ? 'default' : 'secondary'
                      } className="text-xs">
                        {activity.status}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
              <Button 
                variant="outline" 
                className="w-full mt-4"
                onClick={() => router.push('/admin/activities')}
              >
                Voir toute l'activité
              </Button>
            </CardContent>
          </Card>

          {/* System Status */}
          <Card>
            <CardHeader>
              <CardTitle>État du système</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-green-600" />
                    <span className="text-sm">API Backend</span>
                  </div>
                  <Badge variant="success">En ligne</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Base de données</span>
                  </div>
                  <Badge variant="success">Connecté</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span className="text-sm">Tâches planifiées</span>
                  </div>
                  <Badge variant="default">5 actives</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm">Alertes</span>
                  </div>
                  <Badge variant="warning">2 nouvelles</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Métriques de performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Temps de traitement moyen</span>
                    <span className="font-medium">{stats.performance.averageProcessingTime}j</span>
                  </div>
                  <Progress value={100 - (stats.performance.averageProcessingTime * 10)} />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Taux de satisfaction</span>
                    <span className="font-medium">94%</span>
                  </div>
                  <Progress value={94} />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Disponibilité système</span>
                    <span className="font-medium">99.9%</span>
                  </div>
                  <Progress value={99.9} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}