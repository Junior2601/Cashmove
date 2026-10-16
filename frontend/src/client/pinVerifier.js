// client/pinVerifier.js — vérification du PIN quand l'app s'ouvre hors ligne
//
// En ligne, le PIN est toujours vérifié par le serveur (5 essais, puis sessions
// fermées). Hors ligne, le serveur est injoignable : on compare à une empreinte
// PBKDF2 enregistrée sur l'appareil après une vérification réussie en ligne.
// Elle n'ouvre que les données déjà présentes sur l'appareil, et disparaît à la
// déconnexion ou après 5 essais ratés.
const KEY = "mc_pin_verifier";
const ITERATIONS = 100000;
export const LOCAL_MAX_ATTEMPTS = 5;

const toB64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

const derive = async (pin, salt) => {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(String(pin)), "PBKDF2", false, ["deriveBits"]);
  return crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" }, key, 256);
};

const read = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "null");
  } catch {
    return null;
  }
};

const write = (value) => {
  try {
    if (value) localStorage.setItem(KEY, JSON.stringify(value));
    else localStorage.removeItem(KEY);
  } catch {
    // stockage indisponible : pas de déverrouillage hors ligne
  }
};

export const savePinVerifier = async (clientId, pin) => {
  if (!crypto?.subtle) return;
  const salt = crypto.getRandomValues(new Uint8Array(16));
  write({ clientId, salt: toB64(salt), hash: toB64(await derive(pin, salt)), failures: 0 });
};

export const clearPinVerifier = () => write(null);

export const hasPinVerifier = (clientId) => read()?.clientId === clientId;

/** Retourne { valid, attempts_left } ; attempts_left = 0 → il faut fermer la session */
export const verifyPinLocally = async (clientId, pin) => {
  const v = read();
  if (!v || v.clientId !== clientId || !crypto?.subtle) return { valid: false, attempts_left: 0 };
  const hash = toB64(await derive(pin, fromB64(v.salt)));
  if (hash === v.hash) {
    write({ ...v, failures: 0 });
    return { valid: true, attempts_left: LOCAL_MAX_ATTEMPTS };
  }
  const failures = (v.failures || 0) + 1;
  write({ ...v, failures });
  return { valid: false, attempts_left: Math.max(LOCAL_MAX_ATTEMPTS - failures, 0) };
};
