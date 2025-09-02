'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
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
  ArrowLeft,
  ArrowRight,
  Calculator,
  Calendar,
  CheckCircle,
  FileText,
  Loader2,
  User,
  Wallet,
  AlertCircle,
  Info,
  Paperclip,
  Shield,
} from 'lucide-react';
import { DocumentUpload } from '@/components/documents/document-upload';
import { GuaranteeManager } from '@/components/guarantees/guarantee-manager';
import { format, addMonths } from 'date-fns';
import { fr } from 'date-fns/locale';

const steps = [
  { id: 1, name: 'Type de prêt', icon: FileText },
  { id: 2, name: 'Montant', icon: Wallet },
  { id: 3, name: 'Détails', icon: User },
  { id: 4, name: 'Documents', icon: Paperclip },
  { id: 5, name: 'Garanties', icon: Shield },
  { id: 6, name: 'Confirmation', icon: CheckCircle },
];

const loanTypes = [
  {
    value: 'PERSONAL',
    label: 'Prêt Personnel',
    description: 'Pour vos besoins personnels urgents',
    maxAmount: 10000,
    maxDuration: 36,
  },
  {
    value: 'BUSINESS',
    label: 'Prêt Professionnel',
    description: 'Pour développer votre activité',
    maxAmount: 50000,
    maxDuration: 60,
  },
  {
    value: 'STUDENT',
    label: 'Prêt Étudiant',
    description: 'Pour financer vos études',
    maxAmount: 20000,
    maxDuration: 48,
  },
  {
    value: 'MEDICAL',
    label: 'Prêt Médical',
    description: 'Pour des soins médicaux urgents',
    maxAmount: 30000,
    maxDuration: 36,
  },
  {
    value: 'EMERGENCY',
    label: 'Prêt Urgent',
    description: 'Pour une situation d\'urgence',
    maxAmount: 5000,
    maxDuration: 12,
  },
];

const purposes = {
  PERSONAL: [
    'Mariage',
    'Déménagement',
    'Rénovation',
    'Voyage',
    'Achat équipement',
    'Autre',
  ],
  BUSINESS: [
    'Création entreprise',
    'Développement activité',
    'Achat matériel',
    'Trésorerie',
    'Stock',
    'Autre',
  ],
  STUDENT: [
    'Frais de scolarité',
    'Logement étudiant',
    'Matériel scolaire',
    'Formation',
    'Autre',
  ],
  MEDICAL: [
    'Opération',
    'Traitement',
    'Hospitalisation',
    'Médicaments',
    'Autre',
  ],
  EMERGENCY: [
    'Réparation urgente',
    'Factures impayées',
    'Situation familiale',
    'Autre',
  ],
};

const loanSchema = z.object({
  type: z.enum(['PERSONAL', 'BUSINESS', 'STUDENT', 'MEDICAL', 'EMERGENCY']),
  amount: z.number().min(100).max(50000),
  numberOfInstallments: z.number().min(1).max(60),
  purpose: z.string().min(3),
  purposeDetails: z.object({
    category: z.string(),
    description: z.string().min(10),
  }).optional(),
});

type LoanFormValues = z.infer<typeof loanSchema>;

export default function NewLoanPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [uploadedDocuments, setUploadedDocuments] = useState<any[]>([]);
  const [guarantees, setGuarantees] = useState<any[]>([]);
  const [loanId, setLoanId] = useState<string | null>(null);
  const [tempLoanId, setTempLoanId] = useState<string | null>(null);

  const form = useForm<LoanFormValues>({
    resolver: zodResolver(loanSchema),
    defaultValues: {
      amount: 1000,
      numberOfInstallments: 12,
      purpose: '',
      purposeDetails: {
        category: '',
        description: '',
      },
    },
  });

  const watchAmount = form.watch('amount');
  const watchInstallments = form.watch('numberOfInstallments');
  const watchType = form.watch('type');

  const monthlyPayment = watchAmount && watchInstallments 
    ? (watchAmount / watchInstallments).toFixed(2)
    : '0';

  const expectedEndDate = watchInstallments 
    ? addMonths(new Date(), watchInstallments)
    : new Date();

  const currentLoanType = loanTypes.find(t => t.value === watchType);

  const handleNext = async () => {
    let fieldsToValidate: (keyof LoanFormValues)[] = [];
    
    switch (currentStep) {
      case 1:
        fieldsToValidate = ['type'];
        break;
      case 2:
        fieldsToValidate = ['amount', 'numberOfInstallments'];
        break;
      case 3:
        fieldsToValidate = ['purpose'];
        // Create a temporary loan when moving to documents step
        if (!tempLoanId) {
          try {
            const formValues = form.getValues();
            const payload = {
              ...formValues,
              expectedEndDate: expectedEndDate.toISOString(),
            };
            const response = await apiClient.post('/loans', payload);
            setTempLoanId(response.data.id);
          } catch (error) {
            toast.error('Erreur lors de la création de la demande');
            return;
          }
        }
        break;
      case 4:
        if (uploadedDocuments.length === 0) {
          toast.error('Veuillez télécharger au moins un document');
          return;
        }
        break;
    }

    const isStepValid = await form.trigger(fieldsToValidate);
    
    if (isStepValid) {
      if (currentStep < steps.length) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = async (data: LoanFormValues) => {
    // Check if documents are required and uploaded
    if (currentStep === steps.length && uploadedDocuments.length === 0) {
      toast.error('Veuillez télécharger au moins un document justificatif');
      return;
    }

    setIsLoading(true);
    try {
      // Use the temporary loan ID that was created earlier
      const finalLoanId = tempLoanId;
      
      if (!finalLoanId) {
        throw new Error('Erreur: ID de prêt manquant');
      }
      
      // Documents and guarantees are already associated with the loan
      toast.success('Demande de prêt créée avec succès!');
      
      // Submit the loan for review
      await apiClient.post(`/loans/${finalLoanId}/submit`, {
        message: 'Demande soumise pour examen',
      });
      
      router.push(`/loans/${finalLoanId}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de la soumission de la demande');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>
        <h1 className="text-3xl font-bold">Nouvelle demande de prêt</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Remplissez le formulaire pour soumettre votre demande
        </p>
      </div>

      {/* Progress */}
      <div className="space-y-4">
        <div className="flex justify-between">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`flex items-center ${
                step.id < steps.length ? 'flex-1' : ''
              }`}
            >
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full ${
                  step.id <= currentStep
                    ? 'bg-primary text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                }`}
              >
                <step.icon className="h-5 w-5" />
              </div>
              {step.id < steps.length && (
                <div
                  className={`flex-1 h-1 mx-2 ${
                    step.id < currentStep
                      ? 'bg-primary'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-sm">
          {steps.map((step) => (
            <span
              key={step.id}
              className={`${
                step.id <= currentStep
                  ? 'text-primary font-semibold'
                  : 'text-gray-400'
              }`}
            >
              {step.name}
            </span>
          ))}
        </div>
      </div>

      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>{steps[currentStep - 1].name}</CardTitle>
              <CardDescription>
                {currentStep === 1 && 'Choisissez le type de prêt qui correspond à vos besoins'}
                {currentStep === 2 && 'Définissez le montant et la durée de remboursement'}
                {currentStep === 3 && 'Précisez les détails de votre demande'}
                {currentStep === 4 && 'Ajoutez les documents justificatifs'}
                {currentStep === 5 && 'Ajoutez des garants pour sécuriser votre demande'}
                {currentStep === 6 && 'Vérifiez et confirmez votre demande'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Step 1: Loan Type */}
              {currentStep === 1 && (
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type de prêt</FormLabel>
                      <div className="grid gap-4 md:grid-cols-2">
                        {loanTypes.map((type) => (
                          <Card
                            key={type.value}
                            className={`cursor-pointer transition-all hover:shadow-md ${
                              field.value === type.value
                                ? 'border-primary ring-2 ring-primary'
                                : ''
                            }`}
                            onClick={() => {
                              field.onChange(type.value);
                              setSelectedType(type.value);
                            }}
                          >
                            <CardHeader className="pb-3">
                              <div className="flex justify-between items-start">
                                <CardTitle className="text-lg">{type.label}</CardTitle>
                                {field.value === type.value && (
                                  <CheckCircle className="h-5 w-5 text-primary" />
                                )}
                              </div>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                {type.description}
                              </p>
                              <div className="flex justify-between text-sm">
                                <span>Max: {formatCurrency(type.maxAmount)}</span>
                                <span>Durée: {type.maxDuration} mois</span>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Step 2: Amount & Duration */}
              {currentStep === 2 && currentLoanType && (
                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Montant du prêt</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                              €
                            </span>
                            <Input
                              type="number"
                              placeholder="0"
                              className="pl-8"
                              min={100}
                              max={currentLoanType.maxAmount}
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </div>
                        </FormControl>
                        <FormDescription>
                          Montant entre €100 et {formatCurrency(currentLoanType.maxAmount)}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="numberOfInstallments"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Nombre de mensualités: {field.value} mois
                        </FormLabel>
                        <FormControl>
                          <div className="space-y-2">
                            <Input
                              type="range"
                              min={1}
                              max={currentLoanType.maxDuration}
                              className="w-full"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                            <div className="flex justify-between text-sm text-gray-500">
                              <span>1 mois</span>
                              <span>{currentLoanType.maxDuration} mois</span>
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Summary */}
                  <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Montant demandé:</span>
                          <span className="font-semibold">{formatCurrency(watchAmount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Durée:</span>
                          <span className="font-semibold">{watchInstallments} mois</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between text-lg">
                          <span>Mensualité:</span>
                          <span className="font-bold text-primary">
                            {formatCurrency(Number(monthlyPayment))}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Fin prévue:</span>
                          <span>{format(expectedEndDate, 'MMMM yyyy', { locale: fr })}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Step 3: Details */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="purpose"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Objet du prêt</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: Achat de matériel informatique"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Décrivez brièvement l'utilisation prévue des fonds
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {watchType && purposes[watchType as keyof typeof purposes] && (
                    <FormField
                      control={form.control}
                      name="purposeDetails.category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Catégorie</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Sélectionnez une catégorie" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {purposes[watchType as keyof typeof purposes].map((purpose) => (
                                <SelectItem key={purpose} value={purpose}>
                                  {purpose}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="purposeDetails.description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description détaillée</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Expliquez en détail pourquoi vous avez besoin de ce prêt..."
                            className="min-h-[120px]"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Plus vous êtes précis, plus votre demande a de chances d'être approuvée rapidement
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Step 4: Documents */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-medium">Documents justificatifs</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Téléchargez les documents nécessaires pour votre demande de prêt
                      </p>
                    </div>
                    <DocumentUpload
                      loanId={tempLoanId}
                      onDocumentsChange={setUploadedDocuments}
                      existingDocuments={uploadedDocuments}
                      required={true}
                      maxFiles={5}
                    />
                  </div>

                  <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
                    <CardContent className="flex items-start gap-3 pt-6">
                      <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="space-y-2">
                        <p className="font-semibold text-blue-900 dark:text-blue-200">
                          Documents recommandés
                        </p>
                        <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1 list-disc list-inside">
                          {watchType === 'PERSONAL' && (
                            <>
                              <li>Pièce d&apos;identité valide</li>
                              <li>Justificatif de domicile</li>
                              <li>3 derniers bulletins de salaire</li>
                            </>
                          )}
                          {watchType === 'BUSINESS' && (
                            <>
                              <li>Extrait Kbis ou équivalent</li>
                              <li>Bilans comptables</li>
                              <li>Business plan</li>
                              <li>Relevés bancaires professionnels</li>
                            </>
                          )}
                          {watchType === 'STUDENT' && (
                            <>
                              <li>Carte d&apos;étudiant</li>
                              <li>Attestation d&apos;inscription</li>
                              <li>Justificatifs de ressources</li>
                            </>
                          )}
                          {watchType === 'MEDICAL' && (
                            <>
                              <li>Devis médical</li>
                              <li>Ordonnance ou prescription</li>
                              <li>Attestation de sécurité sociale</li>
                            </>
                          )}
                          {watchType === 'EMERGENCY' && (
                            <>
                              <li>Justificatif de la situation d&apos;urgence</li>
                              <li>Pièce d&apos;identité</li>
                            </>
                          )}
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Step 5: Guarantees */}
              {currentStep === 5 && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-medium">Garants</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Ajoutez des garants pour augmenter vos chances d'approbation
                      </p>
                    </div>
                    {tempLoanId && (
                      <GuaranteeManager
                        loanId={tempLoanId}
                        loanAmount={watchAmount}
                        onGuaranteesChange={setGuarantees}
                      />
                    )}
                  </div>

                  <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
                    <CardContent className="flex items-start gap-3 pt-6">
                      <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="space-y-2">
                        <p className="font-semibold text-blue-900 dark:text-blue-200">
                          Pourquoi ajouter des garants?
                        </p>
                        <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1 list-disc list-inside">
                          <li>Augmente significativement vos chances d&apos;approbation</li>
                          <li>Permet d&apos;accéder à des montants plus élevés</li>
                          <li>Accélère le processus de validation</li>
                          <li>Réduit les garanties matérielles requises</li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Step 6: Confirmation */}
              {currentStep === 6 && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Info className="h-5 w-5 text-primary" />
                        Récapitulatif de votre demande
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Type de prêt</p>
                          <p className="font-semibold">
                            {currentLoanType?.label}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Montant</p>
                          <p className="font-semibold">{formatCurrency(watchAmount)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Durée</p>
                          <p className="font-semibold">{watchInstallments} mois</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Mensualité</p>
                          <p className="font-semibold text-primary">
                            {formatCurrency(Number(monthlyPayment))}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-sm text-gray-600">Objet</p>
                          <p className="font-semibold">{form.getValues('purpose')}</p>
                        </div>
                        {form.getValues('purposeDetails.description') && (
                          <div className="col-span-2">
                            <p className="text-sm text-gray-600">Description</p>
                            <p className="text-sm">{form.getValues('purposeDetails.description')}</p>
                          </div>
                        )}
                        <div className="col-span-2">
                          <p className="text-sm text-gray-600">Documents téléchargés</p>
                          <div className="flex items-center gap-2 mt-1">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-sm font-medium">{uploadedDocuments.length} document(s)</span>
                          </div>
                        </div>
                        <div className="col-span-2">
                          <p className="text-sm text-gray-600">Garants</p>
                          <div className="flex items-center gap-2 mt-1">
                            {guarantees.length > 0 ? (
                              <>
                                <Shield className="h-4 w-4 text-green-500" />
                                <span className="text-sm font-medium">{guarantees.length} garant(s)</span>
                              </>
                            ) : (
                              <span className="text-sm text-gray-500">Aucun garant ajouté</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
                    <CardContent className="flex items-start gap-3 pt-6">
                      <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                      <div className="space-y-2">
                        <p className="font-semibold text-orange-900 dark:text-orange-200">
                          Informations importantes
                        </p>
                        <ul className="text-sm text-orange-800 dark:text-orange-300 space-y-1 list-disc list-inside">
                          <li>Votre demande sera examinée par le comité sous 48-72h</li>
                          <li>Des documents justificatifs peuvent être demandés</li>
                          <li>Aucun intérêt ne sera appliqué sur ce prêt</li>
                          <li>Vous serez notifié par email de la décision</li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 1 || isLoading}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Précédent
              </Button>
              
              {currentStep < steps.length ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={isLoading}
                >
                  Suivant
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Soumettre la demande
                </Button>
              )}
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
}