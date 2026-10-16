// realtime/socket.js — connexion Socket.IO partagée par l'espace client,
// le suivi invité et le back-office (cahier V2 · §7)
import { io } from "socket.io-client";

// Même serveur que l'API : "https://api.movecash.site/api/" → "https://api.movecash.site"
// URL relative ("/api/" en dev) → même origine que la page (proxy Vite)
const API_URL = import.meta.env.VITE_API_URL || "https://api.movecash.site/api/";
const SOCKET_URL = /^https?:\/\//.test(API_URL) ? new URL(API_URL).origin : undefined;

/**
 * getToken : () => string | null — lu à chaque (re)connexion, donc toujours à jour
 */
export const createSocket = (getToken = () => null) =>
  io(SOCKET_URL, {
    withCredentials: true,
    auth: (cb) => {
      const token = getToken();
      cb(token ? { token } : {});
    },
  });
