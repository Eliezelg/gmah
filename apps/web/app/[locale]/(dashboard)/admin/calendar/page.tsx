'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Loader2, 
  Calendar, 
  Plus, 
  Download, 
  Settings,
  RefreshCw,
  AlertTriangle,
  Info
} from 'lucide-react';
import { AdminCalendar } from '@/components/calendar/AdminCalendar';
import { CalendarFilters } from '@/components/calendar/CalendarFilters';
import { CalendarStats } from '@/components/calendar/CalendarStats';
import { EventDetailsModal } from '@/components/calendar/EventDetailsModal';
import { CreateEventModal } from '@/components/calendar/CreateEventModal';
import { CalendarSyncSettings } from '@/components/calendar/CalendarSyncSettings';
import { useCalendar } from '@/hooks/useCalendar';
import { CalendarEvent, CalendarEventType, CalendarEventStatus } from '@/types/calendar';

export default function AdminCalendarPage() {
  const t = useTranslations('Calendar');
  const [activeTab, setActiveTab] = useState('calendar');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSyncSettings, setShowSyncSettings] = useState(false);
  
  const {
    events,
    statistics,
    isLoading,
    error,
    filters,
    setFilters,
    fetchEvents,
    generateSystemEvents,
    exportToiCal,
    getHebrewHolidays,
  } = useCalendar();

  useEffect(() => {
    // Load initial data
    fetchEvents();
  }, [fetchEvents]);

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  const handleCreateEvent = () => {
    setShowCreateModal(true);
  };

  const handleGenerateEvents = async (type: 'loans' | 'withdrawals' | 'holidays') => {
    try {
      await generateSystemEvents(type);
      fetchEvents(); // Refresh calendar
    } catch (error) {
      console.error('Failed to generate events:', error);
    }
  };

  const handleExportICal = async () => {
    try {
      const icalData = await exportToiCal(filters);
      const blob = new Blob([icalData], { type: 'text/calendar' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = 'gmah-calendar.ics';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export calendar:', error);
    }
  };

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {t('errors.loadingError')}: {error.message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t('admin.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('admin.description')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSyncSettings(true)}
          >
            <Settings className="mr-2 h-4 w-4" />
            {t('actions.syncSettings')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportICal}
            disabled={isLoading}
          >
            <Download className="mr-2 h-4 w-4" />
            {t('actions.exportICal')}
          </Button>
          <Button
            size="sm"
            onClick={handleCreateEvent}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('actions.createEvent')}
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && <CalendarStats statistics={statistics} />}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="calendar">
            <Calendar className="mr-2 h-4 w-4" />
            {t('tabs.calendar')}
          </TabsTrigger>
          <TabsTrigger value="events">
            {t('tabs.events')}
          </TabsTrigger>
          <TabsTrigger value="generate">
            {t('tabs.generate')}
          </TabsTrigger>
          <TabsTrigger value="hebrew">
            {t('tabs.hebrew')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Filters Sidebar */}
            <div className="lg:col-span-1">
              <CalendarFilters
                filters={filters}
                onFiltersChange={setFilters}
                onRefresh={fetchEvents}
                isLoading={isLoading}
              />
            </div>

            {/* Calendar Main View */}
            <div className="lg:col-span-3">
              <Card>
                <CardContent className="p-0">
                  <AdminCalendar
                    events={events}
                    onEventClick={handleEventClick}
                    isLoading={isLoading}
                    locale={t('locale')}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('events.list')}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-48">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : events.length > 0 ? (
                <div className="space-y-4">
                  {events.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleEventClick(event)}
                    >
                      <div className="flex items-center space-x-4">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: event.color || '#3b82f6' }}
                        />
                        <div>
                          <h4 className="font-medium">{event.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {new Date(event.startDate).toLocaleDateString()}
                            {event.location && ` • ${event.location}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge
                          variant={event.status === 'COMPLETED' ? 'default' : 'secondary'}
                        >
                          {t(`status.${event.status.toLowerCase()}`)}
                        </Badge>
                        <Badge variant="outline">
                          {t(`types.${event.type.toLowerCase()}`)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-48">
                  <div className="text-center">
                    <Info className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      {t('events.noEvents')}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="generate" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Generate Loan Repayment Events */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {t('generate.loanRepayments.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {t('generate.loanRepayments.description')}
                </p>
                <Button
                  onClick={() => handleGenerateEvents('loans')}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {t('generate.loanRepayments.action')}
                </Button>
              </CardContent>
            </Card>

            {/* Generate Withdrawal Events */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {t('generate.withdrawals.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {t('generate.withdrawals.description')}
                </p>
                <Button
                  onClick={() => handleGenerateEvents('withdrawals')}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {t('generate.withdrawals.action')}
                </Button>
              </CardContent>
            </Card>

            {/* Generate Jewish Holidays */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {t('generate.holidays.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {t('generate.holidays.description')}
                </p>
                <Button
                  onClick={() => handleGenerateEvents('holidays')}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {t('generate.holidays.action')}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="hebrew" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t('hebrew.today.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-2">
                  {t('hebrew.today.description')}
                </p>
                {/* Hebrew date will be loaded dynamically */}
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-lg font-semibold">
                    {new Date().toLocaleDateString('he-IL')}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('hebrew.shemitah.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-2">
                  {t('hebrew.shemitah.description')}
                </p>
                {/* Shemitah info will be loaded dynamically */}
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm">
                    {t('hebrew.shemitah.loading')}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {selectedEvent && (
        <EventDetailsModal
          event={selectedEvent}
          open={showEventModal}
          onClose={() => {
            setShowEventModal(false);
            setSelectedEvent(null);
          }}
          onUpdate={() => {
            fetchEvents();
            setShowEventModal(false);
            setSelectedEvent(null);
          }}
        />
      )}

      <CreateEventModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={() => {
          fetchEvents();
          setShowCreateModal(false);
        }}
      />

      <CalendarSyncSettings
        open={showSyncSettings}
        onClose={() => setShowSyncSettings(false)}
      />
    </div>
  );
}