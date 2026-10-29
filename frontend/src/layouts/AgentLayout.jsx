// layouts/AgentLayout.jsx — espace agent (coquille commune : StaffShell)
import { LayoutDashboard, ArrowLeftRight, Redo2, CircleFadingPlus, Phone, Settings } from 'lucide-react';
import StaffShell from './StaffShell';

const SECTIONS = [
  {
    title: 'Opérations',
    items: [
      { path: '/agent/dashboard',    label: 'Tableau de bord',  icon: LayoutDashboard },
      { path: '/agent/transactions', label: 'Transactions',     icon: ArrowLeftRight, live: true },
      { path: '/agent/redirections', label: 'Redirections',     icon: Redo2 },
      { path: '/agent/create',       label: 'Nouveau transfert', icon: CircleFadingPlus },
    ],
  },
  {
    title: 'Mon compte',
    items: [
      { path: '/agent/numbers',    label: 'Mes numéros', icon: Phone },
      { path: '/agent/parametres', label: 'Paramètres',  icon: Settings },
    ],
  },
];

// Barre du bas (mobile) : Transactions au centre, à traiter en priorité
const BOTTOM = [
  { path: '/agent/dashboard',    label: 'Accueil',      icon: LayoutDashboard },
  { path: '/agent/redirections', label: 'Redirections', icon: Redo2 },
  { path: '/agent/transactions', label: 'Transactions', icon: ArrowLeftRight, central: true, live: true },
  { path: '/agent/create',       label: 'Créer',        icon: CircleFadingPlus },
];

export default function AgentLayout() {
  return <StaffShell sections={SECTIONS} bottom={BOTTOM} space="Espace agent" livePath="/agent/transactions" />;
}
