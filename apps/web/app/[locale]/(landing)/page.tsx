'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  Shield, 
  Users, 
  Globe, 
  Clock, 
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  Star,
  Zap,
  Lock,
  BarChart3,
  HeartHandshake,
  Sparkles
} from 'lucide-react';

export default function LandingPage() {
  const t = useTranslations();

  const features = [
    {
      icon: Shield,
      title: "Sécurité Maximale",
      description: "Base de données isolée par organisation, chiffrement de bout en bout, conformité RGPD"
    },
    {
      icon: Users,
      title: "Gestion Multi-Rôles",
      description: "9 rôles différents avec permissions granulaires pour une gestion optimale"
    },
    {
      icon: Globe,
      title: "Multi-Langues",
      description: "Interface disponible en Français, Anglais et Hébreu avec support RTL"
    },
    {
      icon: Zap,
      title: "Performance",
      description: "Temps de chargement < 3s, support de 1000+ utilisateurs simultanés"
    },
    {
      icon: BarChart3,
      title: "Analytics Complet",
      description: "Tableaux de bord en temps réel, rapports détaillés, export multi-formats"
    },
    {
      icon: Lock,
      title: "Conformité Halakhique",
      description: "Respect des lois juives, gestion Shemitat Kesafim, prêts sans intérêt"
    }
  ];

  const testimonials = [
    {
      name: "David Cohen",
      role: "Président GMAH Paris",
      content: "Cette plateforme a révolutionné notre gestion. Nous avons divisé par 3 le temps de traitement des demandes.",
      rating: 5
    },
    {
      name: "Sarah Levy",
      role: "Trésorière GMAH Lyon",
      content: "L'interface est intuitive et les rapports financiers nous font gagner un temps précieux.",
      rating: 5
    },
    {
      name: "Michael Benhamou",
      role: "Admin GMAH Marseille",
      content: "Le support client est exceptionnel et la plateforme est parfaitement adaptée à nos besoins.",
      rating: 5
    }
  ];

  // Un seul plan pour toutes les organisations GMAH
  const gmahPlan = {
    name: "GMAH Platform",
    price: "Gratuit",
    description: "Solution complète pour votre GMAH",
    features: [
      "Membres illimités",
      "Prêts illimités",
      "Domaines personnalisés illimités",
      "Support multi-langues (FR/EN/HE)",
      "Conformité Halakhique garantie",
      "Rapports et analytics complets",
      "API et intégrations",
      "Support communautaire",
      "Mises à jour automatiques",
      "Sécurité maximale"
    ],
    cta: "Créer votre GMAH",
    highlighted: true
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-primary/5">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">GMAH Platform</span>
            </div>
            
            <div className="hidden md:flex items-center gap-6">
              <Link href="#features" className="text-sm font-medium hover:text-primary">
                Fonctionnalités
              </Link>
              <Link href="#pricing" className="text-sm font-medium hover:text-primary">
                Tarifs
              </Link>
              <Link href="#testimonials" className="text-sm font-medium hover:text-primary">
                Témoignages
              </Link>
              <Link href="#contact" className="text-sm font-medium hover:text-primary">
                Contact
              </Link>
            </div>

            <div className="flex items-center gap-4">
              <Link href="/login">
                <Button variant="outline">Connexion</Button>
              </Link>
              <Link href="/signup-organization">
                <Button>
                  Inscription
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center">
            <Badge className="mb-4" variant="secondary">
              <Sparkles className="mr-1 h-3 w-3" />
              Plateforme #1 de gestion GMAH
            </Badge>
            
            <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              La solution complète pour gérer vos{' '}
              <span className="text-primary">prêts communautaires</span>
            </h1>
            
            <p className="mb-8 text-xl text-muted-foreground">
              Digitalisez et automatisez la gestion de vos prêts sans intérêt.
              Interface multi-langues, conformité Halakhique, sécurité maximale.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup-organization">
                <Button size="lg" className="w-full sm:w-auto">
                  Démarrer gratuitement
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                Voir une démo
              </Button>
            </div>

            <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-8">
              <div>
                <p className="text-3xl font-bold text-primary">500+</p>
                <p className="text-sm text-muted-foreground">Organisations</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-primary">50k+</p>
                <p className="text-sm text-muted-foreground">Utilisateurs</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-primary">10M€</p>
                <p className="text-sm text-muted-foreground">Prêts gérés</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-primary">99.9%</p>
                <p className="text-sm text-muted-foreground">Uptime</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Tout ce dont vous avez besoin
            </h2>
            <p className="text-xl text-muted-foreground">
              Une plateforme complète conçue pour les besoins spécifiques des GMAH
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="border-2 hover:border-primary transition-colors">
                <CardHeader>
                  <feature.icon className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Une solution gratuite et complète
            </h2>
            <p className="text-xl text-muted-foreground">
              Toutes les fonctionnalités pour gérer votre GMAH efficacement
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            <Card className="border-primary shadow-lg relative">
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Sparkles className="mr-1 h-3 w-3" />
                100% Gratuit
              </Badge>
              <CardHeader>
                <CardTitle className="text-2xl text-center">{gmahPlan.name}</CardTitle>
                <CardDescription className="text-center">{gmahPlan.description}</CardDescription>
                <div className="mt-6 text-center">
                  <span className="text-5xl font-bold text-primary">{gmahPlan.price}</span>
                  <p className="text-sm text-muted-foreground mt-2">Pour toujours, sans frais cachés</p>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
                  {gmahPlan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/signup-organization">
                  <Button className="w-full" size="lg">
                    {gmahPlan.cta}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
            
            <div className="mt-8 text-center">
              <p className="text-muted-foreground">
                Vous avez des questions ? <Link href="/contact" className="text-primary underline">Contactez-nous</Link>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Ils nous font confiance
            </h2>
            <p className="text-xl text-muted-foreground">
              Découvrez ce que nos clients disent de nous
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex mb-2">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <CardDescription>"{testimonial.content}"</CardDescription>
                </CardHeader>
                <CardContent>
                  <div>
                    <p className="font-semibold">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Prêt à transformer votre gestion ?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Rejoignez les centaines d'organisations qui ont déjà digitalisé leurs opérations
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup-organization">
              <Button size="lg" variant="secondary">
                Commencer maintenant
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white/10">
              Planifier une démo
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="h-6 w-6 text-primary" />
                <span className="font-bold">GMAH Platform</span>
              </div>
              <p className="text-sm text-muted-foreground">
                La solution de référence pour la gestion des prêts communautaires sans intérêt.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">Produit</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#features" className="hover:text-primary">Fonctionnalités</Link></li>
                <li><Link href="#pricing" className="hover:text-primary">Tarifs</Link></li>
                <li><Link href="/docs" className="hover:text-primary">Documentation</Link></li>
                <li><Link href="/api" className="hover:text-primary">API</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">Entreprise</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/about" className="hover:text-primary">À propos</Link></li>
                <li><Link href="/contact" className="hover:text-primary">Contact</Link></li>
                <li><Link href="/blog" className="hover:text-primary">Blog</Link></li>
                <li><Link href="/careers" className="hover:text-primary">Carrières</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">Légal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/privacy" className="hover:text-primary">Confidentialité</Link></li>
                <li><Link href="/terms" className="hover:text-primary">CGU</Link></li>
                <li><Link href="/rgpd" className="hover:text-primary">RGPD</Link></li>
                <li><Link href="/security" className="hover:text-primary">Sécurité</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2024 GMAH Platform. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}