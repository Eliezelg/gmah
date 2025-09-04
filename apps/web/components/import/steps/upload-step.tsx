'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useImportStore } from '@/lib/stores/import-store';
import { ImportAPI } from '@/lib/api/import';
import { ImportType, ImportFileType, CreateImportSession } from '@/types/import';
import { Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export function UploadStep() {
  const { setSession, setLoading, setError, isLoading } = useImportStore();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importConfig, setImportConfig] = useState<Partial<CreateImportSession>>({
    importType: 'USERS' as ImportType,
    hasHeaders: true,
    encoding: 'utf8',
    delimiter: ','
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setSelectedFile(file);
      
      // Auto-detect file type
      const extension = file.name.split('.').pop()?.toLowerCase();
      const fileType = extension === 'csv' ? 'CSV' : 'EXCEL';
      
      setImportConfig(prev => ({
        ...prev,
        originalName: file.name,
        fileSize: file.size,
        fileType: fileType as ImportFileType
      }));
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/plain': ['.txt']
    },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024 // 50MB
  });

  const handleUpload = async () => {
    if (!selectedFile || !importConfig.importType) {
      toast.error('Veuillez sélectionner un fichier et choisir le type d\'import');
      return;
    }

    setLoading(true);
    setError(undefined);

    try {
      const sessionData: CreateImportSession = {
        originalName: selectedFile.name,
        fileSize: selectedFile.size,
        fileType: importConfig.fileType!,
        importType: importConfig.importType,
        hasHeaders: importConfig.hasHeaders,
        delimiter: importConfig.delimiter,
        encoding: importConfig.encoding
      };

      const session = await ImportAPI.createImportSession(selectedFile, sessionData);
      setSession(session);
      toast.success('Fichier uploadé avec succès');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur lors de l\'upload';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* File Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Sélection du fichier
          </CardTitle>
          <CardDescription>
            Uploadez votre fichier CSV ou Excel (maximum 50MB)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive && !isDragReject ? 'border-primary bg-primary/5' : ''}
              ${isDragReject ? 'border-destructive bg-destructive/5' : ''}
              ${!isDragActive ? 'border-muted-foreground/25 hover:border-muted-foreground/50' : ''}
            `}
          >
            <input {...getInputProps()} />
            
            {selectedFile ? (
              <div className="space-y-4">
                <CheckCircle2 className="h-12 w-12 mx-auto text-green-500" />
                <div>
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                  }}
                >
                  Changer de fichier
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
                <div>
                  <p className="font-medium">
                    {isDragActive 
                      ? 'Déposez le fichier ici...' 
                      : 'Cliquez pour sélectionner ou glissez-déposez'
                    }
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Formats supportés: CSV, Excel (.xls, .xlsx)
                  </p>
                </div>
              </div>
            )}

            {isDragReject && (
              <div className="mt-4 flex items-center justify-center gap-2 text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">Format de fichier non supporté</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration de l'import</CardTitle>
          <CardDescription>
            Configurez les paramètres de votre import
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Import Type */}
          <div className="space-y-2">
            <Label htmlFor="importType">Type de données</Label>
            <Select 
              value={importConfig.importType} 
              onValueChange={(value) => setImportConfig(prev => ({ ...prev, importType: value as ImportType }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez le type de données" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USERS">👥 Utilisateurs</SelectItem>
                <SelectItem value="LOANS">💰 Prêts</SelectItem>
                <SelectItem value="CONTRIBUTIONS">🎁 Contributions</SelectItem>
                <SelectItem value="GUARANTEES">🛡️ Garanties</SelectItem>
                <SelectItem value="PAYMENTS">💳 Paiements</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* File Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="hasHeaders"
                  checked={importConfig.hasHeaders}
                  onCheckedChange={(checked) => 
                    setImportConfig(prev => ({ ...prev, hasHeaders: checked === true }))
                  }
                />
                <Label htmlFor="hasHeaders">Première ligne contient les en-têtes</Label>
              </div>
            </div>

            {importConfig.fileType === 'CSV' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="delimiter">Délimiteur</Label>
                  <Select 
                    value={importConfig.delimiter} 
                    onValueChange={(value) => setImportConfig(prev => ({ ...prev, delimiter: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value=",">, (virgule)</SelectItem>
                      <SelectItem value=";">; (point-virgule)</SelectItem>
                      <SelectItem value="\t">Tab (tabulation)</SelectItem>
                      <SelectItem value="|">| (pipe)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="encoding">Encodage</Label>
                  <Select 
                    value={importConfig.encoding} 
                    onValueChange={(value) => setImportConfig(prev => ({ ...prev, encoding: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="utf8">UTF-8</SelectItem>
                      <SelectItem value="latin1">ISO-8859-1 (Latin-1)</SelectItem>
                      <SelectItem value="utf16">UTF-16</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>

          {/* Upload Button */}
          <div className="pt-4">
            <Button 
              onClick={handleUpload}
              disabled={!selectedFile || !importConfig.importType || isLoading}
              className="w-full"
              size="lg"
            >
              {isLoading ? 'Upload en cours...' : 'Commencer l\'import'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">💡 Conseils</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• Assurez-vous que votre fichier contient des données valides et cohérentes</p>
          <p>• Utilisez des noms de colonnes descriptifs si vous avez des en-têtes</p>
          <p>• Vérifiez l'encodage de votre fichier, surtout pour les caractères spéciaux</p>
          <p>• Les fichiers Excel seront automatiquement analysés (première feuille uniquement)</p>
        </CardContent>
      </Card>
    </div>
  );
}