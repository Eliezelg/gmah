import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  BarChart,
  LineChart,
  PieChart,
  Activity,
  Calendar,
  Table,
  List,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';

interface WidgetLibraryProps {
  onSelect: (widget: any) => void;
  onClose: () => void;
}

const availableWidgets = [
  {
    type: 'METRIC',
    title: 'Métrique',
    description: 'Affiche une valeur unique avec tendance',
    icon: TrendingUp,
    sizes: ['SMALL', 'MEDIUM'],
    category: 'Base',
  },
  {
    type: 'CHART',
    title: 'Graphique',
    description: 'Visualisation de données avec graphiques',
    icon: LineChart,
    sizes: ['MEDIUM', 'LARGE', 'XLARGE'],
    category: 'Visualisation',
  },
  {
    type: 'TABLE',
    title: 'Tableau',
    description: 'Affiche des données tabulaires',
    icon: Table,
    sizes: ['LARGE', 'XLARGE'],
    category: 'Données',
  },
  {
    type: 'LIST',
    title: 'Liste',
    description: 'Liste d\'éléments',
    icon: List,
    sizes: ['MEDIUM', 'LARGE'],
    category: 'Données',
  },
  {
    type: 'CALENDAR',
    title: 'Calendrier',
    description: 'Affiche les événements',
    icon: Calendar,
    sizes: ['LARGE', 'XLARGE'],
    category: 'Planning',
  },
  {
    type: 'GAUGE',
    title: 'Jauge',
    description: 'Indicateur de niveau',
    icon: Activity,
    sizes: ['SMALL', 'MEDIUM'],
    category: 'Indicateurs',
  },
  {
    type: 'ALERT',
    title: 'Alertes',
    description: 'Affiche les alertes actives',
    icon: AlertCircle,
    sizes: ['MEDIUM', 'LARGE'],
    category: 'Notifications',
  },
];

export function WidgetLibrary({ onSelect, onClose }: WidgetLibraryProps) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Bibliothèque de Widgets</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {availableWidgets.map((widget) => {
              const Icon = widget.icon;
              return (
                <Card
                  key={widget.type}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => {
                    onSelect({
                      type: widget.type,
                      title: `Nouveau ${widget.title}`,
                      size: widget.sizes[0],
                      dataSource: 'default',
                    });
                  }}
                >
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">{widget.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-xs">
                      {widget.description}
                    </CardDescription>
                    <div className="mt-2 flex gap-1">
                      {widget.sizes.map((size) => (
                        <span
                          key={size}
                          className="text-xs bg-secondary px-1.5 py-0.5 rounded"
                        >
                          {size}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}