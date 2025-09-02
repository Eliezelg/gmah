'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Upload,
  X,
  CheckCircle,
  AlertCircle,
  File,
  Image,
  FileImage,
  Loader2,
  Download,
  Eye,
  Trash2,
} from 'lucide-react';

interface UploadedDocument {
  id: string;
  name: string;
  type: string;
  fileSize: number;
  isVerified: boolean;
  status: string;
  uploadedAt?: string;
  fileUrl?: string;
}

interface DocumentUploadProps {
  loanId?: string;
  guaranteeId?: string;
  profileId?: string;
  onUploadComplete?: (document: UploadedDocument) => void;
  onDocumentsChange?: (documents: UploadedDocument[]) => void;
  existingDocuments?: UploadedDocument[];
  acceptedTypes?: string[];
  maxFiles?: number;
  required?: boolean;
}

const documentTypes = [
  { value: 'ID_CARD', label: 'Carte d\'identité' },
  { value: 'PASSPORT', label: 'Passeport' },
  { value: 'PROOF_OF_INCOME', label: 'Justificatif de revenus' },
  { value: 'BANK_STATEMENT', label: 'Relevé bancaire' },
  { value: 'TAX_RETURN', label: 'Déclaration d\'impôts' },
  { value: 'EMPLOYMENT_LETTER', label: 'Attestation d\'emploi' },
  { value: 'UTILITY_BILL', label: 'Facture de services' },
  { value: 'GUARANTEE_LETTER', label: 'Lettre de garantie' },
  { value: 'CONTRACT', label: 'Contrat' },
  { value: 'OTHER', label: 'Autre' },
];

export function DocumentUpload({
  loanId,
  guaranteeId,
  profileId,
  onUploadComplete,
  onDocumentsChange,
  existingDocuments = [],
  acceptedTypes = ['image/*', 'application/pdf', '.doc', '.docx', '.xls', '.xlsx'],
  maxFiles = 10,
  required = false,
}: DocumentUploadProps) {
  const [documents, setDocuments] = useState<UploadedDocument[]>(existingDocuments);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [isUploading, setIsUploading] = useState(false);
  const [selectedType, setSelectedType] = useState('OTHER');

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (documents.length + acceptedFiles.length > maxFiles) {
      toast.error(`Vous ne pouvez télécharger que ${maxFiles} fichiers maximum`);
      return;
    }

    setIsUploading(true);

    for (const file of acceptedFiles) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', selectedType);
      formData.append('name', file.name);
      
      if (loanId) formData.append('loanId', loanId);
      if (guaranteeId) formData.append('guaranteeId', guaranteeId);
      if (profileId) formData.append('profileId', profileId);

      try {
        // Track upload progress
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));

        const response = await apiClient.post('/documents', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = progressEvent.total
              ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
              : 0;
            setUploadProgress(prev => ({ ...prev, [file.name]: percentCompleted }));
          },
        });

        const uploadedDoc: UploadedDocument = {
          id: response.data.id,
          name: response.data.name,
          type: response.data.type,
          fileSize: response.data.fileSize,
          isVerified: response.data.isVerified || false,
          status: response.data.status,
          uploadedAt: response.data.createdAt,
          fileUrl: response.data.fileUrl,
        };

        setDocuments(prev => {
          const newDocs = [...prev, uploadedDoc];
          onDocumentsChange?.(newDocs);
          return newDocs;
        });

        onUploadComplete?.(uploadedDoc);
        toast.success(`${file.name} téléchargé avec succès`);

        // Clean up progress
        setTimeout(() => {
          setUploadProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[file.name];
            return newProgress;
          });
        }, 1000);
      } catch (error: any) {
        console.error('Upload error:', error);
        toast.error(`Erreur lors du téléchargement de ${file.name}`);
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[file.name];
          return newProgress;
        });
      }
    }

    setIsUploading(false);
  }, [documents.length, maxFiles, selectedType, loanId, guaranteeId, profileId, onUploadComplete, onDocumentsChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    maxFiles: maxFiles - documents.length,
    disabled: isUploading || documents.length >= maxFiles,
  });

  const handleDelete = async (docId: string) => {
    try {
      await apiClient.delete(`/documents/${docId}`);
      setDocuments(prev => {
        const newDocs = prev.filter(d => d.id !== docId);
        onDocumentsChange?.(newDocs);
        return newDocs;
      });
      toast.success('Document supprimé');
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleDownload = async (doc: UploadedDocument) => {
    try {
      const response = await apiClient.get(`/documents/${doc.id}/download`, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.name);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Erreur lors du téléchargement');
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(ext || '')) {
      return <FileImage className="h-5 w-5" />;
    }
    if (ext === 'pdf') {
      return <FileText className="h-5 w-5 text-red-500" />;
    }
    return <File className="h-5 w-5" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      {/* Document Type Selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Type de document</label>
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="w-full p-2 border rounded-md bg-background"
          disabled={isUploading}
        >
          {documentTypes.map(type => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors duration-200
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-gray-400'}
          ${isUploading || documents.length >= maxFiles ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        {isDragActive ? (
          <p className="text-lg font-medium">Déposez les fichiers ici...</p>
        ) : (
          <>
            <p className="text-lg font-medium mb-2">
              Glissez-déposez vos fichiers ici
            </p>
            <p className="text-sm text-gray-500">
              ou cliquez pour sélectionner
            </p>
            <p className="text-xs text-gray-400 mt-2">
              {documents.length}/{maxFiles} fichiers • Max 10MB par fichier
            </p>
          </>
        )}
      </div>

      {/* Upload Progress */}
      {Object.entries(uploadProgress).map(([fileName, progress]) => (
        <Card key={fileName} className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm font-medium">{fileName}</span>
            </div>
            <span className="text-sm text-gray-500">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </Card>
      ))}

      {/* Uploaded Documents */}
      {documents.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-medium text-sm">Documents téléchargés</h3>
          <div className="grid gap-2">
            {documents.map((doc) => (
              <Card key={doc.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getFileIcon(doc.name)}
                    <div>
                      <p className="font-medium text-sm">{doc.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">
                          {formatFileSize(doc.fileSize)}
                        </span>
                        <Badge variant={doc.isVerified ? "success" : "secondary"} className="text-xs">
                          {doc.isVerified ? 'Vérifié' : 'En attente'}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {documentTypes.find(t => t.value === doc.type)?.label || doc.type}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDownload(doc)}
                      className="h-8 w-8"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(doc.id)}
                      className="h-8 w-8 text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Required indicator */}
      {required && documents.length === 0 && (
        <p className="text-sm text-red-500 flex items-center gap-1">
          <AlertCircle className="h-4 w-4" />
          Au moins un document est requis
        </p>
      )}
    </div>
  );
}