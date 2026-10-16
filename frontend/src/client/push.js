// client/push.js — notifications push du client sur cet appareil (cahier V2 · NOT-02)
import clientApi from "./api";
import { pushSupport, PUSH_HELP, getDeviceSubscription, subscribeDevice } from "../pwa/pushCore";

export { pushSupport, PUSH_HELP, getDeviceSubscription };

const publicKey = async () => (await clientApi.get("push/public-key")).data.data.public_key;

// interactive=false : seulement si la permission est déjà accordée (aucune fenêtre)
export const enablePush = async ({ interactive = true } = {}) => {
  const sub = await subscribeDevice(publicKey, { interactive });
  if (!sub) return false;
  await clientApi.post("push/subscribe", sub.toJSON());
  return true;
};

// Désactivation sur cet appareil pour ce client (réglage ou déconnexion).
// L'abonnement du navigateur est conservé s'il sert aussi à un compte du personnel.
export const disablePush = async () => {
  const sub = await getDeviceSubscription();
  if (!sub) return;
  await clientApi.delete("push/subscribe", { data: { endpoint: sub.endpoint } }).catch(() => {});
};
