export enum CalendarEventType {
  LOAN_REPAYMENT = 'LOAN_REPAYMENT',
  DEPOSIT_WITHDRAWAL = 'DEPOSIT_WITHDRAWAL',
  COMMITTEE_MEETING = 'COMMITTEE_MEETING',
  JEWISH_HOLIDAY = 'JEWISH_HOLIDAY',
  CUSTOM_EVENT = 'CUSTOM_EVENT',
  SYSTEM_REMINDER = 'SYSTEM_REMINDER',
  APPROVAL_DEADLINE = 'APPROVAL_DEADLINE',
  PAYMENT_DUE = 'PAYMENT_DUE',
  DOCUMENT_EXPIRY = 'DOCUMENT_EXPIRY',
  CAMPAIGN_EVENT = 'CAMPAIGN_EVENT',
}

export enum CalendarEventStatus {
  SCHEDULED = 'SCHEDULED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  POSTPONED = 'POSTPONED',
  IN_PROGRESS = 'IN_PROGRESS',
}

export enum CalendarEventPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  type: CalendarEventType;
  status: CalendarEventStatus;
  priority: CalendarEventPriority;
  
  // Timing
  startDate: string;
  endDate?: string;
  allDay: boolean;
  timezone?: string;
  
  // Recurrence
  isRecurring: boolean;
  recurrenceRule?: string;
  recurrenceId?: string;
  recurrenceDate?: string;
  isRecurrenceException: boolean;
  
  // Hebrew calendar
  isHebrewDate: boolean;
  hebrewDate?: string;
  hebrewYear?: number;
  hebrewMonth?: string;
  hebrewDay?: number;
  
  // Related entities
  loanId?: string;
  userId?: string;
  withdrawalId?: string;
  campaignId?: string;
  
  // Notifications and reminders
  hasReminders: boolean;
  reminderMinutes: number[];
  lastReminderSent?: string;
  
  // Location and attendees
  location?: string;
  locationUrl?: string;
  attendees: string[];
  
  // External calendar sync
  externalId?: string;
  syncProvider?: string;
  lastSyncedAt?: string;
  syncHash?: string;
  
  // Visual customization
  color?: string;
  backgroundColor?: string;
  textColor?: string;
  
  // Metadata
  isPublic: boolean;
  isSystemGenerated: boolean;
  sourceType?: string;
  metadata?: any;
  
  // Audit fields
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
  
  // Relations (populated when needed)
  loan?: any;
  user?: any;
  withdrawal?: any;
  campaign?: any;
  creator?: any;
  updater?: any;
}

export interface CalendarEventFilters {
  startDate?: string;
  endDate?: string;
  types?: CalendarEventType[];
  statuses?: CalendarEventStatus[];
  priorities?: CalendarEventPriority[];
  userId?: string;
  loanId?: string;
  withdrawalId?: string;
  campaignId?: string;
  isPublic?: boolean;
  isSystemGenerated?: boolean;
  isRecurring?: boolean;
  isHebrewDate?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CalendarEventResponse {
  events: CalendarEvent[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface CalendarStatistics {
  totalEvents: number;
  eventsByType: Record<CalendarEventType, number>;
  eventsByStatus: Record<CalendarEventStatus, number>;
  eventsByPriority: Record<CalendarEventPriority, number>;
  upcomingEvents: number;
  overdueEvents: number;
}

export interface HebrewDateInfo {
  hebrewDate: string;
  hebrewYear: number;
  hebrewMonth: string;
  hebrewDay: number;
  gregorianDate: Date;
}

export interface JewishHoliday {
  title: string;
  hebrewTitle?: string;
  date: Date;
  hebrewDate: string;
  type: 'major' | 'minor' | 'fast' | 'modern';
  description?: string;
}

export interface ShemitahInfo {
  isShemitahYear: boolean;
  nextShemitahYear: number;
  yearsUntilShemitah: number;
  currentYear: number;
}

export interface CreateCalendarEventRequest {
  title: string;
  description?: string;
  type: CalendarEventType;
  startDate: string;
  endDate?: string;
  allDay?: boolean;
  timezone?: string;
  priority?: CalendarEventPriority;
  isRecurring?: boolean;
  recurrenceRule?: string;
  isHebrewDate?: boolean;
  hebrewDate?: string;
  hebrewYear?: number;
  hebrewMonth?: string;
  hebrewDay?: number;
  loanId?: string;
  withdrawalId?: string;
  campaignId?: string;
  hasReminders?: boolean;
  reminderMinutes?: number[];
  location?: string;
  locationUrl?: string;
  attendees?: string[];
  color?: string;
  backgroundColor?: string;
  textColor?: string;
  isPublic?: boolean;
  sourceType?: string;
  metadata?: any;
}

export interface UpdateCalendarEventRequest extends Partial<CreateCalendarEventRequest> {
  status?: CalendarEventStatus;
}

// FullCalendar event format for display
export interface FullCalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay: boolean;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  extendedProps: {
    description?: string;
    type: CalendarEventType;
    status: CalendarEventStatus;
    priority: CalendarEventPriority;
    location?: string;
    isSystemGenerated: boolean;
    metadata?: any;
  };
}

export interface CalendarView {
  dayGridMonth: 'dayGridMonth';
  timeGridWeek: 'timeGridWeek';
  timeGridDay: 'timeGridDay';
  listWeek: 'listWeek';
}

export const CALENDAR_VIEWS: CalendarView = {
  dayGridMonth: 'dayGridMonth',
  timeGridWeek: 'timeGridWeek',
  timeGridDay: 'timeGridDay',
  listWeek: 'listWeek',
};

export const EVENT_TYPE_COLORS: Record<CalendarEventType, string> = {
  [CalendarEventType.LOAN_REPAYMENT]: '#10b981', // green
  [CalendarEventType.DEPOSIT_WITHDRAWAL]: '#f59e0b', // amber
  [CalendarEventType.COMMITTEE_MEETING]: '#3b82f6', // blue
  [CalendarEventType.JEWISH_HOLIDAY]: '#8b5cf6', // purple
  [CalendarEventType.CUSTOM_EVENT]: '#6b7280', // gray
  [CalendarEventType.SYSTEM_REMINDER]: '#06b6d4', // cyan
  [CalendarEventType.APPROVAL_DEADLINE]: '#ef4444', // red
  [CalendarEventType.PAYMENT_DUE]: '#dc2626', // red-600
  [CalendarEventType.DOCUMENT_EXPIRY]: '#f97316', // orange
  [CalendarEventType.CAMPAIGN_EVENT]: '#ec4899', // pink
};

export const PRIORITY_COLORS: Record<CalendarEventPriority, string> = {
  [CalendarEventPriority.LOW]: '#6b7280', // gray
  [CalendarEventPriority.NORMAL]: '#3b82f6', // blue
  [CalendarEventPriority.HIGH]: '#f59e0b', // amber
  [CalendarEventPriority.URGENT]: '#ef4444', // red
};