'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useImportStore } from '@/lib/stores/import-store';
import { ImportAPI } from '@/lib/api/import';
import { FieldMapping } from '@/types/import';
import { ArrowRight, Wand2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

// Définition des champs disponibles selon le type d'import
const FIELD_DEFINITIONS = {
  USERS: [
    { key: 'email', label: 'Email', required: true, type: 'email' },
    { key: 'firstName', label: 'Prénom', required: true, type: 'string' },
    { key: 'lastName', label: 'Nom', required: true, type: 'string' },
    { key: 'phone', label: 'Téléphone', required: false, type: 'phone' },
    { key: 'address', label: 'Adresse', required: false, type: 'string' },
    { key: 'city', label: 'Ville', required: false, type: 'string' },
    { key: 'postalCode', label: 'Code postal', required: false, type: 'string' },
    { key: 'country', label: 'Pays', required: false, type: 'string' }
  ],
  LOANS: [
    { key: 'borrowerEmail', label: 'Email emprunteur', required: true, type: 'email' },
    { key: 'amount', label: 'Montant', required: true, type: 'number' },
    { key: 'purpose', label: 'Objet du prêt', required: true, type: 'string' },
    { key: 'type', label: 'Type de prêt', required: false, type: 'string' },
    { key: 'numberOfInstallments', label: 'Nombre d\'échéances', required: false, type: 'number' }
  ],
  CONTRIBUTIONS: [
    { key: 'contributorEmail', label: 'Email contributeur', required: true, type: 'email' },
    { key: 'amount', label: 'Montant', required: true, type: 'number' },
    { key: 'type', label: 'Type de contribution', required: false, type: 'string' }
  ],
  GUARANTEES: [
    { key: 'guarantorEmail', label: 'Email garant', required: true, type: 'email' },
    { key: 'loanId', label: 'ID du prêt', required: true, type: 'string' },
    { key: 'amount', label: 'Montant garanti', required: true, type: 'number' }
  ],
  PAYMENTS: [
    { key: 'loanId', label: 'ID du prêt', required: true, type: 'string' },
    { key: 'amount', label: 'Montant', required: true, type: 'number' },
    { key: 'method', label: 'Méthode de paiement', required: true, type: 'string' }
  ]
};

export function MappingStep() {
  const { 
    session, 
    preview, 
    mapping, 
    setMapping, 
    setLoading, 
    setError, 
    isLoading,
    sessionId 
  } = useImportStore();

  const [currentMapping, setCurrentMapping] = useState<FieldMapping[]>([]);

  useEffect(() => {
    if (preview && !mapping) {
      initializeMapping();
    } else if (mapping) {
      setCurrentMapping(mapping);
    }
  }, [preview, mapping]);

  const initializeMapping = () => {
    if (!preview || !session) return;

    const availableFields = FIELD_DEFINITIONS[session.importType] || [];
    const initialMapping: FieldMapping[] = [];

    preview.columns.forEach((column, index) => {
      const suggestion = preview.suggestedMapping.find(s => s.columnName === column);
      let fieldName = '';

      if (suggestion && suggestion.suggestedField !== 'unmapped') {
        // Vérifier si le champ suggéré existe dans les champs disponibles
        const fieldExists = availableFields.some(f => f.key === suggestion.suggestedField);
        if (fieldExists) {
          fieldName = suggestion.suggestedField;
        }
      }

      initialMapping.push({
        columnName: column,
        fieldName,
        required: fieldName ? availableFields.find(f => f.key === fieldName)?.required || false : false
      });
    });

    setCurrentMapping(initialMapping);
  };

  const updateMapping = (columnIndex: number, fieldName: string) => {
    const updatedMapping = [...currentMapping];
    const availableFields = FIELD_DEFINITIONS[session?.importType || 'USERS'];
    const field = availableFields.find(f => f.key === fieldName);

    updatedMapping[columnIndex] = {
      ...updatedMapping[columnIndex],
      fieldName,
      required: field?.required || false,
      transform: field?.type ? { type: field.type as any } : undefined
    };

    setCurrentMapping(updatedMapping);
  };

  const applyAutoMapping = () => {
    if (!preview || !session) return;

    const availableFields = FIELD_DEFINITIONS[session.importType] || [];
    const autoMapping: FieldMapping[] = [];

    preview.columns.forEach(column => {
      const suggestion = preview.suggestedMapping.find(s => s.columnName === column);
      let fieldName = '';

      if (suggestion && suggestion.confidence > 60) {
        const fieldExists = availableFields.some(f => f.key === suggestion.suggestedField);
        if (fieldExists) {
          fieldName = suggestion.suggestedField;
        }
      }

      const field = availableFields.find(f => f.key === fieldName);
      autoMapping.push({
        columnName: column,
        fieldName,
        required: field?.required || false,
        transform: field?.type ? { type: field.type as any } : undefined
      });
    });

    setCurrentMapping(autoMapping);
    toast.success('Mapping automatique appliqué');
  };

  const saveMapping = async () => {
    if (!sessionId) return;

    setLoading(true);
    setError(undefined);

    try {
      const validMappings = currentMapping.filter(m => m.fieldName);
      await ImportAPI.updateColumnMapping(sessionId, { mapping: validMappings });
      setMapping(validMappings);
      toast.success('Mapping sauvegardé avec succès');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur lors de la sauvegarde';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (!preview || !session) {
    return <div>Données manquantes pour le mapping</div>;
  }

  const availableFields = FIELD_DEFINITIONS[session.importType] || [];
  const mappedFields = new Set(currentMapping.filter(m => m.fieldName).map(m => m.fieldName));
  const requiredFieldsMapped = availableFields
    .filter(f => f.required)
    .every(f => mappedFields.has(f.key));

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ArrowRight className="h-5 w-5" />
                Mapping des colonnes
              </CardTitle>
              <CardDescription>
                Associez les colonnes de votre fichier aux champs de la base de données
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={applyAutoMapping}
              className="flex items-center gap-2"
            >
              <Wand2 className="h-4 w-4" />
              Auto-mapping
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Mapping Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration du mapping</CardTitle>
          <CardDescription>
            Type d'import: <Badge>{session.importType}</Badge>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {currentMapping.map((mapping, index) => {
              const availableOptions = availableFields.filter(field => 
                !mappedFields.has(field.key) || field.key === mapping.fieldName
              );

              return (
                <div
                  key={index}
                  className="flex items-center gap-4 p-4 border rounded-lg"
                >
                  {/* Column Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">
                      {mapping.columnName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Colonne {index + 1}
                    </div>
                  </div>

                  <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />

                  {/* Field Selection */}
                  <div className="flex-1 min-w-0">
                    <Select
                      value={mapping.fieldName}
                      onValueChange={(value) => updateMapping(index, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez un champ" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Non mappé</SelectItem>
                        {availableOptions.map(field => (
                          <SelectItem key={field.key} value={field.key}>
                            <div className="flex items-center justify-between w-full">
                              <span>{field.label}</span>
                              {field.required && (
                                <Badge variant="destructive" className="ml-2 text-xs">
                                  Requis
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Status */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {mapping.fieldName && (
                      <Badge 
                        variant={mapping.required ? "destructive" : "secondary"}
                        className="text-xs"
                      >
                        {mapping.required ? 'Requis' : 'Optionnel'}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Validation Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Résumé du mapping</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Colonnes mappées:</span>
              <Badge variant="outline">
                {currentMapping.filter(m => m.fieldName).length} / {currentMapping.length}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Champs requis mappés:</span>
              <Badge variant={requiredFieldsMapped ? "default" : "destructive"}>
                {requiredFieldsMapped ? 'Complet' : 'Incomplet'}
              </Badge>
            </div>

            {!requiredFieldsMapped && (
              <div className="text-sm text-destructive">
                Les champs requis suivants doivent être mappés:
                <ul className="list-disc list-inside mt-1">
                  {availableFields
                    .filter(f => f.required && !mappedFields.has(f.key))
                    .map(f => (
                      <li key={f.key}>{f.label}</li>
                    ))
                  }
                </ul>
              </div>
            )}
          </div>

          <Button
            onClick={saveMapping}
            disabled={!requiredFieldsMapped || isLoading}
            className="w-full mt-4"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Sauvegarde...
              </>
            ) : (
              'Sauvegarder le mapping'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}