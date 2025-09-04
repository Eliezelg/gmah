'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ImportWizard } from '@/components/import/import-wizard';
import { ImportHistory } from '@/components/import/import-history';
import { Plus, FileUp, History, TrendingUp } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ImportPage() {
  const [showWizard, setShowWizard] = useState(false);

  if (showWizard) {
    return (
      <ImportWizard 
        onClose={() => setShowWizard(false)}
        onComplete={() => {
          setShowWizard(false);
          // Refresh history or show success message
        }}
      />
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Import de données</h1>
            <p className="text-muted-foreground mt-2">
              Importez des données en masse avec validation et mapping intelligent
            </p>
          </div>
          <Button 
            onClick={() => setShowWizard(true)}
            size="lg"
            className="flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Nouvel import
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Imports totaux</CardTitle>
            <FileUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              +0% par rapport au mois dernier
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lignes importées</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foregreen">
              Toutes les importations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux de succès</CardTitle>
            <Badge variant="secondary" className="h-4 px-1 text-xs">
              N/A
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-%</div>
            <Progress value={0} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En cours</CardTitle>
            <div className="h-4 w-4 bg-yellow-500 rounded-full animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Imports actifs
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileUp className="h-5 w-5" />
            Actions rapides
          </CardTitle>
          <CardDescription>
            Types d'imports disponibles pour votre organisation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col items-start gap-3"
              onClick={() => setShowWizard(true)}
            >
              <div className="flex items-center gap-2 w-full">
                <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  👥
                </div>
                <span className="font-medium">Utilisateurs</span>
              </div>
              <p className="text-sm text-muted-foreground text-left">
                Importez des utilisateurs avec leurs profils complets
              </p>
            </Button>

            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col items-start gap-3"
              onClick={() => setShowWizard(true)}
            >
              <div className="flex items-center gap-2 w-full">
                <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
                  💰
                </div>
                <span className="font-medium">Prêts</span>
              </div>
              <p className="text-sm text-muted-foreground text-left">
                Importez des demandes de prêts en lot
              </p>
            </Button>

            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col items-start gap-3"
              onClick={() => setShowWizard(true)}
            >
              <div className="flex items-center gap-2 w-full">
                <div className="h-8 w-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  🎁
                </div>
                <span className="font-medium">Contributions</span>
              </div>
              <p className="text-sm text-muted-foreground text-left">
                Importez des dons et contributions
              </p>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Import History and Management */}
      <Tabs defaultValue="history" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Historique des imports
          </TabsTrigger>
          <TabsTrigger value="templates">
            Modèles d'import
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="history">
          <ImportHistory />
        </TabsContent>
        
        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle>Modèles d'import</CardTitle>
              <CardDescription>
                Gérez vos modèles de mapping pour accélérer vos imports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <FileUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucun modèle d'import disponible</p>
                <p className="text-sm">Les modèles seront créés automatiquement lors de vos imports</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}