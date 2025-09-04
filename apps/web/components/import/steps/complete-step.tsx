'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useImportStore } from '@/lib/stores/import-store';
import { ImportAPI } from '@/lib/api/import';
import { CheckCircle2, XCircle, Download, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { ImportReport } from '@/types/import';

interface CompleteStepProps {
  onComplete: () => void;
}

export function CompleteStep({ onComplete }: CompleteStepProps) {
  const { sessionId, resetWizard } = useImportStore();
  const [report, setReport] = useState<ImportReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (sessionId) {
      fetchReport();
    }
  }, [sessionId]);

  const fetchReport = async () => {
    if (!sessionId) return;

    try {
      const reportData = await ImportAPI.getImportReport(sessionId);
      setReport(reportData);
    } catch (error) {
      toast.error('Erreur lors de la récupération du rapport');
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = () => {
    resetWizard();
    onComplete();
  };

  const handleRollback = async () => {
    if (!sessionId) return;

    try {
      await ImportAPI.rollbackImport(sessionId);
      toast.success('Import annulé avec succès');
      handleComplete();
    } catch (error) {
      toast.error('Erreur lors de l'annulation');
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
        <p>Génération du rapport...</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-8">
        <XCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
        <p>Impossible de récupérer le rapport d'import</p>
      </div>
    );
  }

  const isSuccess = report.failedRows === 0;
  const hasWarnings = report.summary.warnings > 0;

  return (
    <div className="space-y-6">
      {/* Success/Failure Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isSuccess ? (
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            ) : (
              <XCircle className="h-6 w-6 text-destructive" />
            )}
            {isSuccess ? 'Import terminé avec succès !' : 'Import terminé avec des erreurs'}
          </CardTitle>
          <CardDescription>
            Import complété en {(report.processingTime / 1000).toFixed(1)}s
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Statistiques de l'import</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{report.successRows}</div>
              <div className="text-sm text-muted-foreground">Réussites</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{report.failedRows}</div>
              <div className="text-sm text-muted-foreground">Échecs</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{report.skippedRows}</div>
              <div className="text-sm text-muted-foreground">Ignorées</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{report.totalRows}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Details */}
      {report.validations && report.validations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Détails des problèmes</CardTitle>
            <CardDescription>
              Liste des erreurs et avertissements rencontrés
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex gap-2">
              <Badge variant="destructive">{report.summary.errors} erreurs</Badge>
              <Badge variant="outline">{report.summary.warnings} avertissements</Badge>
              <Badge variant="secondary">{report.summary.infos} infos</Badge>
            </div>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ligne</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.validations.slice(0, 10).map((validation, index) => (
                  <TableRow key={index}>
                    <TableCell>{validation.rowNumber}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          validation.severity === 'ERROR' ? 'destructive' :
                          validation.severity === 'WARNING' ? 'outline' : 'secondary'
                        }
                      >
                        {validation.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>{validation.errorMessage}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {report.validations.length > 10 && (
              <p className="text-sm text-muted-foreground mt-3">
                Affichage des 10 premiers problèmes sur {report.validations.length} au total.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={handleComplete} className="flex-1">
              Terminer
            </Button>
            
            <Button variant="outline" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Télécharger le rapport
            </Button>
            
            {isSuccess && report.successRows > 0 && (
              <Button 
                variant="destructive" 
                onClick={handleRollback}
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Annuler l'import
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Message */}
      <Card>
        <CardContent className="pt-6">
          {isSuccess ? (
            <div className="text-center text-green-600">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2" />
              <p className="font-medium">Import réalisé avec succès !</p>
              <p className="text-sm text-muted-foreground">
                {report.successRows} enregistrement(s) importé(s) en {(report.processingTime / 1000).toFixed(1)}s
              </p>
            </div>
          ) : (
            <div className="text-center text-destructive">
              <XCircle className="h-8 w-8 mx-auto mb-2" />
              <p className="font-medium">Import complété avec des erreurs</p>
              <p className="text-sm text-muted-foreground">
                {report.successRows} succès, {report.failedRows} échecs sur {report.totalRows} lignes
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}