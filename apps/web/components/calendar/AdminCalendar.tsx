'use client';

import React, { useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import rrulePlugin from '@fullcalendar/rrule';
import { useTranslations } from 'next-intl';
import { CalendarEvent, FullCalendarEvent, EVENT_TYPE_COLORS, PRIORITY_COLORS } from '@/types/calendar';
import { Loader2 } from 'lucide-react';
import styles from './AdminCalendar.module.css';

interface AdminCalendarProps {
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  isLoading?: boolean;
  locale?: string;
}

export function AdminCalendar({ 
  events, 
  onEventClick, 
  isLoading = false, 
  locale = 'fr' 
}: AdminCalendarProps) {
  const t = useTranslations('Calendar');

  // Convert CalendarEvent[] to FullCalendar events
  const fullCalendarEvents = useMemo<FullCalendarEvent[]>(() => {
    return events.map(event => {
      const baseColor = EVENT_TYPE_COLORS[event.type] || '#3b82f6';
      const priorityColor = PRIORITY_COLORS[event.priority];
      
      // Use priority color for urgent/high priority events
      const eventColor = event.priority === 'URGENT' || event.priority === 'HIGH' 
        ? priorityColor 
        : (event.color || baseColor);

      return {
        id: event.id,
        title: event.title,
        start: event.startDate,
        end: event.endDate || undefined,
        allDay: event.allDay,
        backgroundColor: event.backgroundColor || eventColor,
        borderColor: eventColor,
        textColor: event.textColor || '#ffffff',
        extendedProps: {
          description: event.description,
          type: event.type,
          status: event.status,
          priority: event.priority,
          location: event.location,
          isSystemGenerated: event.isSystemGenerated,
          metadata: event.metadata,
        },
      };
    });
  }, [events]);

  const handleEventClick = (clickInfo: any) => {
    const eventId = clickInfo.event.id;
    const event = events.find(e => e.id === eventId);
    if (event) {
      onEventClick(event);
    }
  };

  const handleDateSelect = (selectInfo: any) => {
    // TODO: Open create event modal with pre-filled dates
    console.log('Date selected:', selectInfo);
  };

  // Calendar configuration based on locale
  const calendarConfig = {
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin, rrulePlugin],
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
    },
    initialView: 'dayGridMonth',
    locale: locale,
    direction: locale === 'he' ? 'rtl' : 'ltr',
    firstDay: locale === 'he' ? 0 : 1, // Sunday for Hebrew, Monday for others
    height: 'auto',
    selectable: true,
    selectMirror: true,
    dayMaxEvents: true,
    weekends: true,
    events: fullCalendarEvents,
    eventClick: handleEventClick,
    select: handleDateSelect,
    eventDisplay: 'block',
    displayEventTime: true,
    eventTimeFormat: {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    },
    slotLabelFormat: {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    },
    // Internationalization
    buttonText: {
      today: t('views.today'),
      month: t('views.month'),
      week: t('views.week'),
      day: t('views.day'),
      list: t('views.list'),
    },
    allDayText: t('allDay'),
    moreLinkText: (num: number) => t('moreEvents', { count: num }),
    noEventsText: t('noEvents'),
    // Custom event content
    eventContent: (eventInfo: any) => {
      const { event } = eventInfo;
      const { extendedProps } = event;
      
      return (
        <div className="p-1 text-xs">
          <div className="font-medium truncate">
            {event.title}
          </div>
          {extendedProps.location && (
            <div className="opacity-75 truncate">
              📍 {extendedProps.location}
            </div>
          )}
          {extendedProps.priority === 'URGENT' && (
            <div className="opacity-90">
              🚨 {t('priority.urgent')}
            </div>
          )}
          {extendedProps.isSystemGenerated && (
            <div className="opacity-75">
              🤖 {t('systemGenerated')}
            </div>
          )}
        </div>
      );
    },
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground mb-4" />
          <p className="text-muted-foreground">{t('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.calendarContainer}>
      <FullCalendar {...calendarConfig} />
    </div>
  );
}