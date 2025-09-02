'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Shield,
  FileText,
  User,
  Euro,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Loader2,
  FileSignature,
  Info,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Guarantee {
  id: string;
  loanId: string;
  guarantorId: string;
  guarantor?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  loan?: {
    id: string;
    borrowerId: string;
    borrower?: {
      firstName: string;
      lastName: string;
      email: string;
    };
    amount: number;
    numberOfInstallments: number;
    purpose: string;
    type: string;
    status: string;
    createdAt: string;
  };
  type: string;
  amount: number;
  percentage?: number;
  status: string;
  signedDate?: string;
  createdAt: string;
}

export default function GuaranteeSignPage() {
  const params = useParams();
  const router = useRouter();
  const guaranteeId = params.id as string;

  const [guarantee, setGuarantee] = useState<Guarantee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigning, setIsSigning] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedRisks, setAcceptedRisks] = useState(false);
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [signatureText, setSignatureText] = useState('');

  useEffect(() => {
    fetchGuarantee();
  }, [guaranteeId]);

  const fetchGuarantee = async () => {
    try {
      const response = await apiClient.get(`/guarantees/${guaranteeId}`);
      setGuarantee(response.data);
      
      // Generate signature text
      const guarantor = response.data.guarantor;
      if (guarantor) {
        setSignatureText(`${guarantor.firstName} ${guarantor.lastName} - ${new Date().toLocaleDateString('fr-FR')}`);
      }
    } catch (error: any) {
      toast.error('Erreur lors du chargement des informations');
      router.push('/');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSign = async () => {
    if (!acceptedTerms || !acceptedRisks || !acceptedLegal) {
      toast.error('Veuillez accepter toutes les conditions');
      return;
    }

    setIsSigning(true);
    try {
      await apiClient.post(`/guarantees/${guaranteeId}/sign`, {
        signature: signatureText,
        acceptedTerms: true,
        acceptedAt: new Date().toISOString(),
      });

      toast.success('Garantie signée avec succès!');
      router.push('/guarantees/success');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de la signature');
    } finally {
      setIsSigning(false);
    }
  };

  const handleReject = async () => {
    if (!confirm('Êtes-vous sûr de vouloir refuser cette garantie?')) {
      return;
    }

    setIsSigning(true);
    try {
      await apiClient.post(`/guarantees/${guaranteeId}/reject`);
      toast.info('Garantie refusée');
      router.push('/');
    } catch (error) {
      toast.error('Erreur lors du refus');
    } finally {
      setIsSigning(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!guarantee) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-gray-500">Garantie introuvable</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (guarantee.status !== 'PENDING') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            {guarantee.status === 'ACTIVE' && (
              <>
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                <p className="font-semibold">Cette garantie a déjà été signée</p>
                {guarantee.signedDate && (
                  <p className="text-sm text-gray-500">
                    Signée le {format(new Date(guarantee.signedDate), 'dd MMMM yyyy', { locale: fr })}
                  </p>
                )}
              </>
            )}
            {guarantee.status === 'CANCELLED' && (
              <>
                <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
                <p className="font-semibold">Cette garantie a été annulée</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const monthlyPayment = guarantee.loan ? (guarantee.loan.amount / guarantee.loan.numberOfInstallments).toFixed(2) : '0';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <Shield className="h-16 w-16 text-primary mx-auto" />
          <h1 className="text-3xl font-bold">Signature de Garantie</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Veuillez lire attentivement les informations avant de signer
          </p>
        </div>

        {/* Loan Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Informations sur le prêt
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Emprunteur</p>
                <p className="font-semibold">
                  {guarantee.loan?.borrower?.firstName} {guarantee.loan?.borrower?.lastName}
                </p>
                <p className="text-sm text-gray-500">{guarantee.loan?.borrower?.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Type de prêt</p>
                <Badge variant="outline">{guarantee.loan?.type}</Badge>
              </div>
              <div>
                <p className="text-sm text-gray-600">Montant du prêt</p>
                <p className="font-semibold text-lg">€{guarantee.loan?.amount}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Durée</p>
                <p className="font-semibold">{guarantee.loan?.numberOfInstallments} mois</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Mensualité</p>
                <p className="font-semibold">€{monthlyPayment}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Objet</p>
                <p className="font-semibold">{guarantee.loan?.purpose}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Guarantee Details */}
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Détails de votre garantie
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-primary/5 p-4 rounded-lg space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-medium">Montant garanti:</span>
                <span className="text-xl font-bold text-primary">€{guarantee.amount}</span>
              </div>
              {guarantee.percentage && (
                <div className="flex justify-between items-center">
                  <span className="font-medium">Pourcentage du prêt:</span>
                  <span className="font-semibold">{guarantee.percentage}%</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="font-medium">Type de garantie:</span>
                <Badge>{guarantee.type}</Badge>
              </div>
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                En signant cette garantie, vous vous engagez à rembourser le montant garanti
                si l'emprunteur ne peut pas honorer ses engagements. Cette garantie est
                juridiquement contraignante.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Terms and Conditions */}
        <Card>
          <CardHeader>
            <CardTitle>Conditions d&apos;engagement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="terms"
                  checked={acceptedTerms}
                  onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                />
                <label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
                  J'accepte les termes et conditions de la garantie et je comprends mes obligations
                  en tant que garant de ce prêt sans intérêt.
                </label>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="risks"
                  checked={acceptedRisks}
                  onCheckedChange={(checked) => setAcceptedRisks(checked as boolean)}
                />
                <label htmlFor="risks" className="text-sm leading-relaxed cursor-pointer">
                  Je comprends les risques associés à cette garantie et j'ai la capacité financière
                  de couvrir le montant garanti si nécessaire.
                </label>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="legal"
                  checked={acceptedLegal}
                  onCheckedChange={(checked) => setAcceptedLegal(checked as boolean)}
                />
                <label htmlFor="legal" className="text-sm leading-relaxed cursor-pointer">
                  Je confirme que toutes les informations fournies sont exactes et que cette
                  garantie est conforme aux principes halakhiques (sans intérêt).
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Electronic Signature */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSignature className="h-5 w-5" />
              Signature électronique
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
              <p className="text-lg font-signature text-gray-700 dark:text-gray-300">
                {signatureText}
              </p>
            </div>
            <div className="flex items-start gap-2 text-sm text-gray-500">
              <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <p>
                En cliquant sur "Signer la garantie", vous acceptez d'utiliser cette signature
                électronique qui a la même valeur légale qu'une signature manuscrite.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex gap-4">
            <Button
              variant="outline"
              onClick={handleReject}
              disabled={isSigning}
              className="flex-1"
            >
              Refuser
            </Button>
            <Button
              onClick={handleSign}
              disabled={!acceptedTerms || !acceptedRisks || !acceptedLegal || isSigning}
              className="flex-1"
            >
              {isSigning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signature en cours...
                </>
              ) : (
                <>
                  <FileSignature className="mr-2 h-4 w-4" />
                  Signer la garantie
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}