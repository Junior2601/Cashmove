// layouts/StaffShell.jsx — coquille SPA commune au personnel (admin, semi-admin, agent),
// même langage visuel que l'app client : marque MoveCash, cartes blanches, barre d'icônes en bas sur mobile.
//   ≥ lg : menu latéral regroupé par thème
//   < lg : en-tête + barre d'icônes (l'écran principal au centre) + « Menu » pour le reste
import { useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { LogOut, Grid2x2, X } from 'lucide-react';
import useAuth from '../hooks/useAuth';
import useStaffLive from '../realtime/useStaffLive';
import LiveNotice from '../realtime/LiveNotice';
import logo from '../assets/logo.png';
import { useStaffPushInit } from '../pwa/staffPush';
import { StaffPushBanner, StaffPushToggle } from '../pwa/StaffPushControl';

// Classes Tailwind écrites en entier (le compilateur ne voit pas les noms construits)
const GRID_COLS = { 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4', 5: 'grid-cols-5' };

function Brand({ subtitle }) {
  return (
    <div className="flex items-center gap-3">
      <span className="mc-logo relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-dotted border-yellow-400 bg-blue-700 p-1.5">
        <img src={logo} alt="" className="h-full w-full object-contain" />
      </span>
      <div className="leading-tight">
        <p className="text-lg font-extrabold tracking-tight text-gray-900">
          Move<span className="text-yellow-500">Cash</span>
        </p>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </div>
    </div>
  );
}

// Icône lucide passée en donnée (évite les variables-composants dans les .map)
function NavIcon({ icon, ...props }) {
  const Icon = icon;
  return <Icon {...props} />;
}

function Badge({ count }) {
  if (!count) return null;
  return (
    <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
      {count > 99 ? '99+' : count}
    </span>
  );
}

/**
 * sections : [{ title, items: [{ path, label, icon, live? }] }] — toutes les rubriques
 * bottom   : [{ path, label, icon, central?, live? }] — barre du bas (mobile), 2 à 5 entrées
 * space    : nom de l'espace (« Administration », « Espace agent »…)
 * livePath : page des transactions (pastille effacée en y arrivant, bandeau masqué)
 */
export default function StaffShell({ sections, bottom, space, livePath }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [newTx, setNewTx] = useState(0);

  const onLivePage = location.pathname.startsWith(livePath);
  useStaffPushInit();

  // Nouvelles transactions en direct : pastille tant que l'écran n'a pas été ouvert
  const live = useStaffLive(null, {
    onCreated: () => {
      if (!window.location.pathname.startsWith(livePath)) setNewTx((n) => n + 1);
    },
  });

  // Changement de page : menu fermé, pastille effacée en arrivant sur les transactions
  const [prevPath, setPrevPath] = useState(location.pathname);
  if (prevPath !== location.pathname) {
    setPrevPath(location.pathname);
    setMenuOpen(false);
    if (onLivePage) setNewTx(0);
  }

  const allItems = useMemo(() => sections.flatMap((s) => s.items), [sections]);
  const current = allItems.find((i) => location.pathname.startsWith(i.path)) || allItems[0];
  // « Menu » seulement s'il reste des rubriques hors de la barre du bas
  const needsMenu = allItems.some((i) => !bottom.some((b) => b.path === i.path));
  const inBottom = bottom.some((b) => location.pathname.startsWith(b.path));

  const linkClass = ({ isActive }) =>
    `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
      isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
    }`;

  return (
    <div className="min-h-dvh bg-gray-50 text-gray-900">
      {/* ── Menu latéral (ordinateur) ── */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r border-gray-200 bg-white lg:flex">
        <div className="px-6 pb-4 pt-6">
          <Brand subtitle={space} />
        </div>
        <nav className="flex-1 space-y-6 overflow-y-auto px-4 pb-4" aria-label={space}>
          {sections.map((section) => (
            <div key={section.title}>
              <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">{section.title}</p>
              <div className="space-y-0.5">
                {section.items.map(({ path, label, icon, live: isLive }) => (
                  <NavLink key={path} to={path} className={linkClass}>
                    {({ isActive }) => (
                      <>
                        <NavIcon icon={icon} className={`h-5 w-5 ${isActive ? 'text-blue-700' : 'text-gray-400 group-hover:text-gray-600'}`} />
                        <span className="flex-1">{label}</span>
                        {isLive && <Badge count={newTx} />}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-700 text-sm font-bold text-white">
              {(user?.name || space).slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{user?.name || space}</p>
              <p className="truncate text-xs text-gray-500">{user?.email}</p>
            </div>
            <StaffPushToggle />
            <button type="button" onClick={logout} className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600" aria-label="Se déconnecter" title="Se déconnecter">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── En-tête (mobile) ── */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-200 bg-white/95 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur lg:hidden">
        <div className="flex min-w-0 items-center gap-3">
          <span className="mc-logo relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-dotted border-yellow-400 bg-blue-700 p-1">
            <img src={logo} alt="" className="h-full w-full object-contain" />
          </span>
          <div className="min-w-0 leading-tight">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{space}</p>
            <h1 className="truncate text-lg font-bold">{current.label}</h1>
          </div>
        </div>
        <div className="flex items-center">
          <StaffPushToggle />
          <button type="button" onClick={logout} className="rounded-full p-2 text-gray-500 hover:bg-red-50 hover:text-red-600" aria-label="Se déconnecter">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* ── Contenu ── */}
      <main className="pb-[calc(6rem+env(safe-area-inset-bottom))] lg:ml-72 lg:pb-8">
        <div className="mx-auto max-w-7xl lg:px-4 lg:pt-4">
          <StaffPushBanner />
          <Outlet />
        </div>
      </main>

      {/* ── Barre d'icônes (mobile), comme l'app client ── */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-black/5 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
        aria-label="Navigation principale"
      >
        <ul className={`mx-auto grid max-w-md ${GRID_COLS[bottom.length + (needsMenu ? 1 : 0)]}`}>
          {bottom.map(({ path, label, icon, central, live: isLive }) => (
            <li key={path}>
              <NavLink
                to={path}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 pb-2 pt-1.5 text-[11px] font-medium transition ${isActive ? 'text-blue-700' : 'text-gray-500 hover:text-gray-800'}`
                }
              >
                {({ isActive }) => (
                  <>
                    {central ? (
                      <span className="relative -mt-6 mb-0.5 flex h-14 w-14 items-center justify-center rounded-full bg-blue-700 text-white shadow-lg shadow-blue-700/30 ring-4 ring-white">
                        <NavIcon icon={icon} className="h-6 w-6" />
                        {isLive && newTx > 0 && (
                          <span className="absolute -right-1 -top-1"><Badge count={newTx} /></span>
                        )}
                      </span>
                    ) : (
                      <span className="relative">
                        <NavIcon icon={icon} className="h-6 w-6" strokeWidth={isActive ? 2.4 : 1.8} />
                        {isLive && newTx > 0 && (
                          <span className="absolute -right-2.5 -top-1.5"><Badge count={newTx} /></span>
                        )}
                      </span>
                    )}
                    <span>{label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
          {needsMenu && (
            <li>
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                className={`flex w-full flex-col items-center gap-0.5 pb-2 pt-1.5 text-[11px] font-medium transition ${
                  !inBottom ? 'text-blue-700' : 'text-gray-500 hover:text-gray-800'
                }`}
                aria-haspopup="dialog"
              >
                <Grid2x2 className="h-6 w-6" strokeWidth={1.8} />
                <span>Menu</span>
              </button>
            </li>
          )}
        </ul>
      </nav>

      {/* ── « Menu » : toutes les rubriques (mobile) ── */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex items-end lg:hidden" role="dialog" aria-modal="true" aria-label="Toutes les rubriques">
          <button type="button" className="absolute inset-0 bg-black/40" onClick={() => setMenuOpen(false)} aria-label="Fermer" />
          <div className="relative max-h-[85dvh] w-full overflow-y-auto rounded-t-3xl bg-gray-50 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
            <div className="mb-4 flex items-center justify-between">
              <Brand subtitle={space} />
              <button type="button" onClick={() => setMenuOpen(false)} className="rounded-full p-2 text-gray-500 hover:bg-black/5" aria-label="Fermer">
                <X className="h-5 w-5" />
              </button>
            </div>
            {sections.map((section) => (
              <div key={section.title} className="mb-4">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">{section.title}</p>
                <div className="grid grid-cols-3 gap-2">
                  {section.items.map(({ path, label, icon }) => (
                    <NavLink
                      key={path}
                      to={path}
                      className={({ isActive }) =>
                        `flex flex-col items-center gap-1.5 rounded-2xl p-3 text-center text-xs font-medium ring-1 transition ${
                          isActive ? 'bg-blue-50 text-blue-700 ring-blue-200' : 'bg-white text-gray-700 ring-black/5 hover:bg-gray-100'
                        }`
                      }
                    >
                      <NavIcon icon={icon} className="h-6 w-6" />
                      {label}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nouvelle transaction : bandeau sur toutes les pages (la page des transactions a le sien) */}
      {!onLivePage && <LiveNotice notice={live.notice} onClose={live.dismiss} />}
    </div>
  );
}
