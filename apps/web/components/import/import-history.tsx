'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ImportAPI } from '@/lib/api/import';
import { ImportSession, ImportStatus, ImportType } from '@/types/import';
import { 
  FileText, 
  Download, 
  Trash2, 
  RotateCcw, 
  Eye, 
  Search,
  Calendar,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const STATUS_COLORS = {
  PENDING: 'bg-gray-500',
  PARSING: 'bg-blue-500',
  MAPPED: 'bg-indigo-500',
  VALIDATING: 'bg-yellow-500',
  IMPORTING: 'bg-orange-500',
  COMPLETED: 'bg-green-500',
  FAILED: 'bg-red-500',
  CANCELLED: 'bg-gray-400'
};

const STATUS_LABELS = {
  PENDING: 'En attente',
  PARSING: 'Analyse',
  MAPPED: 'Mappé',
  VALIDATING: 'Validation',
  IMPORTING: 'Import',
  COMPLETED: 'Terminé',
  FAILED: 'Échec',
  CANCELLED: 'Annulé'
};

const IMPORT_TYPE_LABELS = {
  USERS: 'Utilisateurs',
  LOANS: 'Prêts', 
  CONTRIBUTIONS: 'Contributions',
  GUARANTEES: 'Garanties',
  PAYMENTS: 'Paiements'
};

export function ImportHistory() {
  const [imports, setImports] = useState<ImportSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    status: '' as ImportStatus | '',
    importType: '' as ImportType | '',
    search: ''
  });

  useEffect(() => {
    fetchImports();
  }, [page, filters]);

  const fetchImports = async () => {
    setIsLoading(true);
    try {
      const params: any = { page, limit };
      if (filters.status) params.status = filters.status;
      if (filters.importType) params.importType = filters.importType;
      
      const { sessions, total: totalCount } = await ImportAPI.getImportSessions(params);
      
      // Filter by search term locally for simplicity
      let filteredSessions = sessions;
      if (filters.search) {
        filteredSessions = sessions.filter(session => 
          session.originalName.toLowerCase().includes(filters.search.toLowerCase()) ||
          session.sessionNumber.toLowerCase().includes(filters.search.toLowerCase())
        );
      }
      
      setImports(filteredSessions);
      setTotal(totalCount);
    } catch (error) {
      toast.error('Erreur lors du chargement des imports');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (sessionId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet import ?')) return;
    
    try {
      await ImportAPI.deleteImportSession(sessionId);
      toast.success('Import supprimé');
      fetchImports();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleRollback = async (sessionId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir annuler cet import ?')) return;
    
    try {
      await ImportAPI.rollbackImport(sessionId);
      toast.success('Import annulé');
      fetchImports();
    } catch (error) {
      toast.error('Erreur lors de l\'annulation');
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p>Chargement des imports...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Historique des imports
        </CardTitle>
        <CardDescription>
          Gérez et consultez tous vos imports de données
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom de fichier ou numéro de session..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10"
              />
            </div>
          </div>
          
          <Select
            value={filters.status}
            onValueChange={(value) => setFilters(prev => ({ ...prev, status: value as ImportStatus }))}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Tous les statuts</SelectItem>
              {Object.entries(STATUS_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.importType}
            onValueChange={(value) => setFilters(prev => ({ ...prev, importType: value as ImportType }))}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Tous les types</SelectItem>
              {Object.entries(IMPORT_TYPE_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {imports.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucun import trouvé</p>
            <p className="text-sm">Commencez par créer votre premier import</p>
          </div>
        ) : (
          <>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fichier</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Lignes</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {imports.map((importSession) => (
                    <TableRow key={importSession.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{importSession.originalName}</div>
                          <div className="text-sm text-muted-foreground">
                            {importSession.sessionNumber} • {formatFileSize(importSession.fileSize)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {IMPORT_TYPE_LABELS[importSession.importType]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div 
                            className={`w-2 h-2 rounded-full ${STATUS_COLORS[importSession.status]}`} 
                          />
                          <span className="text-sm">
                            {STATUS_LABELS[importSession.status]}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {importSession.totalRows > 0 ? (
                          <div className="text-sm">
                            <div>{importSession.totalRows.toLocaleString()} total</div>
                            {importSession.status === 'COMPLETED' && (
                              <div className="text-muted-foreground">
                                ✓ {importSession.successRows} • ✗ {importSession.failedRows}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDistanceToNow(new Date(importSession.createdAt), { 
                            addSuffix: true, 
                            locale: fr 
                          })}
                        </div>
                        {importSession.completedAt && (
                          <div className="text-xs text-muted-foreground">
                            Durée: {importSession.processingTime 
                              ? `${(importSession.processingTime / 1000).toFixed(1)}s`
                              : '-'
                            }
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          <Button variant="ghost" size="icon">
                            <Download className="h-4 w-4" />
                          </Button>
                          
                          {importSession.canRollback && importSession.status === 'COMPLETED' && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleRollback(importSession.id)}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}
                          
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDelete(importSession.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {Math.ceil(total / limit) > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Affichage de {((page - 1) * limit) + 1} à {Math.min(page * limit, total)} sur {total} imports
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(prev => Math.max(1, prev - 1))}
                    disabled={page === 1}
                  >
                    Précédent
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(prev => prev + 1)}
                    disabled={page >= Math.ceil(total / limit)}
                  >
                    Suivant
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}