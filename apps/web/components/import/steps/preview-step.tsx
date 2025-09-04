'use client';

import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useImportStore } from '@/lib/stores/import-store';
import { ImportAPI } from '@/lib/api/import';
import { FileText, Eye, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export function PreviewStep() {
  const { 
    sessionId, 
    preview, 
    setPreview, 
    setLoading, 
    setError, 
    isLoading 
  } = useImportStore();

  useEffect(() => {
    if (sessionId && !preview) {
      generatePreview();
    }
  }, [sessionId, preview]);

  const generatePreview = async () => {
    if (!sessionId) return;

    setLoading(true);
    setError(undefined);

    try {
      const previewData = await ImportAPI.generatePreview(sessionId);
      setPreview(previewData);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur lors de la génération du préview';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Impossible de générer le préview</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* File Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Informations du fichier
          </CardTitle>
          <CardDescription>
            Détails détectés lors de l'analyse du fichier
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Nombre de colonnes</p>
              <Badge variant="outline" className="text-sm">
                {preview.columns.length}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Nombre de lignes</p>
              <Badge variant="outline" className="text-sm">
                {preview.totalRows.toLocaleString()}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Encodage détecté</p>
              <Badge variant="outline" className="text-sm">
                {preview.encoding.toUpperCase()}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">En-têtes</p>
              <Badge 
                variant={preview.hasHeaders ? "default" : "secondary"} 
                className="text-sm"
              >
                {preview.hasHeaders ? 'Détectés' : 'Aucun'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Column Detection */}
      <Card>
        <CardHeader>
          <CardTitle>Colonnes détectées</CardTitle>
          <CardDescription>
            Colonnes trouvées dans votre fichier avec suggestions de mapping
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {preview.columns.map((column, index) => {
              const suggestion = preview.suggestedMapping.find(s => s.columnName === column);
              return (
                <div
                  key={index}
                  className="p-3 border rounded-lg space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{column}</span>
                    <Badge variant="outline" className="text-xs">
                      {index + 1}
                    </Badge>
                  </div>
                  {suggestion && suggestion.suggestedField !== 'unmapped' && (
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="secondary" 
                        className="text-xs"
                      >
                        → {suggestion.suggestedField}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {suggestion.confidence}% confiance
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Data Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Aperçu des données
          </CardTitle>
          <CardDescription>
            Affichage des 10 premières lignes de votre fichier
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto max-h-96">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    {preview.columns.map((column, index) => (
                      <TableHead key={index} className="font-semibold min-w-32">
                        {column}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.sampleData.map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      {row.map((cell, cellIndex) => (
                        <TableCell key={cellIndex} className="font-mono text-sm">
                          {cell === null || cell === undefined || cell === '' ? (
                            <span className="text-muted-foreground italic">vide</span>
                          ) : (
                            <span className="break-all">
                              {String(cell).length > 50 
                                ? `${String(cell).substring(0, 50)}...` 
                                : String(cell)
                              }
                            </span>
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          
          {preview.totalRows > preview.sampleData.length && (
            <p className="text-sm text-muted-foreground mt-3">
              Affichage de {preview.sampleData.length} lignes sur {preview.totalRows.toLocaleString()} au total
            </p>
          )}
        </CardContent>
      </Card>

      {/* Analysis Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Analyse automatique</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2" />
              <div>
                <p className="text-sm font-medium">Fichier analysé avec succès</p>
                <p className="text-sm text-muted-foreground">
                  {preview.columns.length} colonnes détectées, {preview.totalRows.toLocaleString()} lignes trouvées
                </p>
              </div>
            </div>
            
            {preview.suggestedMapping.filter(s => s.suggestedField !== 'unmapped').length > 0 && (
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                <div>
                  <p className="text-sm font-medium">Suggestions de mapping disponibles</p>
                  <p className="text-sm text-muted-foreground">
                    {preview.suggestedMapping.filter(s => s.suggestedField !== 'unmapped').length} colonnes 
                    peuvent être mappées automatiquement
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2" />
              <div>
                <p className="text-sm font-medium">Prêt pour le mapping</p>
                <p className="text-sm text-muted-foreground">
                  Vous pouvez maintenant configurer le mapping des colonnes vers les champs de la base de données
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}