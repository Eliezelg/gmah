'use client';

import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useImportStore } from '@/lib/stores/import-store';
import { ImportAPI } from '@/lib/api/import';
import { CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react';
import { toast } from 'sonner';

export function ValidationStep() {
  const { 
    sessionId, 
    validations, 
    setValidations, 
    setLoading, 
    setError, 
    isLoading 
  } = useImportStore();

  useEffect(() => {
    if (sessionId && !validations) {
      validateData();
    }
  }, [sessionId, validations]);

  const validateData = async () => {
    if (!sessionId) return;

    setLoading(true);
    setError(undefined);

    try {
      const validationResults = await ImportAPI.validateImportData(sessionId);
      setValidations(validationResults);
      
      const errorCount = validationResults.filter(v => v.severity === 'ERROR').length;
      if (errorCount > 0) {
        toast.warning(`${errorCount} erreur(s) détectée(s)`);
      } else {
        toast.success('Validation réussie');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur lors de la validation';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
        <p>Validation des données en cours...</p>
      </div>
    );
  }

  if (!validations) {
    return (
      <div className="text-center py-8">
        <Button onClick={validateData}>Démarrer la validation</Button>
      </div>
    );
  }

  const errorCount = validations.filter(v => v.severity === 'ERROR').length;
  const warningCount = validations.filter(v => v.severity === 'WARNING').length;
  const infoCount = validations.filter(v => v.severity === 'INFO').length;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {errorCount === 0 ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-destructive" />
            )}
            Résumé de la validation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-destructive">{errorCount}</div>
              <div className="text-sm text-muted-foreground">Erreurs</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{warningCount}</div>
              <div className="text-sm text-muted-foreground">Avertissements</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{infoCount}</div>
              <div className="text-sm text-muted-foreground">Infos</div>
            </div>
          </div>
          
          {errorCount === 0 ? (
            <div className="mt-4 p-3 bg-green-50 text-green-800 rounded-lg">
              ✅ Toutes les validations sont passées ! Vous pouvez procéder à l'import.
            </div>
          ) : (
            <div className="mt-4 p-3 bg-red-50 text-red-800 rounded-lg">
              ❌ {errorCount} erreur(s) doivent être corrigées avant l'import.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Validation Results */}
      {validations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Détails de la validation</CardTitle>
            <CardDescription>
              Liste complète des problèmes détectés
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ligne</TableHead>
                  <TableHead>Colonne</TableHead>
                  <TableHead>Problème</TableHead>
                  <TableHead>Valeur</TableHead>
                  <TableHead>Suggestion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {validations.slice(0, 100).map((validation, index) => (
                  <TableRow key={index}>
                    <TableCell>{validation.rowNumber}</TableCell>
                    <TableCell>{validation.columnName || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {validation.severity === 'ERROR' && <XCircle className="h-4 w-4 text-destructive" />}
                        {validation.severity === 'WARNING' && <AlertTriangle className="h-4 w-4 text-yellow-600" />}
                        {validation.severity === 'INFO' && <Info className="h-4 w-4 text-blue-600" />}
                        <span className="text-sm">{validation.errorMessage}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1 rounded">
                        {validation.actualValue || '-'}
                      </code>
                    </TableCell>
                    <TableCell>
                      {validation.suggestedFix && (
                        <code className="text-xs bg-green-100 px-1 rounded">
                          {validation.suggestedFix}
                        </code>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {validations.length > 100 && (
              <p className="text-sm text-muted-foreground mt-3">
                Affichage des 100 premiers problèmes sur {validations.length} au total.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}