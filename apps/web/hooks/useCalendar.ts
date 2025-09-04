'use client';

import { useState, useCallback } from 'react';
import {
  CalendarEvent,
  CalendarEventFilters,
  CalendarEventResponse,
  CalendarStatistics,
  CreateCalendarEventRequest,
  UpdateCalendarEventRequest,
} from '@/types/calendar';

// Mock API functions - replace with actual API calls
const mockApiCall = <T>(data: T, delay = 1000): Promise<T> => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(data), delay);
  });
};

export function useCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [statistics, setStatistics] = useState<CalendarStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFilters] = useState<CalendarEventFilters>({});

  const fetchEvents = useCallback(async (customFilters?: CalendarEventFilters) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const activeFilters = customFilters || filters;
      
      // TODO: Replace with actual API call
      const mockResponse: CalendarEventResponse = {
        events: [
          {
            id: '1',
            title: 'Remboursement - Jean Dupont',
            description: 'Échéance mensuelle du prêt #L001',
            type: 'LOAN_REPAYMENT',
            status: 'SCHEDULED',
            priority: 'NORMAL',
            startDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
            endDate: undefined,
            allDay: true,
            timezone: 'Asia/Jerusalem',
            isRecurring: false,
            recurrenceRule: undefined,
            recurrenceId: undefined,
            recurrenceDate: undefined,
            isRecurrenceException: false,
            isHebrewDate: false,
            hebrewDate: undefined,
            hebrewYear: undefined,
            hebrewMonth: undefined,
            hebrewDay: undefined,
            loanId: 'L001',
            userId: undefined,
            withdrawalId: undefined,
            campaignId: undefined,
            hasReminders: true,
            reminderMinutes: [1440, 60], // 1 day and 1 hour before
            lastReminderSent: undefined,
            location: undefined,
            locationUrl: undefined,
            attendees: [],
            externalId: undefined,
            syncProvider: undefined,
            lastSyncedAt: undefined,
            syncHash: undefined,
            color: '#10b981',
            backgroundColor: undefined,
            textColor: undefined,
            isPublic: false,
            isSystemGenerated: true,
            sourceType: 'REPAYMENT_1',
            metadata: {
              amount: '1000',
              installmentNumber: 5,
              loanNumber: 'L001'
            },
            createdBy: undefined,
            updatedBy: undefined,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: '2',
            title: 'Rosh Hashanah',
            description: 'Nouvel An juif',
            type: 'JEWISH_HOLIDAY',
            status: 'SCHEDULED',
            priority: 'HIGH',
            startDate: '2024-09-16T00:00:00.000Z',
            endDate: '2024-09-17T23:59:59.999Z',
            allDay: true,
            timezone: 'Asia/Jerusalem',
            isRecurring: true,
            recurrenceRule: 'FREQ=YEARLY;INTERVAL=1',
            recurrenceId: undefined,
            recurrenceDate: undefined,
            isRecurrenceException: false,
            isHebrewDate: true,
            hebrewDate: '1 Tishrei 5785',
            hebrewYear: 5785,
            hebrewMonth: 'Tishrei',
            hebrewDay: 1,
            loanId: undefined,
            userId: undefined,
            withdrawalId: undefined,
            campaignId: undefined,
            hasReminders: false,
            reminderMinutes: [],
            lastReminderSent: undefined,
            location: undefined,
            locationUrl: undefined,
            attendees: [],
            externalId: undefined,
            syncProvider: undefined,
            lastSyncedAt: undefined,
            syncHash: undefined,
            color: '#8b5cf6',
            backgroundColor: undefined,
            textColor: undefined,
            isPublic: true,
            isSystemGenerated: true,
            sourceType: 'JEWISH_HOLIDAY',
            metadata: {
              holidayType: 'major',
              hebrewTitle: 'ראש השנה'
            },
            createdBy: undefined,
            updatedBy: undefined,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        ],
        pagination: {
          page: 1,
          limit: 50,
          total: 2,
          pages: 1,
        }
      };

      const response = await mockApiCall(mockResponse);
      setEvents(response.events);
      
      // Also fetch statistics
      await fetchStatistics();
      
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  const fetchStatistics = useCallback(async () => {
    try {
      // TODO: Replace with actual API call
      const mockStats: CalendarStatistics = {
        totalEvents: 15,
        eventsByType: {
          LOAN_REPAYMENT: 8,
          DEPOSIT_WITHDRAWAL: 3,
          COMMITTEE_MEETING: 2,
          JEWISH_HOLIDAY: 2,
          CUSTOM_EVENT: 0,
          SYSTEM_REMINDER: 0,
          APPROVAL_DEADLINE: 0,
          PAYMENT_DUE: 0,
          DOCUMENT_EXPIRY: 0,
          CAMPAIGN_EVENT: 0,
        },
        eventsByStatus: {
          SCHEDULED: 12,
          COMPLETED: 2,
          CANCELLED: 1,
          POSTPONED: 0,
          IN_PROGRESS: 0,
        },
        eventsByPriority: {
          LOW: 3,
          NORMAL: 8,
          HIGH: 3,
          URGENT: 1,
        },
        upcomingEvents: 10,
        overdueEvents: 2,
      };

      const response = await mockApiCall(mockStats, 500);
      setStatistics(response);
      
    } catch (err) {
      console.error('Failed to fetch statistics:', err);
    }
  }, []);

  const createEvent = useCallback(async (eventData: CreateCalendarEventRequest) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // TODO: Replace with actual API call
      const newEvent: CalendarEvent = {
        id: Math.random().toString(36).substr(2, 9),
        ...eventData,
        status: 'SCHEDULED',
        allDay: eventData.allDay || false,
        timezone: eventData.timezone || 'Asia/Jerusalem',
        isRecurring: eventData.isRecurring || false,
        isRecurrenceException: false,
        isHebrewDate: eventData.isHebrewDate || false,
        hasReminders: eventData.hasReminders || false,
        reminderMinutes: eventData.reminderMinutes || [],
        attendees: eventData.attendees || [],
        isPublic: eventData.isPublic || false,
        isSystemGenerated: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await mockApiCall(newEvent);
      await fetchEvents(); // Refresh events list
      
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [fetchEvents]);

  const updateEvent = useCallback(async (id: string, eventData: UpdateCalendarEventRequest) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // TODO: Replace with actual API call
      await mockApiCall({ id, ...eventData });
      await fetchEvents(); // Refresh events list
      
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [fetchEvents]);

  const deleteEvent = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // TODO: Replace with actual API call
      await mockApiCall({ success: true });
      await fetchEvents(); // Refresh events list
      
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [fetchEvents]);

  const generateSystemEvents = useCallback(async (type: 'loans' | 'withdrawals' | 'holidays') => {
    setIsLoading(true);
    setError(null);
    
    try {
      // TODO: Replace with actual API calls
      const endpoints = {
        loans: '/api/calendar/events/generate/loan-repayments',
        withdrawals: '/api/calendar/events/generate/withdrawals',
        holidays: '/api/calendar/events/generate/jewish-holidays',
      };
      
      const mockResponse = { created: Math.floor(Math.random() * 10) + 1 };
      await mockApiCall(mockResponse);
      
      // Refresh events after generation
      await fetchEvents();
      
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [fetchEvents]);

  const exportToiCal = useCallback(async (filters: CalendarEventFilters): Promise<string> => {
    try {
      // TODO: Replace with actual API call
      const mockiCalData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//GMAH Platform//Calendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:1@gmah-platform.com
DTSTAMP:20240904T120000Z
DTSTART;VALUE=DATE:20240905
SUMMARY:Remboursement - Jean Dupont
DESCRIPTION:Échéance mensuelle du prêt #L001
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;
      
      return await mockApiCall(mockiCalData);
      
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, []);

  const getHebrewHolidays = useCallback(async (year?: number) => {
    try {
      // TODO: Replace with actual API call
      const mockHolidays = [
        {
          title: 'Rosh Hashanah',
          hebrewTitle: 'ראש השנה',
          date: new Date('2024-09-16'),
          hebrewDate: '1 Tishrei 5785',
          type: 'major' as const,
          description: 'Jewish New Year',
        }
      ];
      
      return await mockApiCall(mockHolidays);
      
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, []);

  return {
    // State
    events,
    statistics,
    isLoading,
    error,
    filters,
    
    // Actions
    setFilters,
    fetchEvents,
    fetchStatistics,
    createEvent,
    updateEvent,
    deleteEvent,
    generateSystemEvents,
    exportToiCal,
    getHebrewHolidays,
  };
}