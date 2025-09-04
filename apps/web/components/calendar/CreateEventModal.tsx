'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { CalendarEventType, CalendarEventPriority, CreateCalendarEventRequest } from '@/types/calendar';
import { Loader2 } from 'lucide-react';

interface CreateEventModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: () => void;
}

export function CreateEventModal({ open, onClose, onCreate }: CreateEventModalProps) {
  const t = useTranslations('Calendar');
  const [isCreating, setIsCreating] = useState(false);
  
  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<CreateCalendarEventRequest>();
  
  const onSubmit = async (data: CreateCalendarEventRequest) => {
    setIsCreating(true);
    try {
      // TODO: Call API to create event
      console.log('Creating event:', data);
      onCreate();
      reset();
    } catch (error) {
      console.error('Failed to create event:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('actions.createEvent')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Title */}
          <div>
            <Label htmlFor="title">{t('fields.title')} *</Label>
            <Input
              id="title"
              {...register('title', { required: t('validation.required') })}
            />
            {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">{t('fields.description')}</Label>
            <Textarea
              id="description"
              {...register('description')}
              rows={3}
            />
          </div>

          {/* Type and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t('fields.type')} *</Label>
              <Select onValueChange={(value) => setValue('type', value as CalendarEventType)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('fields.selectType')} />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(CalendarEventType).map(type => (
                    <SelectItem key={type} value={type}>
                      {t(`types.${type.toLowerCase()}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t('fields.priority')}</Label>
              <Select onValueChange={(value) => setValue('priority', value as CalendarEventPriority)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('fields.selectPriority')} />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(CalendarEventPriority).map(priority => (
                    <SelectItem key={priority} value={priority}>
                      {t(`priority.${priority.toLowerCase()}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">{t('fields.startDate')} *</Label>
              <Input
                id="startDate"
                type="datetime-local"
                {...register('startDate', { required: t('validation.required') })}
              />
              {errors.startDate && <p className="text-sm text-red-500">{errors.startDate.message}</p>}
            </div>

            <div>
              <Label htmlFor="endDate">{t('fields.endDate')}</Label>
              <Input
                id="endDate"
                type="datetime-local"
                {...register('endDate')}
              />
            </div>
          </div>

          {/* Options */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="allDay"
                onCheckedChange={(checked) => setValue('allDay', checked as boolean)}
              />
              <Label htmlFor="allDay">{t('fields.allDay')}</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isPublic"
                onCheckedChange={(checked) => setValue('isPublic', checked as boolean)}
              />
              <Label htmlFor="isPublic">{t('fields.isPublic')}</Label>
            </div>
          </div>

          {/* Location */}
          <div>
            <Label htmlFor="location">{t('fields.location')}</Label>
            <Input
              id="location"
              {...register('location')}
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              {t('actions.cancel')}
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('actions.create')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}