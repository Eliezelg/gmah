'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function TreasurerDashboard() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Tableau de bord Trésorier</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Gérez les décaissements et la trésorerie
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>En construction</CardTitle>
          <CardDescription>
            Le tableau de bord trésorier sera disponible prochainement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            Cette interface permettra de gérer les décaissements et suivre la trésorerie.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}