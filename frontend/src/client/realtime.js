// client/realtime.js — Socket.IO de l'espace client (cahier V2 · NOT-01, NOT-03)
//
// Le hook useClientRealtime() (monté dans ClientLayout) ouvre la connexion et
// relaie les événements aux écrans via des événements DOM « mc:* » :
//   mc:transaction  { id, tracking_code, from_status, to_status, at }
//   mc:notification { notification, unread_count }
//   mc:rates        [taux actifs]
//   mc:resync       retour en ligne : les écrans rechargent leurs données
import { useEffect, useRef } from "react";
import { createSocket } from "../realtime/socket";
import { getAccessToken, refreshSession } from "./api";
import { useClientSession } from "./session";
import { useToasts } from "./toasts";

const emit = (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail }));

// Abonnement d'un écran à un événement mc:*
export const useLiveEvent = (name, handler) => {
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });
  useEffect(() => {
    const listener = (e) => ref.current(e.detail);
    window.addEventListener(name, listener);
    return () => window.removeEventListener(name, listener);
  }, [name]);
};

// Petit « ding » (réglage Son) sans fichier audio
const playDing = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
    osc.onended = () => ctx.close();
  } catch {
    // audio indisponible (navigateur, autoplay) : sans importance
  }
};

const toneFor = (n) => {
  const status = n.data?.to_status;
  if (status === "effectuee") return "success";
  if (["echouee", "annulee", "expiree"].includes(status)) return "error";
  return "info";
};

export function useClientRealtime() {
  const status = useClientSession((s) => s.status);
  const offline = useClientSession((s) => s.offline);

  useEffect(() => {
    // Session reprise hors ligne : pas de jeton, on attend le retour du réseau
    if (status !== "authed" || offline) return;

    const socket = createSocket(getAccessToken);
    let wasDisconnected = false;
    let refreshTried = false;

    socket.on("connect", async () => {
      refreshTried = false;
      if (!wasDisconnected) return;
      // Retour en ligne : récupère par l'API ce qui a été manqué (§7)
      const session = useClientSession.getState();
      const before = session.unreadCount;
      await session.refreshUnread();
      const missed = useClientSession.getState().unreadCount - before;
      if (missed > 0) {
        useToasts.getState().push({
          title: missed > 1 ? `${missed} nouvelles alertes` : "1 nouvelle alerte",
          body: "Reçues pendant que vous étiez hors ligne",
          link: "/notifications",
        });
      }
      emit("mc:resync");
    });

    socket.on("disconnect", () => {
      wasDisconnected = true;
    });

    // Jeton d'accès expiré (15 min) : on le renouvelle puis on se reconnecte
    socket.on("connect_error", async (err) => {
      if (err.message !== "unauthorized" || refreshTried) return;
      refreshTried = true;
      try {
        await refreshSession();
        socket.connect();
      } catch {
        // session perdue : l'intercepteur de l'API ramènera à l'écran de connexion
      }
    });

    socket.on("transaction:status", (payload) => emit("mc:transaction", payload));
    socket.on("rates:update", (rates) => emit("mc:rates", rates));

    socket.on("notification:new", ({ notification, unread_count }) => {
      useClientSession.getState().setUnreadCount(unread_count);
      useToasts.getState().push({
        title: notification.title,
        body: notification.body,
        link: notification.link || "/notifications",
        tone: toneFor(notification),
      });
      if (useClientSession.getState().client?.sound_enabled) playDing();
      emit("mc:notification", { notification, unread_count });
    });

    return () => {
      socket.disconnect();
    };
  }, [status, offline]);
}
