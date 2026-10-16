// pwa/register.js — enregistrement du service worker et détection des mises à jour
// (cahier V2 · §10 « Nouvelle version détectée par le service worker »)
import { create } from "zustand";

export const useAppUpdate = create((set) => ({
  waiting: null, // service worker en attente = nouvelle version prête
  setWaiting: (waiting) => set({ waiting }),
}));

// Rechargement uniquement après un clic sur « Mettre à jour ». À la toute première
// visite, le service worker prend aussi la main (clients.claim) : sans ce drapeau,
// la page se rechargerait pendant que le visiteur tape.
let updateRequested = false;

// Active la nouvelle version ; la page se recharge quand elle prend la main
export const applyUpdate = () => {
  const worker = useAppUpdate.getState().waiting;
  if (!worker) return;
  updateRequested = true;
  worker.postMessage({ type: "SKIP_WAITING" });
};

export function registerServiceWorker() {
  // En développement, pas de service worker : il masquerait les modifications
  if (!("serviceWorker" in navigator) || !import.meta.env.PROD) return;

  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      const { setWaiting } = useAppUpdate.getState();

      // Une mise à jour déjà téléchargée lors d'une visite précédente
      if (reg.waiting && navigator.serviceWorker.controller) setWaiting(reg.waiting);

      reg.addEventListener("updatefound", () => {
        const worker = reg.installing;
        worker?.addEventListener("statechange", () => {
          // « installed » avec un contrôleur existant = mise à jour (pas 1re installation)
          if (worker.state === "installed" && navigator.serviceWorker.controller) setWaiting(worker);
        });
      });

      // L'app peut rester ouverte des heures : on vérifie régulièrement
      setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
    } catch (err) {
      console.warn("Service worker non enregistré :", err.message);
    }
  });

  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!updateRequested || reloading) return;
    reloading = true;
    window.location.reload();
  });

  // Clic sur une notification quand l'app est déjà ouverte en arrière-plan
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data?.type === "NAVIGATE" && event.data.link) window.location.assign(event.data.link);
  });
}
