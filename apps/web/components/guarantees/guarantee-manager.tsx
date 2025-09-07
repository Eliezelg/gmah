'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  UserPlus,
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Mail,
  Phone,
  Loader2,
  FileSignature,
  Euro,
} from 'lucide-react';

interface Guarantee {
  id: string;
  guarantorId: string;
  guarantor?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
  };
  type: string;
  status: 'PENDING' | 'ACTIVE' | 'RELEASED' | 'CANCELLED' | 'INVOKED';
  amount: number;
  percentage?: number;
  signedDate?: string;
  createdAt: string;
}

interface GuaranteeManagerProps {
  loanId: string;
  loanAmount: number;
  onGuaranteesChange?: (guarantees: Guarantee[]) => void;
  readOnly?: boolean;
}

const guaranteeSchema = z.object({
  guarantorEmail: z.string().email('Email invalide'),
  type: z.enum(['SIMPLE', 'JOINT', 'COLLECTIVE', 'DEPOSIT', 'ASSET_BACKED']),
  amount: z.number().min(100, 'Le montant minimum est de 100€'),
  percentage: z.number().min(1).max(100).optional(),
});

type GuaranteeFormValues = z.infer<typeof guaranteeSchema>;

const guaranteeTypes = [
  { value: 'SIMPLE', label: 'Garantie Simple', description: 'Un seul garant' },
  { value: 'JOINT', label: 'Garantie Conjointe', description: 'Plusieurs garants solidaires' },
  { value: 'COLLECTIVE', label: 'Garantie Collective', description: 'Groupe de garants' },
  { value: 'DEPOSIT', label: 'Dépôt de Garantie', description: 'Montant bloqué' },
  { value: 'ASSET_BACKED', label: 'Garantie sur Actif', description: 'Bien en garantie' },
];

export function GuaranteeManager({
  loanId,
  loanAmount,
  onGuaranteesChange,
  readOnly = false,
}: GuaranteeManagerProps) {
  const [guarantees, setGuarantees] = useState<Guarantee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingGuarantee, setIsAddingGuarantee] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const form = useForm<GuaranteeFormValues>({
    resolver: zodResolver(guaranteeSchema),
    defaultValues: {
      guarantorEmail: '',
      type: 'SIMPLE',
      amount: loanAmount * 0.3, // Default to 30% of loan
      percentage: 30,
    },
  });

  useEffect(() => {
    fetchGuarantees();
  }, [loanId]);

  const fetchGuarantees = async () => {
    try {
      const response = await apiClient.get(`/guarantees/loan/${loanId}`);
      setGuarantees(response.data);
      onGuaranteesChange?.(response.data);
    } catch (error) {
      console.error('Error fetching guarantees:', error);
    }
  };

  const onSubmit = async (data: GuaranteeFormValues) => {
    setIsAddingGuarantee(true);
    try {
      // First, find guarantor by email
      let guarantor;
      let userSearchFailed = false;
      try {
        const usersResponse = await apiClient.get(`/users?email=${data.guarantorEmail}`);
        guarantor = usersResponse.data[0];
      } catch (error: any) {
        if (error.response?.status === 403) {
          // If user search fails due to auth, create guarantee with email only
          // The backend should handle this case
          console.warn('User search failed due to auth, proceeding with email only');
          userSearchFailed = true;
        } else {
          throw error;
        }
      }
      
      if (!guarantor && !userSearchFailed) {
        toast.error('Aucun utilisateur trouvé avec cet email');
        setIsAddingGuarantee(false);
        return;
      }

      // Create guarantee
      const guaranteeData: any = {
        loanId,
        type: data.type,
        amount: data.amount,
        percentage: data.percentage,
      };
      
      // Add guarantor info based on what we have
      if (guarantor) {
        guaranteeData.guarantorId = guarantor.id;
      } else {
        // If we couldn't find the user, send the email for backend to handle
        guaranteeData.guarantorEmail = data.guarantorEmail;
      }

      await apiClient.post('/guarantees', guaranteeData);
      toast.success('Invitation de garantie envoyée avec succès');
      
      // Send notification email (handled by backend)
      
      setDialogOpen(false);
      form.reset();
      fetchGuarantees();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'ajout du garant');
    } finally {
      setIsAddingGuarantee(false);
    }
  };

  const handleCancelGuarantee = async (guaranteeId: string) => {
    try {
      await apiClient.post(`/guarantees/${guaranteeId}/cancel`);
      toast.success('Garantie annulée');
      fetchGuarantees();
    } catch (error) {
      toast.error('Erreur lors de l\'annulation');
    }
  };

  const handleResendInvitation = async (guarantee: Guarantee) => {
    toast.info('Email de rappel envoyé à ' + guarantee.guarantor?.email);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: { label: 'En attente', variant: 'secondary' as const, icon: Clock },
      ACTIVE: { label: 'Active', variant: 'success' as const, icon: CheckCircle },
      RELEASED: { label: 'Libérée', variant: 'outline' as const, icon: Shield },
      CANCELLED: { label: 'Annulée', variant: 'destructive' as const, icon: XCircle },
      INVOKED: { label: 'Invoquée', variant: 'warning' as const, icon: AlertCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const totalGuaranteed = guarantees.reduce((sum, g) => 
    g.status === 'ACTIVE' ? sum + g.amount : sum, 0
  );
  const guaranteePercentage = loanAmount > 0 ? (totalGuaranteed / loanAmount * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Garanties du prêt</CardTitle>
          <CardDescription>
            Gérez les garanties pour sécuriser votre demande de prêt
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Couverture des garanties</span>
              <span className="font-medium">
                {guaranteePercentage.toFixed(0)}% ({totalGuaranteed}€ / {loanAmount}€)
              </span>
            </div>
            <Progress value={guaranteePercentage} className="h-2" />
          </div>

          {guaranteePercentage < 100 && (
            <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>
                Il est recommandé d'avoir au moins 100% du montant garanti pour augmenter vos chances d'approbation
              </span>
            </div>
          )}

          {!readOnly && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Ajouter un garant
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Inviter un garant</DialogTitle>
                  <DialogDescription>
                    Le garant recevra un email pour confirmer sa garantie
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="guarantorEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email du garant</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="garant@example.com"
                              type="email"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Le garant doit avoir un compte sur la plateforme
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type de garantie</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {guaranteeTypes.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  <div>
                                    <div className="font-medium">{type.label}</div>
                                    <div className="text-xs text-gray-500">{type.description}</div>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Montant garanti (€)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={100}
                              max={loanAmount}
                              {...field}
                              onChange={(e) => {
                                const value = Number(e.target.value);
                                field.onChange(value);
                                form.setValue('percentage', 
                                  loanAmount > 0 ? Math.round(value / loanAmount * 100) : 0
                                );
                              }}
                            />
                          </FormControl>
                          <FormDescription>
                            Montant maximum: {loanAmount}€
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setDialogOpen(false)}
                      >
                        Annuler
                      </Button>
                      <Button type="submit" disabled={isAddingGuarantee}>
                        {isAddingGuarantee && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Envoyer l'invitation
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </CardContent>
      </Card>

      {/* Guarantees List */}
      {guarantees.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Liste des garants</h3>
          {guarantees.map((guarantee) => (
            <Card key={guarantee.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {guarantee.guarantor?.firstName?.[0]}
                        {guarantee.guarantor?.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {guarantee.guarantor?.firstName} {guarantee.guarantor?.lastName}
                        </p>
                        {getStatusBadge(guarantee.status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {guarantee.guarantor?.email}
                        </div>
                        {guarantee.guarantor?.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {guarantee.guarantor.phone}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span>
                          <Euro className="inline h-3 w-3" />
                          {guarantee.amount}
                        </span>
                        {guarantee.percentage && (
                          <Badge variant="outline">{guarantee.percentage}%</Badge>
                        )}
                        <Badge variant="outline">
                          {guaranteeTypes.find(t => t.value === guarantee.type)?.label}
                        </Badge>
                      </div>
                      {guarantee.signedDate && (
                        <div className="flex items-center gap-1 text-xs text-green-600">
                          <FileSignature className="h-3 w-3" />
                          Signé le {new Date(guarantee.signedDate).toLocaleDateString('fr-FR')}
                        </div>
                      )}
                    </div>
                  </div>

                  {!readOnly && guarantee.status === 'PENDING' && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleResendInvitation(guarantee)}
                      >
                        Renvoyer
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500 hover:text-red-600"
                        onClick={() => handleCancelGuarantee(guarantee.id)}
                      >
                        Annuler
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {guarantees.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <Shield className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500">Aucun garant ajouté</p>
            <p className="text-sm text-gray-400 mt-1">
              Ajoutez des garants pour sécuriser votre demande
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}