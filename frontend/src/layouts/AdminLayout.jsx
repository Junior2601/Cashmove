// layouts/AdminLayout.jsx — espace administration (coquille commune : StaffShell)
import {
  LayoutDashboard, ArrowLeftRight, History, Wallet, Scale, HandCoins, TrendingUp,
  Users, UserCog, Phone, Globe, CircleDollarSign, CreditCard, Megaphone, Settings,
} from 'lucide-react';
import StaffShell from './StaffShell';

const SECTIONS = [
  {
    title: 'Pilotage',
    items: [
      { path: '/admin/dashboard',    label: 'Tableau de bord', icon: LayoutDashboard },
      { path: '/admin/transactions', label: 'Transactions',    icon: ArrowLeftRight, live: true },
      { path: '/admin/historiques',  label: 'Historique',      icon: History },
    ],
  },
  {
    title: 'Finances',
    items: [
      { path: '/admin/balances', label: 'Balances', icon: Wallet },
      { path: '/admin/profits',  label: 'Profits',  icon: Scale },
      { path: '/admin/gains',    label: 'Gains',    icon: HandCoins },
      { path: '/admin/rates',    label: 'Taux',     icon: TrendingUp },
    ],
  },
  {
    title: 'Réseau',
    items: [
      { path: '/admin/agents',      label: 'Agents',          icon: Users },
      { path: '/admin/semi-admins', label: 'Semi-admins',     icon: UserCog },
      { path: '/admin/numbers',     label: 'Numéros agréés',  icon: Phone },
    ],
  },
  {
    title: 'Configuration',
    items: [
      { path: '/admin/countries',  label: 'Pays',               icon: Globe },
      { path: '/admin/currencies', label: 'Devises',            icon: CircleDollarSign },
      { path: '/admin/payements',  label: 'Moyens de paiement', icon: CreditCard },
    ],
  },
  {
    title: 'Clients',
    items: [{ path: '/admin/annonces', label: 'Annonces', icon: Megaphone }],
  },
  {
    title: 'Compte',
    items: [{ path: '/admin/parametres', label: 'Paramètres', icon: Settings }],
  },
];

// Barre du bas (mobile) : les écrans du quotidien, Transactions au centre
const BOTTOM = [
  { path: '/admin/dashboard', label: 'Accueil', icon: LayoutDashboard },
  { path: '/admin/rates', label: 'Taux', icon: TrendingUp },
  { path: '/admin/transactions', label: 'Transactions', icon: ArrowLeftRight, central: true, live: true },
  { path: '/admin/annonces', label: 'Annonces', icon: Megaphone },
];

export default function AdminLayout() {
  return <StaffShell sections={SECTIONS} bottom={BOTTOM} space="Administration" livePath="/admin/transactions" />;
}
