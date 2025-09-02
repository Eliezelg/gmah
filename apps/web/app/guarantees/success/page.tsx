'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, ArrowRight, Shield } from 'lucide-react';

export default function GuaranteeSuccessPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-6">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="relative">
                <Shield className="h-20 w-20 text-primary" />
                <CheckCircle className="h-10 w-10 text-green-500 absolute -bottom-1 -right-1" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-green-600 dark:text-green-400">
                Garantie signée avec succès!
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Votre garantie a été enregistrée et l'emprunteur en a été notifié.
              </p>
            </div>

            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <h3 className="font-semibold text-green-900 dark:text-green-200 mb-2">
                Prochaines étapes
              </h3>
              <ul className="text-sm text-green-800 dark:text-green-300 space-y-1 text-left list-disc list-inside">
                <li>Le comité examinera la demande de prêt</li>
                <li>Vous serez notifié de la décision finale</li>
                <li>Si approuvé, le prêt sera déboursé</li>
                <li>Vous recevrez des mises à jour régulières</li>
              </ul>
            </div>

            <div className="space-y-3">
              <Button
                onClick={() => router.push('/dashboard')}
                className="w-full"
              >
                Aller au tableau de bord
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/')}
                className="w-full"
              >
                Retour à l'accueil
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}