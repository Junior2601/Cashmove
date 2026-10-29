// layouts/SemiAdminLayout.jsx — espace semi-admin (coquille commune : StaffShell)
import { LayoutDashboard, ArrowLeftRight, Settings } from 'lucide-react';
import StaffShell from './StaffShell';

const SECTIONS = [
  {
    title: 'Pilotage',
    items: [
      { path: '/semi-admin/dashboard',    label: 'Tableau de bord', icon: LayoutDashboard },
      { path: '/semi-admin/transactions', label: 'Transactions',    icon: ArrowLeftRight, live: true },
    ],
  },
  {
    title: 'Compte',
    items: [{ path: '/semi-admin/parametres', label: 'Paramètres', icon: Settings }],
  },
];

// Toutes les rubriques tiennent dans la barre du bas : pas de « Menu »
const BOTTOM = [
  { path: '/semi-admin/dashboard',    label: 'Accueil',      icon: LayoutDashboard },
  { path: '/semi-admin/transactions', label: 'Transactions', icon: ArrowLeftRight, central: true, live: true },
  { path: '/semi-admin/parametres',   label: 'Paramètres',   icon: Settings },
];

export default function SemiAdminLayout() {
  return <StaffShell sections={SECTIONS} bottom={BOTTOM} space="Semi-admin" livePath="/semi-admin/transactions" />;
}
