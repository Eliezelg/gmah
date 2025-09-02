'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function GuarantorDashboard() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Tableau de bord Garant</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Gérez vos garanties et suivez les prêts garantis
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>En construction</CardTitle>
          <CardDescription>
            Le tableau de bord garant sera disponible prochainement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            Cette interface permettra de gérer vos garanties et suivre les prêts.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}