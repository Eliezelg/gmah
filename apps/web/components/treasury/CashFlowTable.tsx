'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  TrendingUp, 
  TrendingDown, 
  Search, 
  Filter,
  Download,
  ArrowUpDown 
} from 'lucide-react';
import { TreasuryFlowResponseDto, TreasuryFlowType, TreasuryFlowCategory } from '@/types/treasury-forecast';
import { format, parseISO, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';

interface CashFlowTableProps {
  flows: TreasuryFlowResponseDto[];
}

type SortField = 'expectedDate' | 'amount' | 'probability' | 'confidence';
type SortDirection = 'asc' | 'desc';

export function CashFlowTable({ flows }: CashFlowTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('expectedDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const formatDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      if (!isValid(date)) return 'Date invalide';
      return format(date, 'dd MMM yyyy', { locale: fr });
    } catch {
      return 'Date invalide';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const getCategoryLabel = (category: TreasuryFlowCategory) => {
    const labels: Record<TreasuryFlowCategory, string> = {
      [TreasuryFlowCategory.LOAN_DISBURSEMENT]: 'Décaissement Prêt',
      [TreasuryFlowCategory.LOAN_REPAYMENT]: 'Remboursement Prêt',
      [TreasuryFlowCategory.CONTRIBUTION]: 'Contribution',
      [TreasuryFlowCategory.DEPOSIT_WITHDRAWAL]: 'Retrait Dépôt',
      [TreasuryFlowCategory.OPERATIONAL_EXPENSE]: 'Frais Opérationnels',
      [TreasuryFlowCategory.INTEREST_EARNED]: 'Intérêts Perçus',
      [TreasuryFlowCategory.FEE_INCOME]: 'Revenus Frais',
      [TreasuryFlowCategory.OTHER]: 'Autre',
    };
    return labels[category] || category;
  };

  const getConfidenceLevel = (confidence: number) => {
    if (confidence >= 90) return { level: 'Très Haute', variant: 'default' as const, color: 'text-green-600' };
    if (confidence >= 75) return { level: 'Haute', variant: 'secondary' as const, color: 'text-blue-600' };
    if (confidence >= 50) return { level: 'Moyenne', variant: 'outline' as const, color: 'text-yellow-600' };
    return { level: 'Faible', variant: 'destructive' as const, color: 'text-red-600' };
  };

  const filteredAndSortedFlows = useMemo(() => {
    let filtered = flows.filter(flow => {
      const matchesSearch = searchTerm === '' || 
        flow.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        flow.id.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = typeFilter === 'all' || flow.type === typeFilter;
      const matchesCategory = categoryFilter === 'all' || flow.category === categoryFilter;

      return matchesSearch && matchesType && matchesCategory;
    });

    // Sort the filtered flows
    filtered.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      if (sortField === 'expectedDate') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [flows, searchTerm, typeFilter, categoryFilter, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const totalInflows = filteredAndSortedFlows
    .filter(flow => flow.type === TreasuryFlowType.INFLOW)
    .reduce((sum, flow) => sum + (flow.amount * flow.probability / 100), 0);

  const totalOutflows = filteredAndSortedFlows
    .filter(flow => flow.type === TreasuryFlowType.OUTFLOW)
    .reduce((sum, flow) => sum + (flow.amount * flow.probability / 100), 0);

  const netFlow = totalInflows - totalOutflows;

  const exportToCSV = () => {
    const headers = ['Date', 'Type', 'Catégorie', 'Description', 'Montant', 'Probabilité', 'Confiance'];
    const csvData = filteredAndSortedFlows.map(flow => [
      formatDate(flow.expectedDate),
      flow.type === TreasuryFlowType.INFLOW ? 'Entrée' : 'Sortie',
      getCategoryLabel(flow.category),
      flow.description,
      flow.amount.toString(),
      `${flow.probability}%`,
      `${flow.confidence}%`,
    ]);
    
    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `flux_tresorerie_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Flux de Trésorerie ({filteredAndSortedFlows.length})</CardTitle>
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Exporter CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Entrées Totales</span>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(totalInflows)}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-500" />
                <span className="text-sm font-medium">Sorties Totales</span>
              </div>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(totalOutflows)}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Flux Net</span>
              </div>
              <div className={`text-2xl font-bold ${netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(netFlow)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par description ou ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              <SelectItem value={TreasuryFlowType.INFLOW}>Entrées</SelectItem>
              <SelectItem value={TreasuryFlowType.OUTFLOW}>Sorties</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes catégories</SelectItem>
              {Object.values(TreasuryFlowCategory).map((category) => (
                <SelectItem key={category} value={category}>
                  {getCategoryLabel(category)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('expectedDate')}
                >
                  <div className="flex items-center gap-2">
                    Date Attendue
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Description</TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 text-right"
                  onClick={() => handleSort('amount')}
                >
                  <div className="flex items-center justify-end gap-2">
                    Montant
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 text-center"
                  onClick={() => handleSort('probability')}
                >
                  <div className="flex items-center justify-center gap-2">
                    Probabilité
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 text-center"
                  onClick={() => handleSort('confidence')}
                >
                  <div className="flex items-center justify-center gap-2">
                    Confiance
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="text-center">Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedFlows.map((flow) => {
                const confidenceInfo = getConfidenceLevel(flow.confidence);
                return (
                  <TableRow key={flow.id}>
                    <TableCell className="font-medium">
                      {formatDate(flow.expectedDate)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={flow.type === TreasuryFlowType.INFLOW ? 'default' : 'secondary'}>
                        <div className="flex items-center gap-1">
                          {flow.type === TreasuryFlowType.INFLOW ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          {flow.type === TreasuryFlowType.INFLOW ? 'Entrée' : 'Sortie'}
                        </div>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{getCategoryLabel(flow.category)}</span>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="truncate" title={flow.description}>
                        {flow.description}
                      </div>
                      {flow.tags && flow.tags.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {flow.tags.slice(0, 2).map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {flow.tags.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{flow.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <div className={flow.type === TreasuryFlowType.INFLOW ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(flow.amount)}
                      </div>
                      {flow.probability < 100 && (
                        <div className="text-xs text-muted-foreground">
                          Ajusté: {formatCurrency(flow.amount * flow.probability / 100)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={flow.probability >= 80 ? 'default' : flow.probability >= 60 ? 'secondary' : 'destructive'}>
                        {flow.probability}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={confidenceInfo.variant} className={confidenceInfo.color}>
                        {flow.confidence}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={flow.isActual ? 'default' : 'outline'}>
                        {flow.isActual ? 'Réalisé' : 'Projeté'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {filteredAndSortedFlows.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              Aucun flux de trésorerie trouvé avec les filtres actuels.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}