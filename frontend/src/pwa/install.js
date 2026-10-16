// pwa/install.js — installation sur l'écran d'accueil (cahier V2 · §10)
//   Android / Chrome / Edge : bannière personnalisée (beforeinstallprompt)
//   iPhone / iPad (Safari)  : pas d'API, on guide « Partager → Sur l'écran d'accueil »
import { create } from "zustand";

const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";

export const isIos = () =>
  /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

export const isStandalone = () =>
  window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;

// Version d'iOS (Web Push n'existe qu'à partir de 16.4, et seulement app installée)
export const iosVersion = () => {
  const m = ua.match(/OS (\d+)_(\d+)/);
  return m ? parseFloat(`${m[1]}.${m[2]}`) : null;
};

const DISMISS_KEY = "mc_install_dismissed";
const readDismissed = () => {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
};

export const useInstall = create((set, get) => ({
  promptEvent: null,
  installed: typeof window !== "undefined" && isStandalone(),
  dismissed: readDismissed(),

  // Peut-on proposer l'installation sur cet appareil ?
  canInstall: () => !get().installed && (!!get().promptEvent || isIos()),

  install: async () => {
    const event = get().promptEvent;
    if (!event) return false;
    event.prompt();
    const { outcome } = await event.userChoice;
    set({ promptEvent: null });
    return outcome === "accepted";
  },

  dismiss: () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // stockage indisponible : la bannière reviendra à la prochaine visite
    }
    set({ dismissed: true });
  },
}));

// À l'écoute dès le chargement : l'événement peut arriver avant le montage des écrans
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // on affiche notre propre bannière
    useInstall.setState({ promptEvent: e });
  });
  window.addEventListener("appinstalled", () => {
    useInstall.setState({ installed: true, promptEvent: null });
  });
}
