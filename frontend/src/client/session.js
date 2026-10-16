// client/session.js — session du client connecté (zustand)
import { create } from "zustand";
import clientApi, { setAccessToken, refreshSession, onClientSessionLost, onClientServerReachable } from "./api";
import { setOfflineOwner, clearOffline, isNetworkError } from "./offline";
import { enablePush, disablePush } from "./push";
import { clearPinVerifier } from "./pinVerifier";

// Retour au premier plan après ce délai en arrière-plan → écran PIN (CPT-03)
export const LOCK_AFTER_MS = 2 * 60 * 1000;

// Profil gardé localement pour ouvrir l'app hors ligne (§10), effacé à la déconnexion
const PROFILE_KEY = "mc_offline_profile";
const saveProfile = (client) => {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(client));
  } catch {
    // stockage indisponible : pas de mode hors ligne, sans autre conséquence
  }
};
const loadProfile = () => {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY) || "null");
  } catch {
    return null;
  }
};

// Tant que la session est hors ligne, nouvel essai régulier (réseau instable, portail Wi-Fi…)
const RETRY_MS = 10000;
let retryTimer = null;
const stopRetry = () => {
  clearInterval(retryTimer);
  retryTimer = null;
};
const startRetry = () => {
  stopRetry();
  retryTimer = setInterval(() => useClientSession.getState().reconnect(), RETRY_MS);
};

// Appareil déjà autorisé : on rattache son abonnement push au client connecté
const syncPush = (client) => {
  if (client?.push_enabled) enablePush({ interactive: false }).catch(() => {});
};

export const useClientSession = create((set, get) => ({
  // "loading" au démarrage, puis "authed" ou "guest"
  status: "loading",
  client: null,
  unreadCount: 0,
  offline: false,   // session reprise sans réseau (données locales)
  locked: false,    // écran PIN affiché (à l'ouverture de l'app, ou après une absence)

  // Au chargement de l'app : on tente de reprendre la session via le cookie
  bootstrap: async () => {
    if (get().status !== "loading") return;
    try {
      const data = await refreshSession();
      // Ouverture de l'app : PIN demandé si le client en a un
      get().login(data, { lock: !!data.client.has_pin });
    } catch (err) {
      const cached = loadProfile();
      if (isNetworkError(err) && cached) {
        setOfflineOwner(cached.id);
        set({ status: "authed", client: cached, offline: true, locked: !!cached.has_pin });
        startRetry();
      } else {
        set({ status: "guest", client: null });
      }
    }
  },

  // Retour du réseau après un démarrage hors ligne
  reconnect: async () => {
    if (!get().offline) return;
    try {
      const data = await refreshSession();
      get().login(data);
    } catch (err) {
      if (!isNetworkError(err)) get().endSession();
    }
  },

  // lock : afficher l'écran PIN. Une connexion par e-mail ne verrouille pas (identité
  // déjà prouvée) ; une reprise de session garde l'écran s'il était affiché.
  login: ({ access_token, client }, { lock = false } = {}) => {
    stopRetry();
    setAccessToken(access_token);
    setOfflineOwner(client.id);
    saveProfile(client);
    const locked = !!client.has_pin && (lock || get().locked);
    set({ status: "authed", client, offline: false, locked });
    get().refreshUnread();
    syncPush(client);
  },

  unlock: () => set({ locked: false }),

  lock: () => {
    if (get().status === "authed" && get().client?.has_pin) set({ locked: true });
  },

  setClient: (client) => {
    saveProfile(client);
    set({ client });
  },

  endSession: () => {
    stopRetry();
    clearPinVerifier();
    setAccessToken(null);
    setOfflineOwner(null);
    clearOffline();
    try {
      localStorage.removeItem(PROFILE_KEY);
    } catch {
      // déjà vide
    }
    set({ status: "guest", client: null, unreadCount: 0, offline: false, locked: false });
  },

  logout: async () => {
    // Cet appareil ne doit plus recevoir les notifications de ce compte
    await disablePush().catch(() => {});
    try {
      await clientApi.post("auth/logout");
    } catch {
      // on déconnecte localement même si le serveur ne répond pas
    }
    get().endSession();
  },

  setUnreadCount: (unreadCount) => set({ unreadCount }),

  refreshUnread: async () => {
    try {
      const res = await clientApi.get("me/notifications", { params: { limit: 1 } });
      set({ unreadCount: res.data.data.unread_count });
    } catch {
      // non bloquant
    }
  },
}));

onClientSessionLost(() => useClientSession.getState().endSession());
onClientServerReachable(() => useClientSession.getState().reconnect());

if (typeof window !== "undefined") {
  window.addEventListener("online", () => useClientSession.getState().reconnect());

  // App en arrière-plan trop longtemps → PIN redemandé au retour
  let hiddenAt = null;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      hiddenAt = Date.now();
    } else if (hiddenAt && Date.now() - hiddenAt >= LOCK_AFTER_MS) {
      useClientSession.getState().lock();
      hiddenAt = null;
    }
  });
}
