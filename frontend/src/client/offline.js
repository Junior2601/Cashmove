// client/offline.js — dernières données consultables hors ligne (cahier V2 · §10)
//
// Copie locale des derniers écrans chargés (accueil, historique, détails, alertes),
// rangée par client et effacée à la déconnexion. Les réponses de l'API ne sont
// jamais mises dans le cache du service worker.
import { useEffect, useState } from "react";

const PREFIX = "mc_offline_";
let owner = null;   // id du client connecté

export const setOfflineOwner = (clientId) => {
  owner = clientId;
};

const key = (name) => `${PREFIX}${owner}_${name}`;

export const saveOffline = (name, data) => {
  if (!owner) return;
  try {
    localStorage.setItem(key(name), JSON.stringify({ at: Date.now(), data }));
  } catch {
    // quota plein ou stockage bloqué : on garde seulement la version en ligne
  }
};

export const loadOffline = (name) => {
  if (!owner) return null;
  try {
    return JSON.parse(localStorage.getItem(key(name)) || "null");
  } catch {
    return null;
  }
};

export const clearOffline = () => {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    // rien à effacer
  }
};

// Erreur réseau (pas de réponse du serveur) ≠ erreur renvoyée par l'API
export const isNetworkError = (err) => !!err && !err.response;

/**
 * Requête avec repli hors ligne.
 * Retourne { data, offlineAt } — offlineAt = date de la copie si hors ligne, sinon null.
 */
export const fetchWithOffline = async (name, request) => {
  try {
    const data = await request();
    saveOffline(name, data);
    return { data, offlineAt: null };
  } catch (err) {
    const cached = isNetworkError(err) ? loadOffline(name) : null;
    if (cached) return { data: cached.data, offlineAt: cached.at };
    throw err;
  }
};

export const useOnline = () => {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
};
