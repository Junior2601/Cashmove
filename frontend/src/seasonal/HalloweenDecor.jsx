// seasonal/HalloweenDecor.jsx — décorations d'Halloween sur tout le site (public, client, back-office)
// Purement décoratif : rien ne capte les clics, rien n'est lu par les lecteurs d'écran
// (sauf le message d'accueil), et tout s'arrête si l'appareil demande moins d'animations.
// Les logos (.mc-logo) reçoivent une citrouille via index.css (html[data-season="halloween"]).
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { isHalloweenSeason, isHalloweenHidden, hideHalloween, shouldGreet, markGreeted } from "./halloween";

// Chauve-souris : silhouette symétrique autour de x = 32
const BAT_PATH =
  "M32 9 L34 4 L35.5 9 Q46 9 60 6 Q55 12 56 19 Q51 15 47 18 Q43 14 39 21 Q36 17 32 20 Q28 17 25 21 Q21 14 17 18 Q13 15 8 19 Q9 12 4 6 Q18 9 28.5 9 L30 4 Z";

function Bat({ className, style }) {
  return (
    <svg viewBox="0 0 64 26" className={className} style={style} fill="currentColor">
      <path d={BAT_PATH} />
    </svg>
  );
}

export function Pumpkin({ className }) {
  return (
    <svg viewBox="0 0 64 64" className={className}>
      <path d="M31 16c0-5 2-9 7-10" stroke="#3f6212" strokeWidth="4" fill="none" strokeLinecap="round" />
      <ellipse cx="21" cy="39" rx="14" ry="19" fill="#ea580c" />
      <ellipse cx="43" cy="39" rx="14" ry="19" fill="#ea580c" />
      <ellipse cx="32" cy="39" rx="13" ry="20" fill="#f97316" />
      <path d="M19 32l7 5h-9z M45 32l-7 5h9z" fill="#431407" />
      <path d="M19 44l4 3 3-2 3 3 3-3 3 3 3-3 3 2 4-3q-13 12-26 0z" fill="#431407" />
    </svg>
  );
}

function Spider() {
  return (
    // Pas sur téléphone : la marge est trop étroite, elle cacherait des boutons
    <div className="mc-spider absolute right-8 hidden flex-col items-center text-slate-800 sm:flex">
      <span className="h-24 w-px bg-slate-400/70 sm:h-32" />
      <svg viewBox="0 0 32 28" className="-mt-1 h-7 w-8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path d="M11 12 4 6 M11 15 2 13 M11 18 3 22 M12 20 6 27 M21 12 28 6 M21 15 30 13 M21 18 29 22 M20 20 26 27" />
        <ellipse cx="16" cy="16" rx="6" ry="7" fill="currentColor" />
        <circle cx="16" cy="8" r="4" fill="currentColor" />
        <circle cx="14.5" cy="7.5" r="1" fill="#f97316" stroke="none" />
        <circle cx="17.5" cy="7.5" r="1" fill="#f97316" stroke="none" />
      </svg>
    </div>
  );
}

function Cobweb({ className }) {
  return (
    <svg viewBox="0 0 120 120" className={className} fill="none" stroke="currentColor" strokeWidth="1">
      <path d="M120 0 0 120 M120 0 30 120 M120 0 70 120 M120 0 120 120 M120 0 0 30 M120 0 0 70" />
      <path d="M96 0q2 14 24 24 M72 0q4 30 48 48 M48 0q6 46 72 72 M24 0q8 62 96 96" />
      <path d="M96 0q-6 12-24 4 M72 0q-10 24-36 12 M48 0q-14 36-48 18" />
    </svg>
  );
}

export default function HalloweenDecor() {
  const [active, setActive] = useState(() => isHalloweenSeason() && !isHalloweenHidden());
  const [greeting, setGreeting] = useState(() => active && shouldGreet());

  // Thème des logos (index.css) tant que les décorations sont visibles
  useEffect(() => {
    if (!active) return undefined;
    document.documentElement.dataset.season = "halloween";
    return () => {
      delete document.documentElement.dataset.season;
    };
  }, [active]);

  // Message d'accueil : une fois par jour, disparaît seul après 9 s
  useEffect(() => {
    if (!greeting) return undefined;
    markGreeted();
    const t = setTimeout(() => setGreeting(false), 9000);
    return () => clearTimeout(t);
  }, [greeting]);

  if (!active) return null;

  return createPortal(
    <>
      <div className="pointer-events-none fixed inset-0 z-[35] overflow-hidden" aria-hidden="true">
        {/* Liseré orange et violet tout en haut */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-500 via-purple-600 to-orange-500" />
        <Cobweb className="absolute right-0 top-0 h-14 w-14 text-slate-400/40 lg:h-28 lg:w-28 lg:text-slate-400/50" />
        <Spider />
        {/* Chauves-souris qui traversent le haut de l'écran de temps en temps */}
        <Bat className="mc-bat h-5 w-12 text-slate-800/80" style={{ top: "18%", animationDelay: "2s" }} />
        <Bat className="mc-bat h-3.5 w-9 text-purple-900/70" style={{ top: "26%", animationDelay: "9s", animationDuration: "26s" }} />
        <Bat className="mc-bat h-4 w-10 text-slate-900/70" style={{ top: "12%", animationDelay: "16s", animationDuration: "30s" }} />
      </div>

      {greeting && (
        <div
          role="status"
          className="fixed left-1/2 top-[calc(env(safe-area-inset-top)+5rem)] z-[65] flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 items-center gap-3 rounded-2xl bg-slate-900 p-3 pr-2 text-white shadow-2xl ring-1 ring-orange-500/40"
        >
          <Pumpkin className="h-11 w-11 shrink-0" />
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-bold text-orange-300">Joyeux Halloween !</p>
            <p className="text-slate-300">Toute l'équipe MoveCash vous souhaite une fête frissonnante.</p>
            <button
              type="button"
              onClick={() => {
                hideHalloween();
                setGreeting(false);
                setActive(false);
              }}
              className="mt-1 text-xs font-semibold text-slate-400 underline underline-offset-2 hover:text-white"
            >
              Masquer les décorations
            </button>
          </div>
          <button type="button" onClick={() => setGreeting(false)} className="self-start rounded-full p-1.5 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Fermer">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </>,
    document.body
  );
}
