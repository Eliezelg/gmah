'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Download, 
  FileText, 
  TrendingUp,
  TrendingDown,
  Calendar,
  Users,
  Euro,
  PieChart,
  BarChart3,
  LineChart,
  Printer,
  Mail,
  Filter
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DatePickerWithRange } from '@/components/ui/date-range-picker'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function ReportsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('month')
  const [selectedReport, setSelectedReport] = useState('overview')
  
  const financialSummary = {
    totalLoansAmount: 450000,
    totalDisbursed: 380000,
    totalRepaid: 285000,
    outstandingBalance: 95000,
    averageLoanSize: 7500,
    repaymentRate: 75,
    defaultRate: 2.1,
    numberOfActiveLoans: 156,
    numberOfCompletedLoans: 89,
    numberOfDefaultedLoans: 3
  }

  const monthlyData = {
    loans: [
      { month: 'Jan', approved: 12, disbursed: 10, completed: 8 },
      { month: 'Fév', approved: 15, disbursed: 14, completed: 6 },
      { month: 'Mar', approved: 18, disbursed: 16, completed: 10 },
      { month: 'Avr', approved: 14, disbursed: 13, completed: 9 },
      { month: 'Mai', approved: 20, disbursed: 18, completed: 12 },
      { month: 'Juin', approved: 16, disbursed: 15, completed: 11 }
    ],
    cashFlow: [
      { month: 'Jan', inflow: 35000, outflow: 28000 },
      { month: 'Fév', inflow: 42000, outflow: 35000 },
      { month: 'Mar', inflow: 38000, outflow: 40000 },
      { month: 'Avr', inflow: 45000, outflow: 32000 },
      { month: 'Mai', inflow: 50000, outflow: 45000 },
      { month: 'Juin', inflow: 48000, outflow: 38000 }
    ]
  }

  const loansByType = [
    { type: 'Standard', count: 45, amount: 180000, percentage: 40 },
    { type: 'Urgence', count: 25, amount: 75000, percentage: 16.7 },
    { type: 'Éducation', count: 30, amount: 90000, percentage: 20 },
    { type: 'Mariage', count: 20, amount: 60000, percentage: 13.3 },
    { type: 'Médical', count: 15, amount: 45000, percentage: 10 }
  ]

  const topBorrowers = [
    { name: 'David Cohen', totalBorrowed: 25000, status: 'active', reliability: 95 },
    { name: 'Sarah Levy', totalBorrowed: 18000, status: 'active', reliability: 88 },
    { name: 'Michael Goldstein', totalBorrowed: 15000, status: 'completed', reliability: 92 },
    { name: 'Rachel Azoulay', totalBorrowed: 12000, status: 'active', reliability: 97 },
    { name: 'Abraham Rubin', totalBorrowed: 10000, status: 'active', reliability: 85 }
  ]

  const handleExportReport = (format: 'pdf' | 'excel' | 'csv') => {
    console.log(`Exporting report as ${format}`)
  }

  const handlePrintReport = () => {
    window.print()
  }

  const handleEmailReport = () => {
    console.log('Sending report by email')
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Rapports Financiers</h1>
          <p className="text-muted-foreground mt-1">
            Analyse détaillée et rapports de performance
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrintReport}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimer
          </Button>
          <Button variant="outline" onClick={handleEmailReport}>
            <Mail className="h-4 w-4 mr-2" />
            Envoyer
          </Button>
          <div className="flex gap-1">
            <Button onClick={() => handleExportReport('pdf')}>
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <Button variant="outline" onClick={() => handleExportReport('excel')}>
              Excel
            </Button>
            <Button variant="outline" onClick={() => handleExportReport('csv')}>
              CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Report Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Select value={selectedReport} onValueChange={setSelectedReport}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Type de rapport" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="overview">Vue d&apos;ensemble</SelectItem>
                <SelectItem value="loans">Rapport des prêts</SelectItem>
                <SelectItem value="cashflow">Flux de trésorerie</SelectItem>
                <SelectItem value="repayments">Remboursements</SelectItem>
                <SelectItem value="defaults">Défauts de paiement</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Période" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Cette semaine</SelectItem>
                <SelectItem value="month">Ce mois</SelectItem>
                <SelectItem value="quarter">Ce trimestre</SelectItem>
                <SelectItem value="year">Cette année</SelectItem>
                <SelectItem value="custom">Personnalisé</SelectItem>
              </SelectContent>
            </Select>
            <DatePickerWithRange />
          </div>
        </CardContent>
      </Card>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total des prêts</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              €{financialSummary.totalLoansAmount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {financialSummary.numberOfActiveLoans} prêts actifs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total remboursé</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              €{financialSummary.totalRepaid.toLocaleString()}
            </div>
            <Progress value={financialSummary.repaymentRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Solde en cours</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              €{financialSummary.outstandingBalance.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              À collecter
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux de défaut</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {financialSummary.defaultRate}%
            </div>
            <p className="text-xs text-muted-foreground">
              {financialSummary.numberOfDefaultedLoans} prêts en défaut
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Vue d&apos;ensemble</TabsTrigger>
          <TabsTrigger value="loans">Prêts</TabsTrigger>
          <TabsTrigger value="cashflow">Trésorerie</TabsTrigger>
          <TabsTrigger value="borrowers">Emprunteurs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Monthly Loan Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Activité mensuelle des prêts</CardTitle>
                <CardDescription>
                  Évolution des prêts approuvés, décaissés et complétés
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center bg-muted rounded">
                  <LineChart className="h-8 w-8 text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Graphique linéaire</span>
                </div>
                <div className="mt-4 space-y-2">
                  {monthlyData.loans.slice(-3).map((data, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>{data.month}</span>
                      <div className="flex gap-4">
                        <span className="text-blue-600">Approuvés: {data.approved}</span>
                        <span className="text-green-600">Décaissés: {data.disbursed}</span>
                        <span className="text-gray-600">Complétés: {data.completed}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Cash Flow Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Flux de trésorerie</CardTitle>
                <CardDescription>
                  Entrées vs sorties mensuelles
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center bg-muted rounded">
                  <BarChart3 className="h-8 w-8 text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Graphique en barres</span>
                </div>
                <div className="mt-4 space-y-2">
                  {monthlyData.cashFlow.slice(-3).map((data, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>{data.month}</span>
                      <div className="flex gap-4">
                        <span className="text-green-600">+€{data.inflow.toLocaleString()}</span>
                        <span className="text-red-600">-€{data.outflow.toLocaleString()}</span>
                        <span className="font-bold">
                          Net: €{(data.inflow - data.outflow).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Loans by Type */}
          <Card>
            <CardHeader>
              <CardTitle>Répartition des prêts par type</CardTitle>
              <CardDescription>
                Distribution des prêts selon leur catégorie
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="h-[250px] flex items-center justify-center bg-muted rounded">
                  <PieChart className="h-8 w-8 text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Graphique circulaire</span>
                </div>
                <div className="space-y-3">
                  {loansByType.map((type, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full bg-blue-${500 + index * 100}`} />
                        <span className="text-sm font-medium">{type.type}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">
                          {type.count} prêts
                        </span>
                        <span className="text-sm font-bold">
                          €{type.amount.toLocaleString()}
                        </span>
                        <Badge variant="outline">{type.percentage}%</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="loans" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Rapport détaillé des prêts</CardTitle>
              <CardDescription>
                Analyse complète des prêts pour la période sélectionnée
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Nouveaux prêts</p>
                    <p className="text-2xl font-bold text-blue-600">45</p>
                    <p className="text-xs text-muted-foreground">+12% vs mois dernier</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Prêts complétés</p>
                    <p className="text-2xl font-bold text-green-600">28</p>
                    <p className="text-xs text-muted-foreground">+5% vs mois dernier</p>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Taille moyenne</p>
                    <p className="text-2xl font-bold text-yellow-600">€7,500</p>
                    <p className="text-xs text-muted-foreground">-3% vs mois dernier</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Performance par mois</h4>
                  <div className="space-y-2">
                    {monthlyData.loans.map((month, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded">
                        <span className="font-medium">{month.month}</span>
                        <div className="flex gap-6">
                          <span className="text-sm">
                            <span className="text-muted-foreground">Approuvés:</span> {month.approved}
                          </span>
                          <span className="text-sm">
                            <span className="text-muted-foreground">Décaissés:</span> {month.disbursed}
                          </span>
                          <span className="text-sm">
                            <span className="text-muted-foreground">Complétés:</span> {month.completed}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cashflow" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Analyse de trésorerie</CardTitle>
              <CardDescription>
                Flux financiers détaillés et projections
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Total entrées</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-green-600">
                        €258,000
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        6 derniers mois
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Total sorties</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-red-600">
                        €218,000
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        6 derniers mois
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Flux net</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">
                        €40,000
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Positif
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Détail mensuel</h4>
                  <div className="space-y-2">
                    {monthlyData.cashFlow.map((month, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded">
                        <span className="font-medium">{month.month}</span>
                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-green-600" />
                            <span className="text-green-600">€{month.inflow.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <TrendingDown className="h-4 w-4 text-red-600" />
                            <span className="text-red-600">€{month.outflow.toLocaleString()}</span>
                          </div>
                          <span className="font-bold">
                            Net: €{(month.inflow - month.outflow).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="borrowers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Rapport des emprunteurs</CardTitle>
              <CardDescription>
                Analyse des principaux emprunteurs et leur fiabilité
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Total emprunteurs</p>
                    <p className="text-2xl font-bold">342</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Emprunteurs actifs</p>
                    <p className="text-2xl font-bold">156</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Nouveaux ce mois</p>
                    <p className="text-2xl font-bold">23</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Fiabilité moyenne</p>
                    <p className="text-2xl font-bold">91.5%</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Top emprunteurs</h4>
                  <div className="space-y-3">
                    {topBorrowers.map((borrower, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <p className="font-medium">{borrower.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Total emprunté: €{borrower.totalBorrowed.toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant={borrower.status === 'active' ? 'default' : 'secondary'}>
                            {borrower.status === 'active' ? 'Actif' : 'Complété'}
                          </Badge>
                          <div className="text-right">
                            <p className="text-sm font-medium">Fiabilité</p>
                            <p className="text-lg font-bold">{borrower.reliability}%</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle>Options d&apos;export</CardTitle>
          <CardDescription>
            Choisissez le format et les sections à inclure dans le rapport
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="cursor-pointer">
                <input type="checkbox" className="mr-2" defaultChecked />
                Résumé financier
              </Badge>
              <Badge variant="outline" className="cursor-pointer">
                <input type="checkbox" className="mr-2" defaultChecked />
                Graphiques
              </Badge>
              <Badge variant="outline" className="cursor-pointer">
                <input type="checkbox" className="mr-2" defaultChecked />
                Détail des prêts
              </Badge>
              <Badge variant="outline" className="cursor-pointer">
                <input type="checkbox" className="mr-2" />
                Transactions détaillées
              </Badge>
              <Badge variant="outline" className="cursor-pointer">
                <input type="checkbox" className="mr-2" />
                Liste des emprunteurs
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => handleExportReport('pdf')}>
                <FileText className="h-4 w-4 mr-2" />
                Générer rapport PDF
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => handleExportReport('excel')}>
                <BarChart3 className="h-4 w-4 mr-2" />
                Exporter vers Excel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}