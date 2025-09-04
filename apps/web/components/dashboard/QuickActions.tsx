import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface QuickActionsProps {
  actions: Array<{
    id: string;
    label: string;
    icon: string;
    action: string;
    params?: any;
  }>;
}

export function QuickActions({ actions }: QuickActionsProps) {
  const router = useRouter();

  if (!actions || actions.length === 0) {
    return null;
  }

  const handleAction = (action: any) => {
    switch (action.action) {
      case 'navigate':
        if (action.params?.path) {
          router.push(action.params.path);
        }
        break;
      case 'openSearch':
        // Trigger global search
        document.dispatchEvent(new CustomEvent('openGlobalSearch'));
        break;
      case 'openExport':
        // Trigger export dialog
        document.dispatchEvent(new CustomEvent('openExportDialog'));
        break;
      default:
        console.log('Quick action:', action);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="default" size="sm">
          <Zap className="mr-2 h-4 w-4" />
          Actions rapides
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {actions.map((action) => (
          <DropdownMenuItem
            key={action.id}
            onClick={() => handleAction(action)}
          >
            {/* Dynamic icon would go here */}
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}