'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Loader2, CheckCircle2, Building2, Users, Shield, TrendingUp, Globe, Clock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';

// Form validation schema
const organizationSchema = z.object({
  // Organization details
  organizationName: z.string()
    .min(3, 'Le nom doit contenir au moins 3 caractères')
    .max(200, 'Le nom ne peut pas dépasser 200 caractères'),
  slug: z.string()
    .min(2, 'L\'identifiant doit contenir au moins 2 caractères')
    .max(50, 'L\'identifiant ne peut pas dépasser 50 caractères')
    .regex(/^[a-z][a-z0-9-]*[a-z0-9]$/, 'L\'identifiant doit commencer par une lettre et ne contenir que des lettres minuscules, chiffres et tirets'),
  
  // Contact information
  adminName: z.string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères'),
  adminEmail: z.string()
    .email('Email invalide'),
  phoneNumber: z.string()
    .min(10, 'Numéro de téléphone invalide')
    .optional(),
  
  // Address
  address: z.string()
    .min(5, 'L\'adresse doit contenir au moins 5 caractères')
    .max(500, 'L\'adresse ne peut pas dépasser 500 caractères'),
  city: z.string()
    .min(2, 'La ville doit contenir au moins 2 caractères')
    .max(100, 'La ville ne peut pas dépasser 100 caractères'),
  postalCode: z.string()
    .min(4, 'Code postal invalide')
    .max(20, 'Code postal invalide'),
  country: z.string()
    .min(2, 'Le pays doit contenir au moins 2 caractères')
    .max(100, 'Le pays ne peut pas dépasser 100 caractères'),
  
  // Plan selection (un seul plan pour tous)
  plan: z.enum(['GMAH']).default('GMAH'),
  
  // Additional info
  expectedUsers: z.string(),
  description: z.string()
    .max(1000, 'La description ne peut pas dépasser 1000 caractères')
    .optional(),
  
  // Terms
  acceptTerms: z.boolean().refine(val => val === true, {
    message: 'Vous devez accepter les conditions d\'utilisation'
  }),
  acceptDataProcessing: z.boolean().refine(val => val === true, {
    message: 'Vous devez accepter le traitement des données'
  })
});

type OrganizationFormData = z.infer<typeof organizationSchema>;

// Plan unique pour toutes les organisations GMAH
const defaultPlan = {
  id: 'GMAH',
  name: 'GMAH Platform',
  price: 'Gratuit',
  description: 'Plateforme complète de gestion de prêts communautaires',
  features: [
    'Membres illimités',
    'Prêts illimités',
    'Domaines personnalisés illimités',
    'Toutes les fonctionnalités',
    'Support communautaire',
    'Mises à jour automatiques',
    'Conformité Halakhique',
    'Multi-langues (FR/EN/HE)'
  ],
  recommended: true
};

export default function SignupOrganizationPage() {
  const router = useRouter();
  const t = useTranslations();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [currentStep, setCurrentStep] = useState('info');

  const form = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      organizationName: '',
      slug: '',
      adminName: '',
      adminEmail: '',
      phoneNumber: '',
      address: '',
      city: '',
      postalCode: '',
      country: 'France',
      plan: 'GMAH',
      expectedUsers: '50-100',
      description: '',
      acceptTerms: false,
      acceptDataProcessing: false
    }
  });

  // Auto-generate slug from organization name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[éèêë]/g, 'e')
      .replace(/[àâä]/g, 'a')
      .replace(/[ïî]/g, 'i')
      .replace(/[ôö]/g, 'o')
      .replace(/[ùûü]/g, 'u')
      .replace(/[ç]/g, 'c')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50);
  };

  const onSubmit = async (data: OrganizationFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch('/api/organizations/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Une erreur est survenue');
      }

      setSubmitSuccess(true);
      
      // Redirect after 3 seconds
      setTimeout(() => {
        router.push('/');
      }, 3000);
    } catch (error: any) {
      setSubmitError(error.message || 'Une erreur est survenue lors de l\'inscription');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
              <h2 className="text-2xl font-bold">Inscription réussie !</h2>
              <p className="text-muted-foreground">
                Votre demande d'inscription a été enregistrée avec succès.
                Nous allons créer votre espace et vous envoyer les informations de connexion par email.
              </p>
              <p className="text-sm text-muted-foreground">
                Vous allez être redirigé dans quelques secondes...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold">GMAH Platform</h1>
            </div>
            <Link href="/login">
              <Button variant="outline">
                Déjà inscrit ? Se connecter
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h1 className="text-4xl font-bold mb-4">
            Créez votre plateforme de prêts communautaires
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Digitalisez et automatisez la gestion de vos prêts sans intérêt en quelques minutes
          </p>
          
          {/* Value Propositions */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="flex flex-col items-center p-4">
              <Shield className="h-8 w-8 text-primary mb-2" />
              <h3 className="font-semibold">100% Sécurisé</h3>
              <p className="text-sm text-muted-foreground">Données isolées et chiffrées</p>
            </div>
            <div className="flex flex-col items-center p-4">
              <Users className="h-8 w-8 text-primary mb-2" />
              <h3 className="font-semibold">Multi-utilisateurs</h3>
              <p className="text-sm text-muted-foreground">9 rôles différents</p>
            </div>
            <div className="flex flex-col items-center p-4">
              <Globe className="h-8 w-8 text-primary mb-2" />
              <h3 className="font-semibold">Multi-langues</h3>
              <p className="text-sm text-muted-foreground">FR, EN, HE avec RTL</p>
            </div>
            <div className="flex flex-col items-center p-4">
              <Clock className="h-8 w-8 text-primary mb-2" />
              <h3 className="font-semibold">Rapide</h3>
              <p className="text-sm text-muted-foreground">Activé en 5 minutes</p>
            </div>
          </div>
        </div>

        {/* Registration Form */}
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>Inscription Organisation</CardTitle>
            <CardDescription>
              Remplissez ce formulaire pour créer votre espace dédié
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <Tabs value={currentStep} onValueChange={setCurrentStep}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="info">Informations</TabsTrigger>
                    <TabsTrigger value="plan">Forfait</TabsTrigger>
                    <TabsTrigger value="confirm">Confirmation</TabsTrigger>
                  </TabsList>

                  {/* Step 1: Organization Info */}
                  <TabsContent value="info" className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Informations sur l'organisation</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="organizationName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nom de l'organisation *</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="GMAH Paris" 
                                  {...field}
                                  onChange={(e) => {
                                    field.onChange(e);
                                    const slug = generateSlug(e.target.value);
                                    form.setValue('slug', slug);
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="slug"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Identifiant unique *</FormLabel>
                              <FormControl>
                                <Input placeholder="paris" {...field} />
                              </FormControl>
                              <FormDescription>
                                Votre URL sera: {field.value || 'identifiant'}.gmah.com
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description de l'organisation</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Décrivez votre organisation et ses activités..."
                                className="min-h-[100px]"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Contact administrateur</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="adminName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nom complet *</FormLabel>
                              <FormControl>
                                <Input placeholder="Jean Dupont" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="adminEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email *</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="admin@organisation.org" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="phoneNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Téléphone</FormLabel>
                              <FormControl>
                                <Input type="tel" placeholder="+33 1 23 45 67 89" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Adresse</h3>
                      
                      <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Adresse *</FormLabel>
                            <FormControl>
                              <Input placeholder="123 Rue de la Paix" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Ville *</FormLabel>
                              <FormControl>
                                <Input placeholder="Paris" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="postalCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Code postal *</FormLabel>
                              <FormControl>
                                <Input placeholder="75001" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="country"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Pays *</FormLabel>
                              <FormControl>
                                <Input placeholder="France" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button 
                        type="button" 
                        onClick={() => setCurrentStep('plan')}
                      >
                        Suivant
                      </Button>
                    </div>
                  </TabsContent>

                  {/* Step 2: Plan Selection */}
                  <TabsContent value="plan" className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Votre plateforme GMAH</h3>
                      
                      <Card className="border-primary bg-primary/5">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-xl">{defaultPlan.name}</CardTitle>
                              <Badge className="mt-2" variant="secondary">
                                <Sparkles className="mr-1 h-3 w-3" />
                                Toutes les fonctionnalités incluses
                              </Badge>
                            </div>
                            <span className="font-bold text-2xl text-primary">{defaultPlan.price}</span>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-muted-foreground mb-4">
                            {defaultPlan.description}
                          </p>
                          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {defaultPlan.features.map((feature, idx) => (
                              <li key={idx} className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                                <span className="text-sm">{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                      
                      {/* Hidden field for plan */}
                      <FormField
                        control={form.control}
                        name="plan"
                        render={({ field }) => (
                          <FormItem className="hidden">
                            <FormControl>
                              <input type="hidden" {...field} value="GMAH" />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="expectedUsers"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nombre d'utilisateurs prévus</FormLabel>
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="flex flex-wrap gap-4"
                              >
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="1-50" id="1-50" />
                                  <label htmlFor="1-50">1-50</label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="50-100" id="50-100" />
                                  <label htmlFor="50-100">50-100</label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="100-500" id="100-500" />
                                  <label htmlFor="100-500">100-500</label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="500+" id="500+" />
                                  <label htmlFor="500+">500+</label>
                                </div>
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-between">
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => setCurrentStep('info')}
                      >
                        Précédent
                      </Button>
                      <Button 
                        type="button" 
                        onClick={() => setCurrentStep('confirm')}
                      >
                        Suivant
                      </Button>
                    </div>
                  </TabsContent>

                  {/* Step 3: Confirmation */}
                  <TabsContent value="confirm" className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Confirmation et conditions</h3>
                      
                      <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                        <h4 className="font-semibold">Récapitulatif</h4>
                        <div className="text-sm space-y-1">
                          <p><strong>Organisation:</strong> {form.watch('organizationName')}</p>
                          <p><strong>URL:</strong> {form.watch('slug')}.gmah.com</p>
                          <p><strong>Forfait:</strong> {defaultPlan.name} (Gratuit)</p>
                          <p><strong>Contact:</strong> {form.watch('adminEmail')}</p>
                        </div>
                      </div>

                      <FormField
                        control={form.control}
                        name="acceptTerms"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>
                                J'accepte les{' '}
                                <Link href="/terms" className="text-primary underline" target="_blank">
                                  conditions d'utilisation
                                </Link>{' '}
                                et la{' '}
                                <Link href="/privacy" className="text-primary underline" target="_blank">
                                  politique de confidentialité
                                </Link>
                              </FormLabel>
                              <FormMessage />
                            </div>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="acceptDataProcessing"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>
                                J'accepte le traitement de mes données personnelles conformément au RGPD
                              </FormLabel>
                              <FormMessage />
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>

                    {submitError && (
                      <Alert variant="destructive">
                        <AlertDescription>{submitError}</AlertDescription>
                      </Alert>
                    )}

                    <div className="flex justify-between">
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => setCurrentStep('plan')}
                        disabled={isSubmitting}
                      >
                        Précédent
                      </Button>
                      <Button 
                        type="submit"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Création en cours...
                          </>
                        ) : (
                          'Créer mon espace'
                        )}
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Features Section */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <Card>
            <CardHeader>
              <Shield className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Sécurité maximale</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Base de données dédiée et isolée pour chaque organisation. 
                Chiffrement de bout en bout et conformité RGPD.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <TrendingUp className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Tableau de bord complet</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Visualisez vos métriques en temps réel, générez des rapports 
                et suivez l'évolution de votre activité.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Users className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Support dédié</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Une équipe à votre écoute pour vous accompagner dans la prise 
                en main et l'utilisation de la plateforme.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}