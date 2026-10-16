// pwa/staffPush.js — notifications push du personnel (admins, semi-admins, agents)
// Elles remplacent les e-mails « nouvelle transaction » et « redirection ».
import { useEffect } from "react";
import { create } from "zustand";
import api from "../api/axios";
import { pushSupport, getDeviceSubscription, subscribeDevice } from "./pushCore";

const publicKey = async () => (await api.get("push/public-key")).data.data.public_key;

export const useStaffPush = create((set) => ({
  support: "ok",
  subscribed: null,   // null = vérification en cours
  busy: false,
  error: "",

  // Au chargement de l'espace : état réel de cet appareil pour ce compte.
  // Permission déjà accordée → abonnement rétabli sans rien demander.
  init: async () => {
    const support = pushSupport();
    set({ support, error: "" });
    if (support !== "ok") return set({ subscribed: false });
    try {
      const sub = await getDeviceSubscription();
      if (sub) {
        const res = await api.post("push/staff/status", { endpoint: sub.endpoint });
        if (res.data.data.subscribed) return set({ subscribed: true });
      }
      if (Notification.permission === "granted") {
        const fresh = await subscribeDevice(publicKey, { interactive: false });
        if (fresh) {
          await api.post("push/staff/subscribe", fresh.toJSON());
          return set({ subscribed: true });
        }
      }
      set({ subscribed: false });
    } catch {
      set({ subscribed: false });
    }
  },

  enable: async () => {
    set({ busy: true, error: "" });
    try {
      const sub = await subscribeDevice(publicKey);
      await api.post("push/staff/subscribe", sub.toJSON());
      set({ subscribed: true });
    } catch (err) {
      set({ error: err.response?.data?.message || err.message, support: pushSupport() });
    } finally {
      set({ busy: false });
    }
  },

  disable: async () => {
    set({ busy: true, error: "" });
    try {
      await disableStaffPush();
      set({ subscribed: false });
    } finally {
      set({ busy: false });
    }
  },
}));

// À monter une fois par espace (layout) : vérifie l'état de l'appareil
export const useStaffPushInit = () => {
  const init = useStaffPush((s) => s.init);
  useEffect(() => {
    init();
  }, [init]);
};

// Retire cet appareil des notifications de ce compte (réglage ou déconnexion).
// L'abonnement du navigateur est gardé : il peut servir à un autre compte.
export const disableStaffPush = async () => {
  const sub = await getDeviceSubscription();
  if (!sub) return;
  await api.delete("push/staff/subscribe", { data: { endpoint: sub.endpoint } }).catch(() => {});
};
