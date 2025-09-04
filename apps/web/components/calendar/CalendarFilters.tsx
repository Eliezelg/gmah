'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  CalendarEventFilters,
  CalendarEventType, 
  CalendarEventStatus, 
  CalendarEventPriority,
  EVENT_TYPE_COLORS 
} from '@/types/calendar';
import { 
  Filter, 
  X, 
  Calendar as CalendarIcon,
  RefreshCw,
  Search
} from 'lucide-react';
import { format } from 'date-fns';
import { fr, enUS, he } from 'date-fns/locale';

interface CalendarFiltersProps {
  filters: CalendarEventFilters;
  onFiltersChange: (filters: CalendarEventFilters) => void;
  onRefresh: () => void;
  isLoading?: boolean;
}

export function CalendarFilters({ 
  filters, 
  onFiltersChange, 
  onRefresh, 
  isLoading = false 
}: CalendarFiltersProps) {
  const t = useTranslations('Calendar');
  
  // Get locale for date picker
  const locale = t('locale');
  const dateLocale = locale === 'fr' ? fr : locale === 'he' ? he : enUS;

  const handleTypeToggle = (type: CalendarEventType, checked: boolean) => {
    const currentTypes = filters.types || [];
    const newTypes = checked
      ? [...currentTypes, type]
      : currentTypes.filter(t => t !== type);
    
    onFiltersChange({ ...filters, types: newTypes });
  };

  const handleStatusToggle = (status: CalendarEventStatus, checked: boolean) => {
    const currentStatuses = filters.statuses || [];
    const newStatuses = checked
      ? [...currentStatuses, status]
      : currentStatuses.filter(s => s !== status);
    
    onFiltersChange({ ...filters, statuses: newStatuses });
  };

  const handlePriorityToggle = (priority: CalendarEventPriority, checked: boolean) => {
    const currentPriorities = filters.priorities || [];
    const newPriorities = checked
      ? [...currentPriorities, priority]
      : currentPriorities.filter(p => p !== priority);
    
    onFiltersChange({ ...filters, priorities: newPriorities });
  };

  const handleDateChange = (field: 'startDate' | 'endDate', date: Date | undefined) => {
    onFiltersChange({ 
      ...filters, 
      [field]: date ? date.toISOString().split('T')[0] : undefined 
    });
  };

  const handleSearchChange = (search: string) => {
    onFiltersChange({ ...filters, search: search || undefined });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = Object.keys(filters).some(key => {
    const value = filters[key as keyof CalendarEventFilters];
    return value !== undefined && value !== null && 
           (Array.isArray(value) ? value.length > 0 : value !== '');
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center">
            <Filter className="mr-2 h-4 w-4" />
            {t('filters.title')}
          </CardTitle>
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
            >
              <X className="mr-1 h-3 w-3" />
              {t('filters.clear')}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search */}
        <div>
          <Label htmlFor="search">{t('filters.search')}</Label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder={t('filters.searchPlaceholder')}
              value={filters.search || ''}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Date Range */}
        <div>
          <Label>{t('filters.dateRange')}</Label>
          <div className="grid grid-cols-2 gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.startDate 
                    ? format(new Date(filters.startDate), 'P', { locale: dateLocale })
                    : t('filters.startDate')
                  }
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={filters.startDate ? new Date(filters.startDate) : undefined}
                  onSelect={(date) => handleDateChange('startDate', date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.endDate 
                    ? format(new Date(filters.endDate), 'P', { locale: dateLocale })
                    : t('filters.endDate')
                  }
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={filters.endDate ? new Date(filters.endDate) : undefined}
                  onSelect={(date) => handleDateChange('endDate', date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Event Types */}
        <div>
          <Label>{t('filters.eventTypes')}</Label>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {Object.values(CalendarEventType).map((type) => (
              <div key={type} className="flex items-center space-x-2">
                <Checkbox
                  id={`type-${type}`}
                  checked={filters.types?.includes(type) || false}
                  onCheckedChange={(checked) => handleTypeToggle(type, checked as boolean)}
                />
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: EVENT_TYPE_COLORS[type] }}
                  />
                  <Label htmlFor={`type-${type}`} className="text-sm">
                    {t(`types.${type.toLowerCase()}`)}
                  </Label>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Event Status */}
        <div>
          <Label>{t('filters.status')}</Label>
          <div className="space-y-2">
            {Object.values(CalendarEventStatus).map((status) => (
              <div key={status} className="flex items-center space-x-2">
                <Checkbox
                  id={`status-${status}`}
                  checked={filters.statuses?.includes(status) || false}
                  onCheckedChange={(checked) => handleStatusToggle(status, checked as boolean)}
                />
                <Label htmlFor={`status-${status}`} className="text-sm">
                  {t(`status.${status.toLowerCase()}`)}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Priority */}
        <div>
          <Label>{t('filters.priority')}</Label>
          <div className="space-y-2">
            {Object.values(CalendarEventPriority).map((priority) => (
              <div key={priority} className="flex items-center space-x-2">
                <Checkbox
                  id={`priority-${priority}`}
                  checked={filters.priorities?.includes(priority) || false}
                  onCheckedChange={(checked) => handlePriorityToggle(priority, checked as boolean)}
                />
                <Label htmlFor={`priority-${priority}`} className="text-sm">
                  {t(`priority.${priority.toLowerCase()}`)}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Additional Options */}
        <div>
          <Label>{t('filters.options')}</Label>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="public-events"
                checked={filters.isPublic || false}
                onCheckedChange={(checked) => 
                  onFiltersChange({ ...filters, isPublic: checked ? true : undefined })
                }
              />
              <Label htmlFor="public-events" className="text-sm">
                {t('filters.publicOnly')}
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="system-generated"
                checked={filters.isSystemGenerated || false}
                onCheckedChange={(checked) => 
                  onFiltersChange({ ...filters, isSystemGenerated: checked ? true : undefined })
                }
              />
              <Label htmlFor="system-generated" className="text-sm">
                {t('filters.systemGenerated')}
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="recurring-events"
                checked={filters.isRecurring || false}
                onCheckedChange={(checked) => 
                  onFiltersChange({ ...filters, isRecurring: checked ? true : undefined })
                }
              />
              <Label htmlFor="recurring-events" className="text-sm">
                {t('filters.recurringOnly')}
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hebrew-dates"
                checked={filters.isHebrewDate || false}
                onCheckedChange={(checked) => 
                  onFiltersChange({ ...filters, isHebrewDate: checked ? true : undefined })
                }
              />
              <Label htmlFor="hebrew-dates" className="text-sm">
                {t('filters.hebrewDatesOnly')}
              </Label>
            </div>
          </div>
        </div>

        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <div>
            <Label className="text-xs text-muted-foreground">
              {t('filters.activeFilters')}
            </Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {filters.search && (
                <Badge variant="secondary" className="text-xs">
                  {t('filters.search')}: {filters.search}
                </Badge>
              )}
              {filters.types?.map(type => (
                <Badge key={type} variant="secondary" className="text-xs">
                  {t(`types.${type.toLowerCase()}`)}
                </Badge>
              ))}
              {filters.statuses?.map(status => (
                <Badge key={status} variant="secondary" className="text-xs">
                  {t(`status.${status.toLowerCase()}`)}
                </Badge>
              ))}
              {filters.priorities?.map(priority => (
                <Badge key={priority} variant="secondary" className="text-xs">
                  {t(`priority.${priority.toLowerCase()}`)}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Refresh Button */}
        <Button
          onClick={onRefresh}
          disabled={isLoading}
          className="w-full"
          variant="outline"
        >
          {isLoading ? (
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          {t('actions.refresh')}
        </Button>
      </CardContent>
    </Card>
  );
}