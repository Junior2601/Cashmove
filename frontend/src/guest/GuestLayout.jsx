// guest/GuestLayout.jsx — coquille SPA des visiteurs sans compte (mode invité, TRX-06/07)
// Même langage que l'app client : en-tête MoveCash, barre de 5 icônes en bas,
// bouton « Envoyer » au centre. Le parcours invité reste complet sans compte.
import { Link, NavLink, Outlet } from "react-router-dom";
import { Home, Search, Send, Calculator, Headphones } from "lucide-react";
import logo from "../assets/logo.png";

const TABS = [
  { to: "/", label: "Accueil", icon: Home, end: true },
  { to: "/suivi", label: "Suivre", icon: Search },
  { to: "/envoyer", label: "Envoyer", icon: Send, central: true },
  { to: "/calculatrice", label: "Calculer", icon: Calculator },
  { to: "/aide", label: "Aide", icon: Headphones },
];

function TabIcon({ icon, ...props }) {
  const Icon = icon;
  return <Icon {...props} />;
}

export default function GuestLayout() {
  return (
    <div className="min-h-dvh bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-30 border-b border-black/5 bg-white/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2.5" aria-label="MoveCash, accueil">
            <span className="mc-logo relative flex h-9 w-9 items-center justify-center rounded-full border-2 border-dotted border-yellow-400 bg-blue-700 p-1">
              <img src={logo} alt="" className="h-full w-full object-contain" />
            </span>
            <span className="text-xl font-extrabold tracking-tight">
              Move<span className="text-yellow-500">Cash</span>
            </span>
          </Link>
          <Link to="/connexion" className="rounded-full bg-yellow-400 px-4 py-2 text-sm font-bold text-blue-950 shadow-sm hover:bg-yellow-300">
            Se connecter
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl pb-[calc(6rem+env(safe-area-inset-bottom))]">
        <Outlet />
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-black/5 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
        aria-label="Navigation principale"
      >
        <ul className="mx-auto grid max-w-md grid-cols-5">
          {TABS.map(({ to, label, icon, end, central }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 pb-2 pt-1.5 text-[11px] font-medium transition ${
                    isActive ? "text-blue-700" : "text-gray-500 hover:text-gray-800"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {central ? (
                      <span className="-mt-6 mb-0.5 flex h-14 w-14 items-center justify-center rounded-full bg-blue-700 text-white shadow-lg shadow-blue-700/30 ring-4 ring-white">
                        <TabIcon icon={icon} className="h-6 w-6" />
                      </span>
                    ) : (
                      <TabIcon icon={icon} className="h-6 w-6" strokeWidth={isActive ? 2.4 : 1.8} />
                    )}
                    <span>{label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
