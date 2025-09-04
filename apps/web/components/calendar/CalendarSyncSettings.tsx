'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';

interface CalendarSyncSettingsProps {
  open: boolean;
  onClose: () => void;
}

export function CalendarSyncSettings({ open, onClose }: CalendarSyncSettingsProps) {
  const t = useTranslations('Calendar');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [isOutlookConnected, setIsOutlookConnected] = useState(false);

  const handleGoogleConnect = async () => {
    setIsConnecting(true);
    try {
      // TODO: Implement Google Calendar OAuth
      setTimeout(() => {
        setIsGoogleConnected(true);
        setIsConnecting(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to connect Google Calendar:', error);
      setIsConnecting(false);
    }
  };

  const handleOutlookConnect = async () => {
    setIsConnecting(true);
    try {
      // TODO: Implement Outlook Calendar OAuth
      setTimeout(() => {
        setIsOutlookConnected(true);
        setIsConnecting(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to connect Outlook Calendar:', error);
      setIsConnecting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('sync.title')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('sync.description')}
            </AlertDescription>
          </Alert>

          {/* Google Calendar */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="mr-2">📅</span>
                  Google Calendar
                </div>
                {isGoogleConnected ? (
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    {t('sync.connected')}
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    {t('sync.notConnected')}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t('sync.googleDescription')}
              </p>
              
              {isGoogleConnected ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="google-sync">{t('sync.enableSync')}</Label>
                    <Switch id="google-sync" />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="google-import">{t('sync.importEvents')}</Label>
                    <Switch id="google-import" />
                  </div>
                </div>
              ) : (
                <Button 
                  onClick={handleGoogleConnect} 
                  disabled={isConnecting}
                  className="w-full"
                >
                  {isConnecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <ExternalLink className="mr-2 h-4 w-4" />
                  {t('sync.connectGoogle')}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Outlook Calendar */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="mr-2">📧</span>
                  Outlook Calendar
                </div>
                {isOutlookConnected ? (
                  <Badge variant="default" className="bg-blue-500">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    {t('sync.connected')}
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    {t('sync.notConnected')}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t('sync.outlookDescription')}
              </p>
              
              {isOutlookConnected ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="outlook-sync">{t('sync.enableSync')}</Label>
                    <Switch id="outlook-sync" />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="outlook-import">{t('sync.importEvents')}</Label>
                    <Switch id="outlook-import" />
                  </div>
                </div>
              ) : (
                <Button 
                  onClick={handleOutlookConnect} 
                  disabled={isConnecting}
                  className="w-full"
                  variant="outline"
                >
                  {isConnecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <ExternalLink className="mr-2 h-4 w-4" />
                  {t('sync.connectOutlook')}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* CalDAV */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <span className="mr-2">🔗</span>
                CalDAV
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {t('sync.caldavDescription')}
              </p>
              <Button variant="outline" className="w-full" disabled>
                {t('sync.comingSoon')}
              </Button>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={onClose}>
              {t('actions.close')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}