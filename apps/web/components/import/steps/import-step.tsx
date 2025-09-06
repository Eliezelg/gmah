'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useImportStore } from '@/lib/stores/import-store';
import { ImportAPI } from '@/lib/api/import';
import { Play, Pause, Square, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export function ImportStep() {
  const { sessionId, setLoading, setError, nextStep } = useImportStore();
  const [importStarted, setImportStarted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>('ready');
  const [jobId, setJobId] = useState<string>('');

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (importStarted && sessionId) {
      interval = setInterval(async () => {
        try {
          const statusData = await ImportAPI.getImportStatus(sessionId);
          setProgress(statusData.progress.percentage);
          setStatus(statusData.status);
          
          if (statusData.status === 'COMPLETED' || statusData.status === 'FAILED') {
            setImportStarted(false);
            if (statusData.status === 'COMPLETED') {
              nextStep();
            }
          }
        } catch (error) {
          console.error('Erreur lors du suivi du statut:', error);
        }
      }, 2000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [importStarted, sessionId]);

  const startImport = async () => {
    if (!sessionId) return;

    setLoading(true);
    setError(undefined);

    try {
      const result = await ImportAPI.startImport(sessionId);
      setJobId(result.jobId);
      setImportStarted(true);
      setStatus('IMPORTING');
      toast.success('Import démarré');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur lors du démarrage';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const cancelImport = async () => {
    if (!sessionId) return;

    try {
      await ImportAPI.cancelImport(sessionId);
      setImportStarted(false);
      setStatus('CANCELLED');
      toast.info('Import annulé');
    } catch (error) {
      toast.error('Erreur lors de l\'annulation');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Lancement de l'import
          </CardTitle>
          <CardDescription>
            Démarrez le processus d'import de vos données
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!importStarted && status !== 'COMPLETED' ? (
            <div className="text-center space-y-4">
              <div className="p-8 border-2 border-dashed rounded-lg">
                <Play className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">Prêt à importer</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Toutes les validations sont passées. Vous pouvez maintenant lancer l'import.
                </p>
                <Button onClick={startImport} size="lg" className="gap-2">
                  <Play className="h-4 w-4" />
                  Démarrer l'import
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center">
                <div className="text-lg font-medium mb-2">
                  Import en cours...
                </div>
                <div className="text-sm text-muted-foreground">
                  Job ID: {jobId}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Progrès</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              <div className="flex items-center justify-center gap-3">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Statut: {status}</span>
                </div>
              </div>

              {status === 'IMPORTING' && (
                <div className="text-center">
                  <Button variant="destructive" onClick={cancelImport} className="gap-2">
                    <Square className="h-4 w-4" />
                    Annuler l'import
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Informations</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• L'import se déroule en arrière-plan via un système de queue</p>
          <p>• Vous pouvez fermer cette fenêtre, l'import continuera</p>
          <p>• En cas d'erreur, l'import sera automatiquement annulé</p>
          <p>• Un rapport détaillé sera généré à la fin</p>
        </CardContent>
      </Card>
    </div>
  );
}