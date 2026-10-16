// pwa/pushCore.js — abonnement Web Push de l'appareil, commun aux clients et au personnel
import { isIos, isStandalone, iosVersion } from "./install";

/**
 * État du push sur cet appareil :
 *   "ok"            possible (permission à demander ou déjà accordée)
 *   "ios-install"   iPhone : il faut d'abord installer l'app (Partager → Sur l'écran d'accueil)
 *   "ios-old"       iOS < 16.4 : pas de notifications web
 *   "denied"        refusé dans les réglages du navigateur
 *   "unsupported"   navigateur sans Web Push
 */
export const pushSupport = () => {
  if (isIos()) {
    const v = iosVersion();
    if (v !== null && v < 16.4) return "ios-old";
    if (!isStandalone()) return "ios-install";
  }
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  return "ok";
};

export const PUSH_HELP = {
  "ios-install": "Sur iPhone, installez d'abord l'app : bouton Partager, puis « Sur l'écran d'accueil » (iOS 16.4 ou plus).",
  "ios-old": "Votre version d'iOS ne permet pas les notifications web (iOS 16.4 minimum).",
  denied: "Les notifications sont bloquées pour MoveCash dans les réglages du navigateur.",
  unsupported: "Ce navigateur ne permet pas les notifications push.",
};

const urlBase64ToUint8Array = (base64) => {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
};

export const getDeviceSubscription = async () => {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    return reg ? await reg.pushManager.getSubscription() : null;
  } catch {
    return null;
  }
};

/**
 * Abonne l'appareil et renvoie la PushSubscription (null si non interactif et
 * permission pas encore accordée). getPublicKey : () => Promise<string>
 */
export const subscribeDevice = async (getPublicKey, { interactive = true } = {}) => {
  if (pushSupport() !== "ok") throw new Error(PUSH_HELP[pushSupport()]);
  if (Notification.permission !== "granted") {
    if (!interactive) return null;
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      throw new Error(permission === "denied" ? PUSH_HELP.denied : "Autorisation non accordée");
    }
  }

  const reg = await navigator.serviceWorker?.getRegistration();
  if (!reg) throw new Error("Notifications disponibles dans l'application installée");
  const key = urlBase64ToUint8Array(await getPublicKey());

  let sub = await reg.pushManager.getSubscription();
  try {
    sub ||= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
  } catch {
    // Abonnement créé avec une autre clé serveur : on le remplace
    try {
      await sub?.unsubscribe();
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
    } catch {
      // Service push du navigateur injoignable ou refusé (navigation privée, réseau…)
      throw new Error("Le navigateur n'a pas pu activer les notifications. Réessayez plus tard, ou depuis l'app installée.");
    }
  }
  return sub;
};
