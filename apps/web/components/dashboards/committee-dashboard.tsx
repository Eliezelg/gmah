'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function CommitteeDashboard() {
  const t = useTranslations('dashboard.committee');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {t('subtitle')}
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>{t('underConstruction')}</CardTitle>
          <CardDescription>
            {t('underConstructionDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            {t('interfaceDescription')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}