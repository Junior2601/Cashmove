// seasonal/halloween.js — quand afficher les décorations d'Halloween
// Du 24 octobre au 1er novembre inclus, chaque année : rien à redéployer pour les retirer.
// VITE_HALLOWEEN=on|off force l'affichage (essais hors saison) ou le coupe.
// Chaque visiteur peut les masquer pour la saison (bouton du message d'accueil).

const HIDDEN_KEY = "mc_halloween_hidden";   // année masquée
const GREETED_KEY = "mc_halloween_greeted"; // jour du dernier message d'accueil

const today = () => new Date().toLocaleDateString("sv"); // AAAA-MM-JJ, heure locale

const storage = {
  get: (k) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k, v) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* navigation privée : sans mémoire, rien de grave */
    }
  },
};

export const isHalloweenSeason = (date = new Date()) => {
  const forced = import.meta.env.VITE_HALLOWEEN;
  if (forced === "on") return true;
  if (forced === "off") return false;
  const m = date.getMonth(); // 9 = octobre, 10 = novembre
  const d = date.getDate();
  return (m === 9 && d >= 24) || (m === 10 && d === 1);
};

export const isHalloweenHidden = () => storage.get(HIDDEN_KEY) === String(new Date().getFullYear());
export const hideHalloween = () => storage.set(HIDDEN_KEY, String(new Date().getFullYear()));

// Message d'accueil : une fois par jour au plus
export const shouldGreet = () => storage.get(GREETED_KEY) !== today();
export const markGreeted = () => storage.set(GREETED_KEY, today());
