'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Shield, Users, TrendingUp, Heart } from 'lucide-react';

export default function HomePage() {
  const t = useTranslations('home');

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="py-20 px-4 text-center bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold mb-6 text-gray-900 dark:text-white">
            {t('hero.title')}
          </h1>
          <p className="text-xl mb-8 text-gray-600 dark:text-gray-300">
            {t('hero.subtitle')}
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/login">
              <Button size="lg" className="gap-2">
                {t('hero.login')} <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/register">
              <Button size="lg" variant="outline">
                {t('hero.register')}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900 dark:text-white">
            {t('features.title')}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card>
              <CardHeader>
                <Shield className="h-10 w-10 mb-4 text-blue-600" />
                <CardTitle>{t('features.secure.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{t('features.secure.description')}</CardDescription>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Users className="h-10 w-10 mb-4 text-blue-600" />
                <CardTitle>{t('features.community.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{t('features.community.description')}</CardDescription>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <TrendingUp className="h-10 w-10 mb-4 text-blue-600" />
                <CardTitle>{t('features.efficient.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{t('features.efficient.description')}</CardDescription>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Heart className="h-10 w-10 mb-4 text-blue-600" />
                <CardTitle>{t('features.solidarity.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{t('features.solidarity.description')}</CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-blue-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">{t('cta.title')}</h2>
          <p className="text-xl mb-8 opacity-90">{t('cta.subtitle')}</p>
          <Link href="/register">
            <Button size="lg" variant="secondary" className="gap-2">
              {t('cta.button')} <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}