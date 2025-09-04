'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Calendar,
  Clock,
  MapPin,
  Link as LinkIcon,
  Users,
  Tag,
  AlertTriangle,
  Edit,
  Trash2,
  ExternalLink,
  Bell,
  Repeat,
  Star,
  Info
} from 'lucide-react';
import { CalendarEvent, EVENT_TYPE_COLORS, PRIORITY_COLORS } from '@/types/calendar';
import { format } from 'date-fns';
import { fr, enUS, he } from 'date-fns/locale';

interface EventDetailsModalProps {
  event: CalendarEvent;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
  onDelete?: () => void;
}

export function EventDetailsModal({
  event,
  open,
  onClose,
  onUpdate,
  onDelete
}: EventDetailsModalProps) {
  const t = useTranslations('Calendar');
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Get locale for date formatting
  const locale = t('locale');
  const dateLocale = locale === 'fr' ? fr : locale === 'he' ? he : enUS;

  const handleDelete = async () => {
    if (!onDelete || isDeleting) return;
    
    setIsDeleting(true);
    try {
      await onDelete();
      onClose();
    } catch (error) {
      console.error('Failed to delete event:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDateTime = (dateString: string, includeTime = true) => {
    const date = new Date(dateString);
    if (event.allDay || !includeTime) {
      return format(date, 'PPPP', { locale: dateLocale });
    }
    return format(date, 'PPPp', { locale: dateLocale });
  };

  const getTypeIcon = () => {
    const iconMap = {
      LOAN_REPAYMENT: '💰',
      DEPOSIT_WITHDRAWAL: '🏦',
      COMMITTEE_MEETING: '👥',
      JEWISH_HOLIDAY: '🕎',
      CUSTOM_EVENT: '📅',
      SYSTEM_REMINDER: '🔔',
      APPROVAL_DEADLINE: '⏰',
      PAYMENT_DUE: '💳',
      DOCUMENT_EXPIRY: '📄',
      CAMPAIGN_EVENT: '🎯',
    };
    return iconMap[event.type] || '📅';
  };

  const getPriorityIcon = () => {
    const iconMap = {
      LOW: '🟢',
      NORMAL: '🔵',
      HIGH: '🟡',
      URGENT: '🔴',
    };
    return iconMap[event.priority] || '🔵';
  };

  const getStatusColor = () => {
    const colorMap = {
      SCHEDULED: 'bg-blue-50 text-blue-700 border-blue-200',
      COMPLETED: 'bg-green-50 text-green-700 border-green-200',
      CANCELLED: 'bg-red-50 text-red-700 border-red-200',
      POSTPONED: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      IN_PROGRESS: 'bg-purple-50 text-purple-700 border-purple-200',
    };
    return colorMap[event.status] || 'bg-gray-50 text-gray-700 border-gray-200';
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-xl flex items-center">
                <span className="mr-2 text-2xl">{getTypeIcon()}</span>
                {event.title}
              </DialogTitle>
              <DialogDescription className="mt-2 flex flex-wrap gap-2">
                <Badge 
                  className={getStatusColor()}
                  variant="outline"
                >
                  {t(`status.${event.status.toLowerCase()}`)}
                </Badge>
                <Badge 
                  variant="outline"
                  style={{ 
                    backgroundColor: EVENT_TYPE_COLORS[event.type] + '20',
                    color: EVENT_TYPE_COLORS[event.type],
                    borderColor: EVENT_TYPE_COLORS[event.type]
                  }}
                >
                  {t(`types.${event.type.toLowerCase()}`)}
                </Badge>
                <Badge 
                  variant="outline"
                  style={{ 
                    backgroundColor: PRIORITY_COLORS[event.priority] + '20',
                    color: PRIORITY_COLORS[event.priority],
                    borderColor: PRIORITY_COLORS[event.priority]
                  }}
                >
                  {getPriorityIcon()} {t(`priority.${event.priority.toLowerCase()}`)}
                </Badge>
                {event.isSystemGenerated && (
                  <Badge variant="outline">
                    🤖 {t('systemGenerated')}
                  </Badge>
                )}
                {event.isRecurring && (
                  <Badge variant="outline">
                    <Repeat className="mr-1 h-3 w-3" />
                    {t('recurring')}
                  </Badge>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-6">
          <div className="space-y-6">
            {/* Description */}
            {event.description && (
              <div>
                <h4 className="font-medium mb-2 flex items-center">
                  <Info className="mr-2 h-4 w-4" />
                  {t('fields.description')}
                </h4>
                <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                  {event.description}
                </p>
              </div>
            )}

            {/* Date and Time */}
            <div>
              <h4 className="font-medium mb-3 flex items-center">
                <Calendar className="mr-2 h-4 w-4" />
                {t('fields.dateTime')}
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center">
                  <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>
                    <strong>{t('fields.startDate')}:</strong> {formatDateTime(event.startDate)}
                  </span>
                </div>
                {event.endDate && (
                  <div className="flex items-center">
                    <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>
                      <strong>{t('fields.endDate')}:</strong> {formatDateTime(event.endDate)}
                    </span>
                  </div>
                )}
                {event.allDay && (
                  <div className="flex items-center text-blue-600">
                    <Star className="mr-2 h-4 w-4" />
                    {t('allDay')}
                  </div>
                )}
                {event.timezone && (
                  <div className="text-muted-foreground">
                    <strong>{t('fields.timezone')}:</strong> {event.timezone}
                  </div>
                )}
              </div>
            </div>

            {/* Hebrew Date Info */}
            {event.isHebrewDate && (
              <div>
                <h4 className="font-medium mb-2 flex items-center">
                  🕎 {t('hebrewDate')}
                </h4>
                <div className="bg-purple-50 p-3 rounded-lg text-sm">
                  {event.hebrewDate && (
                    <div><strong>{t('fields.hebrewDate')}:</strong> {event.hebrewDate}</div>
                  )}
                  {event.hebrewYear && event.hebrewMonth && event.hebrewDay && (
                    <div className="text-muted-foreground">
                      {event.hebrewDay} {event.hebrewMonth} {event.hebrewYear}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Location */}
            {(event.location || event.locationUrl) && (
              <div>
                <h4 className="font-medium mb-2 flex items-center">
                  <MapPin className="mr-2 h-4 w-4" />
                  {t('fields.location')}
                </h4>
                <div className="space-y-2">
                  {event.location && (
                    <div className="text-sm">{event.location}</div>
                  )}
                  {event.locationUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <a 
                        href={event.locationUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center"
                      >
                        <ExternalLink className="mr-2 h-3 w-3" />
                        {t('actions.openLink')}
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Attendees */}
            {event.attendees && event.attendees.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 flex items-center">
                  <Users className="mr-2 h-4 w-4" />
                  {t('fields.attendees')} ({event.attendees.length})
                </h4>
                <div className="flex flex-wrap gap-1">
                  {event.attendees.map((attendee, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {attendee}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Reminders */}
            {event.hasReminders && event.reminderMinutes.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 flex items-center">
                  <Bell className="mr-2 h-4 w-4" />
                  {t('fields.reminders')}
                </h4>
                <div className="flex flex-wrap gap-1">
                  {event.reminderMinutes.map((minutes, index) => {
                    const hours = Math.floor(minutes / 60);
                    const remainingMinutes = minutes % 60;
                    const timeText = hours > 0 
                      ? `${hours}h${remainingMinutes > 0 ? ` ${remainingMinutes}min` : ''}`
                      : `${minutes}min`;
                    
                    return (
                      <Badge key={index} variant="outline" className="text-xs">
                        {timeText} {t('before')}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recurrence */}
            {event.isRecurring && event.recurrenceRule && (
              <div>
                <h4 className="font-medium mb-2 flex items-center">
                  <Repeat className="mr-2 h-4 w-4" />
                  {t('fields.recurrence')}
                </h4>
                <div className="bg-blue-50 p-3 rounded-lg text-sm">
                  <code className="text-xs bg-white p-1 rounded">
                    {event.recurrenceRule}
                  </code>
                </div>
              </div>
            )}

            {/* Related Entities */}
            {(event.loanId || event.withdrawalId || event.campaignId) && (
              <div>
                <h4 className="font-medium mb-2 flex items-center">
                  <LinkIcon className="mr-2 h-4 w-4" />
                  {t('fields.relatedEntities')}
                </h4>
                <div className="space-y-1 text-sm">
                  {event.loanId && (
                    <div>
                      <Badge variant="outline">
                        💰 {t('relatedEntities.loan')}: {event.loanId}
                      </Badge>
                    </div>
                  )}
                  {event.withdrawalId && (
                    <div>
                      <Badge variant="outline">
                        🏦 {t('relatedEntities.withdrawal')}: {event.withdrawalId}
                      </Badge>
                    </div>
                  )}
                  {event.campaignId && (
                    <div>
                      <Badge variant="outline">
                        🎯 {t('relatedEntities.campaign')}: {event.campaignId}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Metadata */}
            {event.metadata && Object.keys(event.metadata).length > 0 && (
              <div>
                <h4 className="font-medium mb-2 flex items-center">
                  <Tag className="mr-2 h-4 w-4" />
                  {t('fields.metadata')}
                </h4>
                <div className="bg-gray-50 p-3 rounded-lg text-xs">
                  <pre className="whitespace-pre-wrap">
                    {JSON.stringify(event.metadata, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            <Separator />

            {/* System Info */}
            <div className="text-xs text-muted-foreground space-y-1">
              <div>
                <strong>{t('fields.created')}:</strong> {formatDateTime(event.createdAt)}
              </div>
              <div>
                <strong>{t('fields.updated')}:</strong> {formatDateTime(event.updatedAt)}
              </div>
              {event.creator && (
                <div>
                  <strong>{t('fields.createdBy')}:</strong> {event.creator.firstName} {event.creator.lastName}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="flex items-center justify-between">
          <div>
            {event.isSystemGenerated && (
              <Alert className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  {t('warnings.systemGenerated')}
                </AlertDescription>
              </Alert>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              {t('actions.close')}
            </Button>
            
            {!event.isSystemGenerated && (
              <>
                <Button variant="outline" onClick={onUpdate}>
                  <Edit className="mr-2 h-4 w-4" />
                  {t('actions.edit')}
                </Button>
                
                {onDelete && (
                  <Button 
                    variant="destructive" 
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {isDeleting ? t('actions.deleting') : t('actions.delete')}
                  </Button>
                )}
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}