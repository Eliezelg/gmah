import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { HebrewCalendarService } from './hebrew-calendar.service';
import { CalendarEventType, CalendarEventStatus, CalendarEventPriority, Prisma } from '@prisma/client';
import { CreateCalendarEventDto, UpdateCalendarEventDto, CalendarEventQueryDto } from '../dto';
import { RRule } from 'rrule';
import * as ical from 'node-ical';

@Injectable()
export class CalendarService {
  constructor(
    private prisma: PrismaService,
    private hebrewCalendarService: HebrewCalendarService,
  ) {}

  /**
   * Create a new calendar event
   */
  async create(createDto: CreateCalendarEventDto, createdBy?: string) {
    // Validate recurrence rule if provided
    if (createDto.isRecurring && createDto.recurrenceRule) {
      try {
        RRule.fromString(createDto.recurrenceRule);
      } catch (error) {
        throw new BadRequestException('Invalid recurrence rule format');
      }
    }

    // Handle Hebrew date conversion
    let hebrewDateInfo = null;
    if (createDto.isHebrewDate && createDto.hebrewYear && createDto.hebrewMonth && createDto.hebrewDay) {
      try {
        const gregorianDate = this.hebrewCalendarService.hebrewToGregorian(
          createDto.hebrewYear,
          createDto.hebrewMonth,
          createDto.hebrewDay
        );
        createDto.startDate = gregorianDate.toISOString();
        hebrewDateInfo = this.hebrewCalendarService.gregorianToHebrew(gregorianDate);
      } catch (error) {
        throw new BadRequestException('Invalid Hebrew date');
      }
    } else if (createDto.isHebrewDate) {
      // Convert Gregorian to Hebrew for Hebrew date events
      const startDate = new Date(createDto.startDate);
      hebrewDateInfo = this.hebrewCalendarService.gregorianToHebrew(startDate);
    }

    const data: Prisma.CalendarEventCreateInput = {
      title: createDto.title,
      description: createDto.description,
      type: createDto.type,
      priority: createDto.priority || CalendarEventPriority.NORMAL,
      startDate: new Date(createDto.startDate),
      endDate: createDto.endDate ? new Date(createDto.endDate) : null,
      allDay: createDto.allDay || false,
      timezone: createDto.timezone || 'Asia/Jerusalem',
      isRecurring: createDto.isRecurring || false,
      recurrenceRule: createDto.recurrenceRule,
      isHebrewDate: createDto.isHebrewDate || false,
      hebrewDate: hebrewDateInfo?.hebrewDate,
      hebrewYear: hebrewDateInfo?.hebrewYear,
      hebrewMonth: hebrewDateInfo?.hebrewMonth,
      hebrewDay: hebrewDateInfo?.hebrewDay,
      hasReminders: createDto.hasReminders || false,
      reminderMinutes: createDto.reminderMinutes || [],
      location: createDto.location,
      locationUrl: createDto.locationUrl,
      attendees: createDto.attendees || [],
      color: createDto.color || '#3b82f6',
      backgroundColor: createDto.backgroundColor,
      textColor: createDto.textColor,
      isPublic: createDto.isPublic || false,
      isSystemGenerated: false,
      sourceType: createDto.sourceType,
      metadata: createDto.metadata,
    };

    // Add relations if provided
    if (createDto.loanId) {
      data.loan = { connect: { id: createDto.loanId } };
    }
    if (createDto.withdrawalId) {
      data.withdrawal = { connect: { id: createDto.withdrawalId } };
    }
    if (createDto.campaignId) {
      data.campaign = { connect: { id: createDto.campaignId } };
    }
    if (createdBy) {
      data.creator = { connect: { id: createdBy } };
    }

    return this.prisma.calendarEvent.create({
      data,
      include: {
        loan: true,
        withdrawal: true,
        campaign: true,
        creator: true,
      },
    });
  }

  /**
   * Find all calendar events with filtering and pagination
   */
  async findMany(query: CalendarEventQueryDto) {
    const {
      startDate,
      endDate,
      types,
      statuses,
      priorities,
      userId,
      loanId,
      withdrawalId,
      campaignId,
      isPublic,
      isSystemGenerated,
      isRecurring,
      isHebrewDate,
      search,
      page = 1,
      limit = 50,
    } = query;

    const skip = (page - 1) * limit;
    const where: Prisma.CalendarEventWhereInput = {};

    // Date range filters
    if (startDate || endDate) {
      where.startDate = {};
      if (startDate) where.startDate.gte = new Date(startDate);
      if (endDate) where.startDate.lte = new Date(endDate);
    }

    // Array filters
    if (types?.length) where.type = { in: types };
    if (statuses?.length) where.status = { in: statuses };
    if (priorities?.length) where.priority = { in: priorities };

    // ID filters
    if (userId) where.userId = userId;
    if (loanId) where.loanId = loanId;
    if (withdrawalId) where.withdrawalId = withdrawalId;
    if (campaignId) where.campaignId = campaignId;

    // Boolean filters
    if (typeof isPublic === 'boolean') where.isPublic = isPublic;
    if (typeof isSystemGenerated === 'boolean') where.isSystemGenerated = isSystemGenerated;
    if (typeof isRecurring === 'boolean') where.isRecurring = isRecurring;
    if (typeof isHebrewDate === 'boolean') where.isHebrewDate = isHebrewDate;

    // Search filter
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [events, total] = await Promise.all([
      this.prisma.calendarEvent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startDate: 'asc' },
        include: {
          loan: true,
          withdrawal: true,
          campaign: true,
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.calendarEvent.count({ where }),
    ]);

    return {
      events,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find a calendar event by ID
   */
  async findOne(id: string) {
    const event = await this.prisma.calendarEvent.findUnique({
      where: { id },
      include: {
        loan: true,
        withdrawal: true,
        campaign: true,
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        updater: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException(`Calendar event with ID ${id} not found`);
    }

    return event;
  }

  /**
   * Update a calendar event
   */
  async update(id: string, updateDto: UpdateCalendarEventDto, updatedBy?: string) {
    const existingEvent = await this.findOne(id);

    // Validate recurrence rule if provided
    if (updateDto.isRecurring && updateDto.recurrenceRule) {
      try {
        RRule.fromString(updateDto.recurrenceRule);
      } catch (error) {
        throw new BadRequestException('Invalid recurrence rule format');
      }
    }

    // Handle Hebrew date conversion
    let hebrewDateInfo = null;
    if (updateDto.isHebrewDate && updateDto.hebrewYear && updateDto.hebrewMonth && updateDto.hebrewDay) {
      try {
        const gregorianDate = this.hebrewCalendarService.hebrewToGregorian(
          updateDto.hebrewYear,
          updateDto.hebrewMonth,
          updateDto.hebrewDay
        );
        updateDto.startDate = gregorianDate.toISOString();
        hebrewDateInfo = this.hebrewCalendarService.gregorianToHebrew(gregorianDate);
      } catch (error) {
        throw new BadRequestException('Invalid Hebrew date');
      }
    } else if (updateDto.isHebrewDate && updateDto.startDate) {
      const startDate = new Date(updateDto.startDate);
      hebrewDateInfo = this.hebrewCalendarService.gregorianToHebrew(startDate);
    }

    const data: Prisma.CalendarEventUpdateInput = {
      ...updateDto,
      startDate: updateDto.startDate ? new Date(updateDto.startDate) : undefined,
      endDate: updateDto.endDate ? new Date(updateDto.endDate) : undefined,
      hebrewDate: hebrewDateInfo?.hebrewDate,
      hebrewYear: hebrewDateInfo?.hebrewYear,
      hebrewMonth: hebrewDateInfo?.hebrewMonth,
      hebrewDay: hebrewDateInfo?.hebrewDay,
    };

    if (updatedBy) {
      data.updater = { connect: { id: updatedBy } };
    }

    return this.prisma.calendarEvent.update({
      where: { id },
      data,
      include: {
        loan: true,
        withdrawal: true,
        campaign: true,
        creator: true,
        updater: true,
      },
    });
  }

  /**
   * Delete a calendar event
   */
  async remove(id: string) {
    const existingEvent = await this.findOne(id);
    
    if (existingEvent.isSystemGenerated) {
      throw new ConflictException('Cannot delete system generated events');
    }

    return this.prisma.calendarEvent.delete({
      where: { id },
    });
  }

  /**
   * Generate calendar events from loan repayment schedules
   */
  async generateLoanRepaymentEvents() {
    const activeLoans = await this.prisma.loan.findMany({
      where: {
        status: 'ACTIVE',
      },
      include: {
        repaymentSchedule: {
          where: {
            isPaid: false,
          },
        },
        borrower: true,
      },
    });

    const eventsToCreate = [];

    for (const loan of activeLoans) {
      for (const schedule of loan.repaymentSchedule) {
        // Check if event already exists
        const existingEvent = await this.prisma.calendarEvent.findFirst({
          where: {
            type: CalendarEventType.LOAN_REPAYMENT,
            loanId: loan.id,
            sourceType: `REPAYMENT_${schedule.id}`,
          },
        });

        if (!existingEvent) {
          eventsToCreate.push({
            title: `Remboursement - ${loan.borrower.firstName} ${loan.borrower.lastName}`,
            description: `Échéance #${schedule.installmentNumber} pour le prêt ${loan.loanNumber}`,
            type: CalendarEventType.LOAN_REPAYMENT,
            startDate: schedule.dueDate,
            allDay: true,
            priority: schedule.daysLate > 0 ? CalendarEventPriority.HIGH : CalendarEventPriority.NORMAL,
            loanId: loan.id,
            isSystemGenerated: true,
            sourceType: `REPAYMENT_${schedule.id}`,
            color: schedule.daysLate > 0 ? '#ef4444' : '#10b981',
            metadata: {
              scheduleId: schedule.id,
              amount: schedule.amount,
              installmentNumber: schedule.installmentNumber,
              isLate: schedule.isLate,
              daysLate: schedule.daysLate,
            },
          });
        }
      }
    }

    if (eventsToCreate.length > 0) {
      await this.prisma.calendarEvent.createMany({
        data: eventsToCreate,
      });
    }

    return { created: eventsToCreate.length };
  }

  /**
   * Generate calendar events from withdrawal requests
   */
  async generateWithdrawalEvents() {
    const pendingWithdrawals = await this.prisma.withdrawalRequest.findMany({
      where: {
        status: { in: ['PENDING', 'UNDER_REVIEW', 'APPROVED'] },
      },
      include: {
        depositor: true,
        deposit: true,
      },
    });

    const eventsToCreate = [];

    for (const withdrawal of pendingWithdrawals) {
      const existingEvent = await this.prisma.calendarEvent.findFirst({
        where: {
          type: CalendarEventType.DEPOSIT_WITHDRAWAL,
          withdrawalId: withdrawal.id,
        },
      });

      if (!existingEvent) {
        const eventDate = withdrawal.plannedDate || withdrawal.requestDate;
        const priority = withdrawal.urgency === 'URGENT' ? CalendarEventPriority.URGENT :
                        withdrawal.urgency === 'HIGH' ? CalendarEventPriority.HIGH :
                        CalendarEventPriority.NORMAL;

        eventsToCreate.push({
          title: `Retrait - ${withdrawal.depositor.firstName} ${withdrawal.depositor.lastName}`,
          description: `Demande de retrait ${withdrawal.requestNumber}`,
          type: CalendarEventType.DEPOSIT_WITHDRAWAL,
          startDate: eventDate,
          allDay: true,
          priority,
          withdrawalId: withdrawal.id,
          isSystemGenerated: true,
          sourceType: 'WITHDRAWAL_REQUEST',
          color: priority === CalendarEventPriority.URGENT ? '#ef4444' : '#f59e0b',
          metadata: {
            amount: withdrawal.amount,
            status: withdrawal.status,
            urgency: withdrawal.urgency,
            reason: withdrawal.reason,
          },
        });
      }
    }

    if (eventsToCreate.length > 0) {
      await this.prisma.calendarEvent.createMany({
        data: eventsToCreate,
      });
    }

    return { created: eventsToCreate.length };
  }

  /**
   * Generate Jewish holiday events
   */
  async generateJewishHolidayEvents(year: number) {
    const holidays = this.hebrewCalendarService.getJewishHolidays(year);
    const eventsToCreate = [];

    for (const holiday of holidays) {
      const existingEvent = await this.prisma.calendarEvent.findFirst({
        where: {
          type: CalendarEventType.JEWISH_HOLIDAY,
          startDate: holiday.date,
          title: holiday.title,
        },
      });

      if (!existingEvent) {
        const hebrewDateInfo = this.hebrewCalendarService.gregorianToHebrew(holiday.date);
        
        eventsToCreate.push({
          title: holiday.title,
          description: holiday.description || `Fête juive: ${holiday.title}`,
          type: CalendarEventType.JEWISH_HOLIDAY,
          startDate: holiday.date,
          allDay: true,
          priority: holiday.type === 'major' ? CalendarEventPriority.HIGH : CalendarEventPriority.NORMAL,
          isHebrewDate: true,
          hebrewDate: holiday.hebrewDate,
          hebrewYear: hebrewDateInfo.hebrewYear,
          hebrewMonth: hebrewDateInfo.hebrewMonth,
          hebrewDay: hebrewDateInfo.hebrewDay,
          isSystemGenerated: true,
          isPublic: true,
          sourceType: 'JEWISH_HOLIDAY',
          color: holiday.type === 'major' ? '#8b5cf6' : '#a855f7',
          metadata: {
            holidayType: holiday.type,
            hebrewTitle: holiday.hebrewTitle,
          },
        });
      }
    }

    if (eventsToCreate.length > 0) {
      await this.prisma.calendarEvent.createMany({
        data: eventsToCreate,
      });
    }

    return { created: eventsToCreate.length };
  }

  /**
   * Export events to iCal format
   */
  async exportToiCal(query: CalendarEventQueryDto): Promise<string> {
    const { events } = await this.findMany({ ...query, limit: 1000 });
    
    const icalData = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//GMAH Platform//Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
    ];

    for (const event of events) {
      const startDate = event.allDay 
        ? event.startDate.toISOString().split('T')[0].replace(/-/g, '')
        : event.startDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
      
      const endDate = event.endDate
        ? (event.allDay 
          ? event.endDate.toISOString().split('T')[0].replace(/-/g, '')
          : event.endDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''))
        : startDate;

      icalData.push(
        'BEGIN:VEVENT',
        `UID:${event.id}@gmah-platform.com`,
        `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}Z`,
        `DTSTART${event.allDay ? ';VALUE=DATE' : ''}:${startDate}${event.allDay ? '' : 'Z'}`,
        `DTEND${event.allDay ? ';VALUE=DATE' : ''}:${endDate}${event.allDay ? '' : 'Z'}`,
        `SUMMARY:${event.title}`,
      );

      if (event.description) {
        icalData.push(`DESCRIPTION:${event.description}`);
      }

      if (event.location) {
        icalData.push(`LOCATION:${event.location}`);
      }

      if (event.recurrenceRule) {
        icalData.push(`RRULE:${event.recurrenceRule}`);
      }

      icalData.push(
        `STATUS:${event.status === CalendarEventStatus.COMPLETED ? 'CONFIRMED' : 'TENTATIVE'}`,
        'END:VEVENT'
      );
    }

    icalData.push('END:VCALENDAR');
    
    return icalData.join('\r\n');
  }

  /**
   * Get calendar statistics
   */
  async getStatistics(startDate?: Date, endDate?: Date) {
    const dateFilter = startDate && endDate ? {
      startDate: {
        gte: startDate,
        lte: endDate,
      },
    } : {};

    const [
      totalEvents,
      eventsByType,
      eventsByStatus,
      eventsByPriority,
      upcomingEvents,
      overdueEvents,
    ] = await Promise.all([
      this.prisma.calendarEvent.count({ where: dateFilter }),
      this.prisma.calendarEvent.groupBy({
        by: ['type'],
        where: dateFilter,
        _count: true,
      }),
      this.prisma.calendarEvent.groupBy({
        by: ['status'],
        where: dateFilter,
        _count: true,
      }),
      this.prisma.calendarEvent.groupBy({
        by: ['priority'],
        where: dateFilter,
        _count: true,
      }),
      this.prisma.calendarEvent.count({
        where: {
          ...dateFilter,
          startDate: { gte: new Date() },
          status: CalendarEventStatus.SCHEDULED,
        },
      }),
      this.prisma.calendarEvent.count({
        where: {
          ...dateFilter,
          startDate: { lt: new Date() },
          status: CalendarEventStatus.SCHEDULED,
        },
      }),
    ]);

    return {
      totalEvents,
      eventsByType: eventsByType.reduce((acc, item) => {
        acc[item.type] = item._count;
        return acc;
      }, {}),
      eventsByStatus: eventsByStatus.reduce((acc, item) => {
        acc[item.status] = item._count;
        return acc;
      }, {}),
      eventsByPriority: eventsByPriority.reduce((acc, item) => {
        acc[item.priority] = item._count;
        return acc;
      }, {}),
      upcomingEvents,
      overdueEvents,
    };
  }
}