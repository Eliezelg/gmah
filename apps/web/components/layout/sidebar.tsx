'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useTranslations } from 'next-intl';
import {
  LayoutDashboard,
  FileText,
  Users,
  Wallet,
  Shield,
  Settings,
  LogOut,
  Moon,
  Sun,
  Menu,
  X,
  TrendingUp,
  ClipboardCheck,
  UserCheck,
  BanknoteIcon,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useTheme } from 'next-themes';
import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const navigation = {
  BORROWER: [
    { name: 'Tableau de bord', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Mes prêts', href: '/loans/my-loans', icon: FileText },
    { name: 'Nouvelle demande', href: '/loans/new', icon: FileText },
    { name: 'Mon profil', href: '/profile', icon: Settings },
  ],
  GUARANTOR: [
    { name: 'Tableau de bord', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Garanties', href: '/guarantees', icon: Shield },
    { name: 'Mon profil', href: '/profile', icon: Settings },
  ],
  COMMITTEE_MEMBER: [
    { name: 'Tableau de bord', href: '/committee', icon: LayoutDashboard },
    { name: 'Demandes à examiner', href: '/committee/loans', icon: ClipboardCheck },
    { name: 'Historique des votes', href: '/committee/history', icon: UserCheck },
    { name: 'Statistiques', href: '/committee/statistics', icon: TrendingUp },
    { name: 'Mon profil', href: '/profile', icon: Settings },
  ],
  TREASURER: [
    { name: 'Tableau de bord', href: '/treasurer', icon: LayoutDashboard },
    { name: 'Prévisions', href: '/admin/treasury-forecast', icon: BarChart3 },
    { name: 'Décaissements', href: '/treasurer/disbursements', icon: BanknoteIcon },
    { name: 'Paiements', href: '/treasurer/payments', icon: Wallet },
    { name: 'Rapports', href: '/treasurer/reports', icon: FileText },
  ],
  ADMIN: [
    { name: 'Tableau de bord', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Prévisions Trésorerie', href: '/admin/treasury-forecast', icon: BarChart3 },
    { name: 'Gestion des prêts', href: '/admin/loans', icon: FileText },
    { name: 'Utilisateurs', href: '/admin/users', icon: Users },
    { name: 'Configuration', href: '/admin/settings', icon: Settings },
    { name: 'Rapports', href: '/admin/reports', icon: TrendingUp },
  ],
  SUPER_ADMIN: [
    { name: 'Tableau de bord', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Prévisions Trésorerie', href: '/admin/treasury-forecast', icon: BarChart3 },
    { name: 'Gestion des prêts', href: '/admin/loans', icon: FileText },
    { name: 'Utilisateurs', href: '/admin/users', icon: Users },
    { name: 'Configuration', href: '/admin/settings', icon: Settings },
    { name: 'Rapports', href: '/admin/reports', icon: TrendingUp },
  ],
};

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const tMenu = useTranslations('sidebar');
  const tCommon = useTranslations('common');

  const userNavigation = navigation[user?.role || 'BORROWER'];

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </div>

      {/* Sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center px-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-primary">GMAH</h2>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            {userNavigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-gray-100 dark:bg-gray-800 text-primary'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  )}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start p-2">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {user?.firstName?.[0]}{user?.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-medium">
                        {user?.firstName} {user?.lastName}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {user?.email}
                      </span>
                    </div>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    Paramètres
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="cursor-pointer"
                >
                  {theme === 'dark' ? (
                    <>
                      <Sun className="mr-2 h-4 w-4" />
                      Mode clair
                    </>
                  ) : (
                    <>
                      <Moon className="mr-2 h-4 w-4" />
                      Mode sombre
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
}