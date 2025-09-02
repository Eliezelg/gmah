'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Settings,
  Shield,
  Users,
  Euro,
  Calendar,
  Bell,
  Check,
  Loader2,
  Save,
  RefreshCw,
  Building,
  User,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface OrganizationSettings {
  name: string;
  approvalMode: 'single' | 'committee';
  minCommitteeMembers?: number;
  maxLoanAmount: number;
  maxLoanDuration: number;
  requireGuarantee: boolean;
  minGuaranteePercentage?: number;
  requireDocuments: boolean;
  autoApproveBelow?: number;
  notificationsEnabled: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
  currency: string;
  timezone: string;
}

export default function AdminSettingsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<OrganizationSettings>({
    name: 'GMAH Platform',
    approvalMode: 'single',
    minCommitteeMembers: 3,
    maxLoanAmount: 50000,
    maxLoanDuration: 60,
    requireGuarantee: true,
    minGuaranteePercentage: 50,
    requireDocuments: true,
    autoApproveBelow: 0,
    notificationsEnabled: true,
    emailNotifications: true,
    smsNotifications: false,
    currency: 'EUR',
    timezone: 'Europe/Paris',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      // In a real app, this would fetch from API
      const savedSettings = localStorage.getItem('orgSettings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      toast.error('Erreur lors du chargement des paramètres');
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      // In a real app, this would save to API
      localStorage.setItem('orgSettings', JSON.stringify(settings));
      toast.success('Paramètres sauvegardés avec succès');
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefaults = () => {
    setSettings({
      name: 'GMAH Platform',
      approvalMode: 'single',
      minCommitteeMembers: 3,
      maxLoanAmount: 50000,
      maxLoanDuration: 60,
      requireGuarantee: true,
      minGuaranteePercentage: 50,
      requireDocuments: true,
      autoApproveBelow: 0,
      notificationsEnabled: true,
      emailNotifications: true,
      smsNotifications: false,
      currency: 'EUR',
      timezone: 'Europe/Paris',
    });
    toast.info('Paramètres réinitialisés');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Paramètres de l&apos;Organisation</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Configurez le fonctionnement de votre plateforme GMAH
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetToDefaults}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Réinitialiser
          </Button>
          <Button onClick={saveSettings} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Sauvegarder
          </Button>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">
            <Building className="mr-2 h-4 w-4" />
            Général
          </TabsTrigger>
          <TabsTrigger value="approval">
            <Shield className="mr-2 h-4 w-4" />
            Approbation
          </TabsTrigger>
          <TabsTrigger value="loans">
            <Euro className="mr-2 h-4 w-4" />
            Prêts
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="mr-2 h-4 w-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres Généraux</CardTitle>
              <CardDescription>
                Informations de base de votre organisation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="orgName">Nom de l&apos;organisation</Label>
                <Input
                  id="orgName"
                  value={settings.name}
                  onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                  placeholder="GMAH Platform"
                />
              </div>

              <div>
                <Label htmlFor="currency">Devise</Label>
                <Select
                  value={settings.currency}
                  onValueChange={(value) => setSettings({ ...settings, currency: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="ILS">ILS (₪)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="timezone">Fuseau horaire</Label>
                <Select
                  value={settings.timezone}
                  onValueChange={(value) => setSettings({ ...settings, timezone: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Europe/Paris">Paris (GMT+1)</SelectItem>
                    <SelectItem value="Asia/Jerusalem">Jérusalem (GMT+2)</SelectItem>
                    <SelectItem value="America/New_York">New York (GMT-5)</SelectItem>
                    <SelectItem value="UTC">UTC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Approval Settings */}
        <TabsContent value="approval">
          <Card>
            <CardHeader>
              <CardTitle>Mode d&apos;Approbation</CardTitle>
              <CardDescription>
                Définissez comment les prêts sont approuvés dans votre organisation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label>Mode de décision</Label>
                <RadioGroup
                  value={settings.approvalMode}
                  onValueChange={(value: any) => setSettings({ ...settings, approvalMode: value })}
                >
                  <div className="flex items-start space-x-3 p-4 border rounded-lg">
                    <RadioGroupItem value="single" id="single" />
                    <div className="space-y-1">
                      <label htmlFor="single" className="flex items-center gap-2 cursor-pointer">
                        <User className="h-4 w-4" />
                        <span className="font-medium">Décideur unique</span>
                      </label>
                      <p className="text-sm text-gray-500">
                        Un seul administrateur peut approuver ou rejeter les prêts directement
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-4 border rounded-lg">
                    <RadioGroupItem value="committee" id="committee" />
                    <div className="space-y-1">
                      <label htmlFor="committee" className="flex items-center gap-2 cursor-pointer">
                        <Users className="h-4 w-4" />
                        <span className="font-medium">Comité d&apos;approbation</span>
                      </label>
                      <p className="text-sm text-gray-500">
                        Plusieurs membres votent pour approuver ou rejeter les prêts
                      </p>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              {settings.approvalMode === 'committee' && (
                <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div>
                    <Label htmlFor="minMembers">
                      Nombre minimum de membres du comité
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="inline ml-2 h-4 w-4 text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Nombre minimum de votes requis pour une décision</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                    <Input
                      id="minMembers"
                      type="number"
                      min={2}
                      max={10}
                      value={settings.minCommitteeMembers}
                      onChange={(e) => setSettings({ 
                        ...settings, 
                        minCommitteeMembers: parseInt(e.target.value) 
                      })}
                    />
                  </div>
                </div>
              )}

              <Separator />

              <div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Approbation automatique</Label>
                    <p className="text-sm text-gray-500">
                      Approuver automatiquement les prêts en dessous d'un certain montant
                    </p>
                  </div>
                  <Switch
                    checked={settings.autoApproveBelow! > 0}
                    onCheckedChange={(checked) => 
                      setSettings({ 
                        ...settings, 
                        autoApproveBelow: checked ? 1000 : 0 
                      })
                    }
                  />
                </div>

                {settings.autoApproveBelow! > 0 && (
                  <div className="mt-4">
                    <Label htmlFor="autoApproveAmount">
                      Montant maximum pour approbation automatique ({settings.currency})
                    </Label>
                    <Input
                      id="autoApproveAmount"
                      type="number"
                      min={0}
                      value={settings.autoApproveBelow}
                      onChange={(e) => setSettings({ 
                        ...settings, 
                        autoApproveBelow: parseInt(e.target.value) 
                      })}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Loan Settings */}
        <TabsContent value="loans">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres des Prêts</CardTitle>
              <CardDescription>
                Définissez les règles et limites pour les prêts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="maxAmount">
                  Montant maximum par prêt ({settings.currency})
                </Label>
                <Input
                  id="maxAmount"
                  type="number"
                  min={100}
                  value={settings.maxLoanAmount}
                  onChange={(e) => setSettings({ 
                    ...settings, 
                    maxLoanAmount: parseInt(e.target.value) 
                  })}
                />
              </div>

              <div>
                <Label htmlFor="maxDuration">
                  Durée maximum (mois)
                </Label>
                <Input
                  id="maxDuration"
                  type="number"
                  min={1}
                  max={120}
                  value={settings.maxLoanDuration}
                  onChange={(e) => setSettings({ 
                    ...settings, 
                    maxLoanDuration: parseInt(e.target.value) 
                  })}
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Garanties obligatoires</Label>
                    <p className="text-sm text-gray-500">
                      Exiger des garanties pour tous les prêts
                    </p>
                  </div>
                  <Switch
                    checked={settings.requireGuarantee}
                    onCheckedChange={(checked) => 
                      setSettings({ ...settings, requireGuarantee: checked })
                    }
                  />
                </div>

                {settings.requireGuarantee && (
                  <div>
                    <Label htmlFor="minGuarantee">
                      Pourcentage minimum de garantie (%)
                    </Label>
                    <Input
                      id="minGuarantee"
                      type="number"
                      min={0}
                      max={200}
                      value={settings.minGuaranteePercentage}
                      onChange={(e) => setSettings({ 
                        ...settings, 
                        minGuaranteePercentage: parseInt(e.target.value) 
                      })}
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Documents obligatoires</Label>
                  <p className="text-sm text-gray-500">
                    Exiger des documents justificatifs pour tous les prêts
                  </p>
                </div>
                <Switch
                  checked={settings.requireDocuments}
                  onCheckedChange={(checked) => 
                    setSettings({ ...settings, requireDocuments: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>
                Configurez les notifications de la plateforme
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notifications activées</Label>
                  <p className="text-sm text-gray-500">
                    Activer le système de notifications
                  </p>
                </div>
                <Switch
                  checked={settings.notificationsEnabled}
                  onCheckedChange={(checked) => 
                    setSettings({ ...settings, notificationsEnabled: checked })
                  }
                />
              </div>

              {settings.notificationsEnabled && (
                <>
                  <Separator />
                  
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium">Canaux de notification</h3>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Email</Label>
                        <p className="text-sm text-gray-500">
                          Envoyer des notifications par email
                        </p>
                      </div>
                      <Switch
                        checked={settings.emailNotifications}
                        onCheckedChange={(checked) => 
                          setSettings({ ...settings, emailNotifications: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>SMS</Label>
                        <p className="text-sm text-gray-500">
                          Envoyer des notifications par SMS
                        </p>
                      </div>
                      <Switch
                        checked={settings.smsNotifications}
                        onCheckedChange={(checked) => 
                          setSettings({ ...settings, smsNotifications: checked })
                        }
                      />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Current Configuration Summary */}
      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-blue-600" />
            Configuration Actuelle
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Mode d&apos;approbation</p>
              <Badge variant="outline" className="mt-1">
                {settings.approvalMode === 'single' ? 'Décideur unique' : 'Comité'}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-gray-600">Prêt maximum</p>
              <p className="font-semibold">{settings.maxLoanAmount} {settings.currency}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Durée maximum</p>
              <p className="font-semibold">{settings.maxLoanDuration} mois</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Garanties</p>
              <Badge variant={settings.requireGuarantee ? 'default' : 'secondary'}>
                {settings.requireGuarantee ? 'Obligatoires' : 'Optionnelles'}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-gray-600">Documents</p>
              <Badge variant={settings.requireDocuments ? 'default' : 'secondary'}>
                {settings.requireDocuments ? 'Obligatoires' : 'Optionnels'}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-gray-600">Notifications</p>
              <Badge variant={settings.notificationsEnabled ? 'success' : 'secondary'}>
                {settings.notificationsEnabled ? 'Activées' : 'Désactivées'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}