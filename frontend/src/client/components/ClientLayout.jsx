// client/components/ClientLayout.jsx — coque de la SPA client :
// contenu + barre de cinq icônes fixe en bas, bouton « Envoyer » au centre (cahier V2 · §5)
import { NavLink, Outlet, Navigate, useLocation } from "react-router-dom";
import { Home, History, Send, Bell, User } from "lucide-react";
import { useClientSession } from "../session";
import { FullPageSpinner } from "./ui";
import Toaster from "./Toaster";
import LockScreen from "./LockScreen";
import { WifiOff } from "lucide-react";
import { useOnline } from "../offline";
import { useClientRealtime } from "../realtime";

const TABS = [
  { to: "/", label: "Accueil", icon: Home, end: true },
  { to: "/transactions", label: "Historique", icon: History },
  { to: "/envoyer", label: "Envoyer", icon: Send, central: true },
  { to: "/notifications", label: "Alertes", icon: Bell, badge: true },
  { to: "/profil", label: "Profil", icon: User },
];

function BottomNav() {
  const unread = useClientSession((s) => s.unreadCount);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-black/5 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-white/10 dark:bg-slate-900/95"
      aria-label="Navigation principale"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {TABS.map(({ to, label, icon, end, central, badge }) => {
          const Icon = icon;
          return (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 pb-2 pt-1.5 text-[11px] font-medium transition ${
                  isActive ? "text-blue-700 dark:text-blue-300" : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {central ? (
                    <span className="-mt-6 mb-0.5 flex h-14 w-14 items-center justify-center rounded-full bg-blue-700 text-white shadow-lg shadow-blue-700/30 ring-4 ring-white dark:ring-slate-900">
                      <Icon className="h-6 w-6" />
                    </span>
                  ) : (
                    <span className="relative">
                      <Icon className="h-6 w-6" strokeWidth={isActive ? 2.4 : 1.8} />
                      {badge && unread > 0 && (
                        <span className="absolute -right-2 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                          {unread > 99 ? "99+" : unread}
                        </span>
                      )}
                    </span>
                  )}
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          </li>
          );
        })}
      </ul>
    </nav>
  );
}

// Coquille du client connecté (le visiteur sans compte a GuestLayout, cf. routes/SessionRoutes)
export default function ClientLayout() {
  const status = useClientSession((s) => s.status);
  const offlineSession = useClientSession((s) => s.offline);
  const locked = useClientSession((s) => s.locked);
  const online = useOnline();
  const location = useLocation();
  useClientRealtime();

  if (status === "loading") return <FullPageSpinner />;
  if (status !== "authed") {
    return <Navigate to="/connexion" replace state={{ from: location.pathname + location.search }} />;
  }

  // App verrouillée : aucun contenu (ni bandeau d'alerte) avant le code PIN
  if (locked) return <LockScreen />;

  return (
    <div className="min-h-dvh bg-gray-50 text-gray-900 dark:bg-slate-950 dark:text-gray-100">
      {(!online || offlineSession) && (
        <div className="sticky top-0 z-30 flex items-center justify-center gap-2 bg-gray-800 px-4 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] text-center text-xs font-medium text-white">
          <WifiOff className="h-4 w-4 shrink-0" />
          Hors ligne · dernières données enregistrées sur cet appareil
        </div>
      )}
      <main className="mx-auto max-w-md pb-[calc(6rem+env(safe-area-inset-bottom))]">
        <Outlet />
      </main>
      <BottomNav />
      <Toaster />
    </div>
  );
}
