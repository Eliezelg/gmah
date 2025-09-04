import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  Query,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CalendarService, HebrewCalendarService } from './services';
import { CreateCalendarEventDto, UpdateCalendarEventDto, CalendarEventQueryDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Calendar')
@Controller('calendar')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CalendarController {
  constructor(
    private readonly calendarService: CalendarService,
    private readonly hebrewCalendarService: HebrewCalendarService,
  ) {}

  @Post('events')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.SECRETARY)
  @ApiOperation({ summary: 'Create a new calendar event' })
  @ApiResponse({ status: 201, description: 'Event created successfully.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  async createEvent(
    @Body() createEventDto: CreateCalendarEventDto,
    @Req() req: any,
  ) {
    return this.calendarService.create(createEventDto, req.user.id);
  }

  @Get('events')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.SECRETARY, Role.TREASURER, Role.COMMITTEE_MEMBER)
  @ApiOperation({ summary: 'Get calendar events with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Events retrieved successfully.' })
  async getEvents(@Query() query: CalendarEventQueryDto) {
    return this.calendarService.findMany(query);
  }

  @Get('events/:id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.SECRETARY, Role.TREASURER, Role.COMMITTEE_MEMBER)
  @ApiOperation({ summary: 'Get a calendar event by ID' })
  @ApiResponse({ status: 200, description: 'Event retrieved successfully.' })
  @ApiResponse({ status: 404, description: 'Event not found.' })
  async getEvent(@Param('id') id: string) {
    return this.calendarService.findOne(id);
  }

  @Patch('events/:id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.SECRETARY)
  @ApiOperation({ summary: 'Update a calendar event' })
  @ApiResponse({ status: 200, description: 'Event updated successfully.' })
  @ApiResponse({ status: 404, description: 'Event not found.' })
  async updateEvent(
    @Param('id') id: string,
    @Body() updateEventDto: UpdateCalendarEventDto,
    @Req() req: any,
  ) {
    return this.calendarService.update(id, updateEventDto, req.user.id);
  }

  @Delete('events/:id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete a calendar event' })
  @ApiResponse({ status: 200, description: 'Event deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Event not found.' })
  @ApiResponse({ status: 409, description: 'Cannot delete system generated event.' })
  async deleteEvent(@Param('id') id: string) {
    return this.calendarService.remove(id);
  }

  @Post('events/generate/loan-repayments')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Generate calendar events from loan repayment schedules' })
  @ApiResponse({ status: 201, description: 'Events generated successfully.' })
  async generateLoanRepaymentEvents() {
    return this.calendarService.generateLoanRepaymentEvents();
  }

  @Post('events/generate/withdrawals')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Generate calendar events from withdrawal requests' })
  @ApiResponse({ status: 201, description: 'Events generated successfully.' })
  async generateWithdrawalEvents() {
    return this.calendarService.generateWithdrawalEvents();
  }

  @Post('events/generate/jewish-holidays')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Generate Jewish holiday events for a year' })
  @ApiResponse({ status: 201, description: 'Holiday events generated successfully.' })
  async generateJewishHolidayEvents(@Query('year') year?: number) {
    const targetYear = year || new Date().getFullYear();
    return this.calendarService.generateJewishHolidayEvents(targetYear);
  }

  @Get('export/ical')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.SECRETARY, Role.TREASURER, Role.COMMITTEE_MEMBER)
  @ApiOperation({ summary: 'Export calendar events to iCal format' })
  @ApiResponse({ status: 200, description: 'iCal file generated successfully.' })
  async exportToiCal(
    @Query() query: CalendarEventQueryDto,
    @Res() res: Response,
  ) {
    const icalData = await this.calendarService.exportToiCal(query);
    
    res.setHeader('Content-Type', 'text/calendar');
    res.setHeader('Content-Disposition', 'attachment; filename="gmah-calendar.ics"');
    res.send(icalData);
  }

  @Get('statistics')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.SECRETARY, Role.TREASURER)
  @ApiOperation({ summary: 'Get calendar statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully.' })
  async getStatistics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.calendarService.getStatistics(start, end);
  }

  // Hebrew Calendar endpoints
  @Get('hebrew/today')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.SECRETARY, Role.TREASURER, Role.COMMITTEE_MEMBER)
  @ApiOperation({ summary: 'Get Hebrew date for today' })
  @ApiResponse({ status: 200, description: 'Hebrew date retrieved successfully.' })
  async getHebrewToday() {
    return this.hebrewCalendarService.getHebrewToday();
  }

  @Get('hebrew/convert')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.SECRETARY, Role.TREASURER, Role.COMMITTEE_MEMBER)
  @ApiOperation({ summary: 'Convert Gregorian date to Hebrew date' })
  @ApiResponse({ status: 200, description: 'Date converted successfully.' })
  async convertToHebrew(@Query('date') date: string) {
    const gregorianDate = new Date(date);
    return this.hebrewCalendarService.gregorianToHebrew(gregorianDate);
  }

  @Get('hebrew/holidays')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.SECRETARY, Role.TREASURER, Role.COMMITTEE_MEMBER)
  @ApiOperation({ summary: 'Get Jewish holidays for a year' })
  @ApiResponse({ status: 200, description: 'Holidays retrieved successfully.' })
  async getJewishHolidays(@Query('year') year?: number) {
    const targetYear = year || new Date().getFullYear();
    return this.hebrewCalendarService.getJewishHolidays(targetYear);
  }

  @Get('hebrew/holidays/major')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.SECRETARY, Role.TREASURER, Role.COMMITTEE_MEMBER)
  @ApiOperation({ summary: 'Get major Jewish holidays for a year' })
  @ApiResponse({ status: 200, description: 'Major holidays retrieved successfully.' })
  async getMajorJewishHolidays(@Query('year') year?: number) {
    const targetYear = year || new Date().getFullYear();
    return this.hebrewCalendarService.getMajorJewishHolidays(targetYear);
  }

  @Get('hebrew/holidays/range')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.SECRETARY, Role.TREASURER, Role.COMMITTEE_MEMBER)
  @ApiOperation({ summary: 'Get Jewish holidays for a date range' })
  @ApiResponse({ status: 200, description: 'Holidays for range retrieved successfully.' })
  async getJewishHolidaysForRange(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return this.hebrewCalendarService.getJewishHolidaysForDateRange(start, end);
  }

  @Get('hebrew/is-holiday')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.SECRETARY, Role.TREASURER, Role.COMMITTEE_MEMBER)
  @ApiOperation({ summary: 'Check if a date is a Jewish holiday' })
  @ApiResponse({ status: 200, description: 'Holiday check completed.' })
  async isJewishHoliday(@Query('date') date: string) {
    const checkDate = new Date(date);
    return this.hebrewCalendarService.isJewishHoliday(checkDate);
  }

  @Get('hebrew/shemitah')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.SECRETARY, Role.TREASURER)
  @ApiOperation({ summary: 'Get Shemitah year information' })
  @ApiResponse({ status: 200, description: 'Shemitah information retrieved successfully.' })
  async getShemitahInfo(@Query('hebrewYear') hebrewYear?: number) {
    return this.hebrewCalendarService.getShemitahInfo(hebrewYear);
  }

  @Get('hebrew/months/:year')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.SECRETARY, Role.TREASURER, Role.COMMITTEE_MEMBER)
  @ApiOperation({ summary: 'Get Hebrew months for a Hebrew year' })
  @ApiResponse({ status: 200, description: 'Hebrew months retrieved successfully.' })
  async getHebrewMonths(@Param('year') year: number) {
    return {
      year,
      isLeapYear: this.hebrewCalendarService.isHebrewLeapYear(year),
      months: this.hebrewCalendarService.getHebrewMonths(year),
    };
  }

  @Get('hebrew/current-year')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.SECRETARY, Role.TREASURER, Role.COMMITTEE_MEMBER)
  @ApiOperation({ summary: 'Get current Hebrew year' })
  @ApiResponse({ status: 200, description: 'Current Hebrew year retrieved successfully.' })
  async getCurrentHebrewYear() {
    return {
      hebrewYear: this.hebrewCalendarService.getCurrentHebrewYear(),
      today: this.hebrewCalendarService.getHebrewToday(),
    };
  }
}