// client/api.js — instance axios de l'espace client (V2)
//
// Séparée de api/axios.js (back-office) : le jeton client vit en mémoire
// (15 min) et se renouvelle via le cookie HttpOnly mc_refresh (30 jours).
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "https://api.movecash.site/api/";

let accessToken = null;
let onSessionLost = () => {};
let onServerReachable = () => {};
let refreshPromise = null;

export const setAccessToken = (token) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;

export const onClientSessionLost = (fn) => {
  onSessionLost = fn;
};

// Appelé à chaque réponse du serveur : permet de quitter le mode hors ligne même
// si le navigateur n'a pas signalé le retour du réseau (événement « online » manqué)
export const onClientServerReachable = (fn) => {
  onServerReachable = fn;
};

const clientApi = axios.create({ baseURL: BASE_URL, withCredentials: true });

clientApi.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// Un seul refresh à la fois, partagé par toutes les requêtes en échec
export const refreshSession = () => {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${BASE_URL}auth/refresh`, null, { withCredentials: true })
      .then((res) => {
        setAccessToken(res.data.data.access_token);
        return res.data.data;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

// Jeton expiré → on renouvelle une fois puis on rejoue la requête
clientApi.interceptors.response.use(
  (res) => {
    onServerReachable();
    return res;
  },
  async (error) => {
    const original = error.config;
    const isAuthRoute = original?.url?.startsWith("auth/");
    if (error.response?.status === 401 && original && !original._retried && !isAuthRoute) {
      original._retried = true;
      try {
        await refreshSession();
        return clientApi(original);
      } catch {
        setAccessToken(null);
        onSessionLost();
      }
    }
    return Promise.reject(error);
  }
);

// Message d'erreur lisible depuis une réponse de l'API
export const apiError = (err, fallback = "Une erreur est survenue") =>
  err?.response?.data?.message || (err?.request && !err?.response ? "Pas de connexion internet" : fallback);

export default clientApi;
