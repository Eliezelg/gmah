'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Eye } from 'lucide-react';

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

export default function MyLoansPage() {
  const router = useRouter();
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyLoans();
  }, []);

  const fetchMyLoans = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/loans/my-loans');
      // Handle both array and object responses
      const loansData = Array.isArray(response.data) 
        ? response.data 
        : response.data.loans || response.data.data || [];
      setLoans(loansData);
    } catch (error: any) {
      console.error('Error fetching loans:', error);
      toast.error('Erreur lors du chargement de vos prêts');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mes prêts</h1>
          <p className="text-muted-foreground">
            Gérez vos demandes de prêt et suivez leur statut
          </p>
        </div>
        <Button onClick={() => router.push('/loans/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle demande
        </Button>
      </div>

      {/* Loans List */}
      {!Array.isArray(loans) || loans.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">
              Vous n'avez pas encore de demande de prêt
            </p>
            <Button 
              className="mt-4"
              onClick={() => router.push('/loans/new')}
            >
              Faire une demande
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {loans.map((loan) => (
            <Card key={loan.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">
                        Prêt #{loan.loanNumber || loan.id?.slice(-8) || 'N/A'}
                      </h3>
                      <Badge className={`${statusColors[loan.status]} text-white`}>
                        {statusLabels[loan.status]}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Montant: <span className="font-medium text-foreground">{loan.amount?.toLocaleString()} €</span></p>
                      <p>Type: <span className="font-medium text-foreground">{loan.type}</span></p>
                      <p>Objet: <span className="font-medium text-foreground">{loan.purpose || 'Non spécifié'}</span></p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/loans/${loan.id}`)}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Voir détails
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}