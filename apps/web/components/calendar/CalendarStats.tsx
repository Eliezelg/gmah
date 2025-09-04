'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  Users,
  Target,
  Activity
} from 'lucide-react';
import { CalendarStatistics, EVENT_TYPE_COLORS, PRIORITY_COLORS } from '@/types/calendar';

interface CalendarStatsProps {
  statistics: CalendarStatistics;
}

export function CalendarStats({ statistics }: CalendarStatsProps) {
  const t = useTranslations('Calendar');

  const statsCards = [
    {
      title: t('stats.totalEvents'),
      value: statistics.totalEvents,
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: t('stats.upcomingEvents'),
      value: statistics.upcomingEvents,
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: t('stats.overdueEvents'),
      value: statistics.overdueEvents,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      title: t('stats.completedEvents'),
      value: statistics.eventsByStatus['COMPLETED'] || 0,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Main Statistics Cards */}
      {statsCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-full ${stat.bgColor}`}>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        );
      })}

      {/* Event Types Breakdown */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center">
            <Target className="mr-2 h-4 w-4" />
            {t('stats.eventsByType')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(statistics.eventsByType).map(([type, count]) => {
              if (count === 0) return null;
              return (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: EVENT_TYPE_COLORS[type as keyof typeof EVENT_TYPE_COLORS] }}
                    />
                    <span className="text-sm">
                      {t(`types.${type.toLowerCase()}`)}
                    </span>
                  </div>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Event Status Breakdown */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center">
            <Activity className="mr-2 h-4 w-4" />
            {t('stats.eventsByStatus')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(statistics.eventsByStatus).map(([status, count]) => {
              if (count === 0) return null;
              
              const statusColors = {
                SCHEDULED: 'text-blue-600 bg-blue-50',
                COMPLETED: 'text-green-600 bg-green-50',
                CANCELLED: 'text-red-600 bg-red-50',
                POSTPONED: 'text-yellow-600 bg-yellow-50',
                IN_PROGRESS: 'text-purple-600 bg-purple-50',
              };
              
              const colorClass = statusColors[status as keyof typeof statusColors] || 'text-gray-600 bg-gray-50';
              
              return (
                <div key={status} className={`p-3 rounded-lg ${colorClass}`}>
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-sm">
                    {t(`status.${status.toLowerCase()}`)}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Priority Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center">
            <TrendingUp className="mr-2 h-4 w-4" />
            {t('stats.priorityDistribution')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(statistics.eventsByPriority).map(([priority, count]) => {
              if (count === 0) return null;
              
              const priorityIcons = {
                LOW: '🟢',
                NORMAL: '🔵', 
                HIGH: '🟡',
                URGENT: '🔴',
              };
              
              return (
                <div key={priority} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span>{priorityIcons[priority as keyof typeof priorityIcons]}</span>
                    <span className="text-sm">
                      {t(`priority.${priority.toLowerCase()}`)}
                    </span>
                  </div>
                  <Badge 
                    variant="secondary" 
                    style={{ 
                      backgroundColor: PRIORITY_COLORS[priority as keyof typeof PRIORITY_COLORS] + '20',
                      color: PRIORITY_COLORS[priority as keyof typeof PRIORITY_COLORS]
                    }}
                  >
                    {count}
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center">
            <Users className="mr-2 h-4 w-4" />
            {t('stats.quickInsights')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Completion Rate */}
          <div>
            <div className="flex justify-between text-sm">
              <span>{t('stats.completionRate')}</span>
              <span>
                {statistics.totalEvents > 0 
                  ? Math.round((statistics.eventsByStatus['COMPLETED'] || 0) / statistics.totalEvents * 100)
                  : 0
                }%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
              <div 
                className="bg-green-600 h-2 rounded-full" 
                style={{ 
                  width: statistics.totalEvents > 0 
                    ? `${(statistics.eventsByStatus['COMPLETED'] || 0) / statistics.totalEvents * 100}%`
                    : '0%'
                }}
              />
            </div>
          </div>

          {/* Urgent Events Alert */}
          {statistics.eventsByPriority['URGENT'] > 0 && (
            <div className="bg-red-50 text-red-700 p-2 rounded text-sm">
              <AlertTriangle className="inline mr-1 h-3 w-3" />
              {t('stats.urgentEventsAlert', { count: statistics.eventsByPriority['URGENT'] })}
            </div>
          )}

          {/* Overdue Events Alert */}
          {statistics.overdueEvents > 0 && (
            <div className="bg-orange-50 text-orange-700 p-2 rounded text-sm">
              <Clock className="inline mr-1 h-3 w-3" />
              {t('stats.overdueEventsAlert', { count: statistics.overdueEvents })}
            </div>
          )}

          {/* No Events Message */}
          {statistics.totalEvents === 0 && (
            <div className="bg-gray-50 text-gray-600 p-2 rounded text-sm text-center">
              <Calendar className="inline mr-1 h-3 w-3" />
              {t('stats.noEventsMessage')}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}