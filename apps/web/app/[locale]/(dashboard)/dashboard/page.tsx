'use client';

import { useAuthStore } from '@/lib/stores/auth-store';
import { BorrowerDashboard } from '@/components/dashboards/borrower-dashboard';
import { AdminDashboard } from '@/components/dashboards/admin-dashboard';
import { CommitteeDashboard } from '@/components/dashboards/committee-dashboard';
import { TreasurerDashboard } from '@/components/dashboards/treasurer-dashboard';
import { GuarantorDashboard } from '@/components/dashboards/guarantor-dashboard';

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);

  if (!user) {
    return null;
  }

  // Render dashboard based on user role
  switch (user.role) {
    case 'BORROWER':
      return <BorrowerDashboard />;
    case 'GUARANTOR':
      return <GuarantorDashboard />;
    case 'COMMITTEE_MEMBER':
      return <CommitteeDashboard />;
    case 'TREASURER':
      return <TreasurerDashboard />;
    case 'ADMIN':
    case 'SUPER_ADMIN':
      return <AdminDashboard />;
    default:
      return <BorrowerDashboard />;
  }
}