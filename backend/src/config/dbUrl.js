// config/dbUrl.js — lecture de DATABASE_URL, commune au serveur et aux scripts
// Pas de base par défaut : sans DATABASE_URL on s'arrête, plutôt que d'écrire
// en silence dans une autre base.

const readDatabaseUrl = () => {
  const raw = (process.env.DATABASE_URL || "").trim();
  if (!raw) {
    throw new Error("DATABASE_URL manquante : renseignez-la dans backend/.env");
  }
  // « sslmode=… » dans l'URL écraserait le réglage SSL ci-dessous : on le retire
  return raw.replace(/([?&])sslmode=[^&]*(&|$)/, (m, sep, next) => (next ? sep : ""));
};

// PostgreSQL local (localhost) : pas de SSL. Hébergeurs (Render, Neon, …) : SSL.
// DB_SSL=true|false force le choix si besoin.
const useSsl = (url) =>
  process.env.DB_SSL ? process.env.DB_SSL === "true" : !/@(localhost|127\.0\.0\.1)(:\d+)?\//.test(url);

// Ajoute des paramètres à l'URL, qu'elle en ait déjà ou non
const withParams = (url, params) => url + (url.includes("?") ? "&" : "?") + params;

module.exports = { readDatabaseUrl, useSsl, withParams };
