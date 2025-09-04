import { Injectable } from '@nestjs/common';
import { HDate, months, Event, HebrewCalendar, flags } from '@hebcal/core';

interface HebrewDateInfo {
  hebrewDate: string;
  hebrewYear: number;
  hebrewMonth: string;
  hebrewDay: number;
  gregorianDate: Date;
}

interface JewishHoliday {
  title: string;
  hebrewTitle?: string;
  date: Date;
  hebrewDate: string;
  type: 'major' | 'minor' | 'fast' | 'modern';
  description?: string;
}

@Injectable()
export class HebrewCalendarService {
  /**
   * Convert Gregorian date to Hebrew date
   */
  gregorianToHebrew(date: Date): HebrewDateInfo {
    const hd = new HDate(date);
    
    return {
      hebrewDate: hd.toString(),
      hebrewYear: hd.getFullYear(),
      hebrewMonth: hd.getMonthName(),
      hebrewDay: hd.getDate(),
      gregorianDate: date,
    };
  }

  /**
   * Convert Hebrew date to Gregorian date
   */
  hebrewToGregorian(hebrewYear: number, hebrewMonth: string, hebrewDay: number): Date {
    const monthNum = this.getHebrewMonthNumber(hebrewMonth, hebrewYear);
    const hd = new HDate(hebrewDay, monthNum, hebrewYear);
    return hd.greg();
  }

  /**
   * Get Hebrew month number from name
   */
  private getHebrewMonthNumber(monthName: string, year: number): number {
    const monthNames = months[HDate.isLeapYear(year) ? 1 : 0];
    const index = monthNames.indexOf(monthName);
    return index !== -1 ? index + 1 : 1;
  }

  /**
   * Get Jewish holidays for a given year
   */
  getJewishHolidays(gregorianYear: number): JewishHoliday[] {
    const options = {
      year: gregorianYear,
      isHebrewYear: false,
      candlelighting: false,
      location: undefined,
      il: false, // Israel vs. diaspora
      noHolidays: false,
    };

    const events = HebrewCalendar.calendar(options);
    const holidays: JewishHoliday[] = [];

    for (const ev of events) {
      if (ev.getFlags() & flags.CHAG || 
          ev.getFlags() & flags.MINOR_HOLIDAY ||
          ev.getFlags() & flags.MODERN_HOLIDAY ||
          ev.getFlags() & flags.MAJOR_FAST) {
        
        holidays.push({
          title: ev.render('en'),
          hebrewTitle: ev.renderBrief('he'),
          date: ev.getDate().greg(),
          hebrewDate: ev.getDate().toString(),
          type: this.getHolidayType(ev.getFlags()),
          description: ev.getDesc(),
        });
      }
    }

    return holidays.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /**
   * Get Jewish holidays for a date range
   */
  getJewishHolidaysForDateRange(startDate: Date, endDate: Date): JewishHoliday[] {
    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();
    const holidays: JewishHoliday[] = [];

    for (let year = startYear; year <= endYear; year++) {
      const yearHolidays = this.getJewishHolidays(year);
      holidays.push(...yearHolidays.filter(h => 
        h.date >= startDate && h.date <= endDate
      ));
    }

    return holidays;
  }

  /**
   * Get major Jewish holidays only
   */
  getMajorJewishHolidays(gregorianYear: number): JewishHoliday[] {
    return this.getJewishHolidays(gregorianYear)
      .filter(h => h.type === 'major');
  }

  /**
   * Check if a date is a Jewish holiday
   */
  isJewishHoliday(date: Date): { isHoliday: boolean; holidays: JewishHoliday[] } {
    const hd = new HDate(date);
    const options = {
      isHebrewYear: false,
      candlelighting: false,
      location: undefined,
    };

    const events = HebrewCalendar.getHolidaysOnDate(hd, options) || [];
    const holidays: JewishHoliday[] = events.map(ev => ({
      title: ev.render('en'),
      hebrewTitle: ev.renderBrief('he'),
      date: date,
      hebrewDate: hd.toString(),
      type: this.getHolidayType(ev.getFlags()),
      description: ev.getDesc(),
    }));

    return {
      isHoliday: holidays.length > 0,
      holidays,
    };
  }

  /**
   * Get the current Hebrew year
   */
  getCurrentHebrewYear(): number {
    return new HDate().getFullYear();
  }

  /**
   * Get Hebrew date for today
   */
  getHebrewToday(): HebrewDateInfo {
    return this.gregorianToHebrew(new Date());
  }

  /**
   * Get Shemitah year information
   */
  getShemitahInfo(hebrewYear?: number): { 
    isShemitahYear: boolean; 
    nextShemitahYear: number; 
    yearsUntilShemitah: number;
    currentYear: number;
  } {
    const currentYear = hebrewYear || this.getCurrentHebrewYear();
    
    // Shemitah cycle: every 7 years, last was 5782 (2021-2022)
    const lastShemitahYear = 5782;
    const cycleLength = 7;
    
    const yearsSinceLastShemitah = currentYear - lastShemitahYear;
    const isShemitahYear = yearsSinceLastShemitah % cycleLength === 0;
    
    const nextShemitahYear = isShemitahYear ? 
      currentYear + cycleLength : 
      lastShemitahYear + (Math.ceil(yearsSinceLastShemitah / cycleLength) * cycleLength);
    
    const yearsUntilShemitah = nextShemitahYear - currentYear;

    return {
      isShemitahYear,
      nextShemitahYear,
      yearsUntilShemitah,
      currentYear,
    };
  }

  /**
   * Get Hebrew months for a Hebrew year
   */
  getHebrewMonths(hebrewYear: number): string[] {
    return months[HDate.isLeapYear(hebrewYear) ? 1 : 0];
  }

  /**
   * Check if Hebrew year is a leap year
   */
  isHebrewLeapYear(hebrewYear: number): boolean {
    return HDate.isLeapYear(hebrewYear);
  }

  /**
   * Format Hebrew date in various formats
   */
  formatHebrewDate(date: Date, format: 'full' | 'short' | 'numeric' = 'full'): string {
    const hd = new HDate(date);
    
    switch (format) {
      case 'full':
        return hd.toString();
      case 'short':
        return `${hd.getDate()} ${hd.getMonthName()}`;
      case 'numeric':
        return `${hd.getDate()}/${hd.getMonth()}/${hd.getFullYear()}`;
      default:
        return hd.toString();
    }
  }

  /**
   * Determine holiday type from flags
   */
  private getHolidayType(holidayFlags: number): 'major' | 'minor' | 'fast' | 'modern' {
    if (holidayFlags & flags.CHAG) return 'major';
    if (holidayFlags & flags.MAJOR_FAST) return 'fast';
    if (holidayFlags & flags.MODERN_HOLIDAY) return 'modern';
    if (holidayFlags & flags.MINOR_HOLIDAY) return 'minor';
    return 'minor';
  }
}