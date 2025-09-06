'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTenant, useIsTenant } from '@/contexts/tenant-context';
import { 
  Building2, 
  Users, 
  TrendingUp,
  Clock,
  Heart,
  Shield,
  Globe,
  CreditCard,
  FileText,
  BarChart3,
  ArrowRight,
  Phone,
  Mail,
  MapPin
} from 'lucide-react';

// Default landing page component (for main site)
const MainLandingPage = () => {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to the platform marketing page for the main site
    router.push('/platform');
  }, [router]);
  
  return null;
};

// Tenant-specific homepage component
const TenantHomePage = () => {
  const { tenantSettings, isLoading } = useTenant();
  const t = useTranslations();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-center">
          <Building2 className="h-12 w-12 text-primary mx-auto mb-4" />
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-primary/5">
      {/* Custom Header */}
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex h-20 items-center justify-between">
            <div className="flex items-center gap-3">
              {tenantSettings?.logo ? (
                <img 
                  src={tenantSettings.logo} 
                  alt={tenantSettings.name}
                  className="h-10 w-auto"
                />
              ) : (
                <Building2 className="h-10 w-10 text-primary" />
              )}
              <div>
                <h1 className="text-2xl font-bold">{tenantSettings?.name || 'GMAH'}</h1>
                <p className="text-sm text-muted-foreground">Plateforme de prêts communautaires</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Link href="/login">
                <Button variant="outline">Connexion</Button>
              </Link>
              <Link href="/register">
                <Button>
                  S'inscrire
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            {tenantSettings?.homeHeroImage && (
              <img 
                src={tenantSettings.homeHeroImage}
                alt="Hero"
                className="w-full max-w-2xl mx-auto mb-8 rounded-lg shadow-lg"
              />
            )}
            
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              {tenantSettings?.homeTitle || `Bienvenue chez ${tenantSettings?.name}`}
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8">
              {tenantSettings?.homeDescription || 
                'Gérez vos demandes de prêts sans intérêt en toute simplicité. Notre plateforme vous accompagne dans toutes vos démarches.'}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button size="lg" className="w-full sm:w-auto">
                  Faire une demande de prêt
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Accéder à mon espace
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <Users className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-3xl font-bold">500+</p>
              <p className="text-sm text-muted-foreground">Membres actifs</p>
            </div>
            <div className="text-center">
              <CreditCard className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-3xl font-bold">1.2M€</p>
              <p className="text-sm text-muted-foreground">Prêts accordés</p>
            </div>
            <div className="text-center">
              <Clock className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-3xl font-bold">48h</p>
              <p className="text-sm text-muted-foreground">Délai moyen</p>
            </div>
            <div className="text-center">
              <Heart className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-3xl font-bold">0%</p>
              <p className="text-sm text-muted-foreground">Taux d'intérêt</p>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Nos Services</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <FileText className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Prêts Personnels</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Pour vos besoins personnels urgents, avec des montants adaptés et des remboursements flexibles.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <Building2 className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Prêts Professionnels</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Soutenez vos projets professionnels avec des prêts adaptés aux entrepreneurs de la communauté.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <Heart className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Prêts Sociaux</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Aide d'urgence pour les situations difficiles, avec accompagnement et soutien personnalisé.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Comment ça marche ?</h2>
          
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  1
                </div>
                <h3 className="font-semibold mb-2">Inscription</h3>
                <p className="text-sm text-muted-foreground">
                  Créez votre compte en quelques minutes
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  2
                </div>
                <h3 className="font-semibold mb-2">Demande</h3>
                <p className="text-sm text-muted-foreground">
                  Soumettez votre demande de prêt en ligne
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  3
                </div>
                <h3 className="font-semibold mb-2">Validation</h3>
                <p className="text-sm text-muted-foreground">
                  Notre comité étudie votre dossier rapidement
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  4
                </div>
                <h3 className="font-semibold mb-2">Versement</h3>
                <p className="text-sm text-muted-foreground">
                  Recevez les fonds sur votre compte
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Nous Contacter</CardTitle>
                <CardDescription>
                  Notre équipe est là pour vous accompagner
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {tenantSettings?.contactPhone && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-semibold">Téléphone</p>
                        <p className="text-sm text-muted-foreground">
                          {tenantSettings.contactPhone}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {tenantSettings?.contactEmail && (
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-semibold">Email</p>
                        <p className="text-sm text-muted-foreground">
                          {tenantSettings.contactEmail}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {tenantSettings?.address && (
                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-semibold">Adresse</p>
                        <p className="text-sm text-muted-foreground">
                          {tenantSettings.address}<br />
                          {tenantSettings.postalCode} {tenantSettings.city}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Custom Footer */}
      <footer className="border-t py-12 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                {tenantSettings?.logo ? (
                  <img 
                    src={tenantSettings.logo} 
                    alt={tenantSettings.name}
                    className="h-8 w-auto"
                  />
                ) : (
                  <Building2 className="h-8 w-8 text-primary" />
                )}
                <span className="font-bold">{tenantSettings?.name}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {tenantSettings?.customFooterText || 
                  'Plateforme de gestion de prêts communautaires sans intérêt.'}
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">Liens Rapides</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/login" className="hover:text-primary">Connexion</Link></li>
                <li><Link href="/register" className="hover:text-primary">Inscription</Link></li>
                <li><Link href="/about" className="hover:text-primary">À propos</Link></li>
                <li><Link href="/contact" className="hover:text-primary">Contact</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">Services</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Prêts personnels</li>
                <li>Prêts professionnels</li>
                <li>Aide d'urgence</li>
                <li>Accompagnement</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">Légal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/privacy" className="hover:text-primary">Confidentialité</Link></li>
                <li><Link href="/terms" className="hover:text-primary">Conditions</Link></li>
                <li><Link href="/rgpd" className="hover:text-primary">RGPD</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
            <p>{tenantSettings?.customFooterText || `© 2024 ${tenantSettings?.name}. Tous droits réservés.`}</p>
            <p className="mt-2">Propulsé par GMAH Platform</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

// Main component that decides which page to show
export default function HomePage() {
  const isTenant = useIsTenant();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  // Show tenant homepage if on a tenant subdomain
  if (isTenant) {
    return <TenantHomePage />;
  }

  // Otherwise show main landing page
  return <MainLandingPage />;
}