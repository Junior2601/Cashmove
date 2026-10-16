// utils/phone.js
// Normalisation et masquage des numéros de téléphone (cahier V2 · NUM-04)

// Garde uniquement les chiffres d'un numéro local saisi ("06 12-34" → "061234")
const cleanLocalNumber = (raw) => String(raw || "").replace(/\D/g, "");

// Construit le format international E.164 à partir de l'indicatif du pays.
// Un 0 initial est conservé (Côte d'Ivoire, Bénin… l'utilisent dans le numéro).
const toE164 = (phonePrefix, localNumber) => {
  const prefix = String(phonePrefix || "").replace(/[^\d+]/g, "");
  let local = cleanLocalNumber(localNumber);
  // Indicatif déjà saisi ("+225 07…" ou "00225 07…") : on le retire
  const raw = String(localNumber || "").trim();
  const prefixDigits = prefix.slice(1);
  if (raw.startsWith("+") && local.startsWith(prefixDigits)) local = local.slice(prefixDigits.length);
  else if (raw.startsWith("00") && local.startsWith("00" + prefixDigits)) local = local.slice(prefixDigits.length + 2);
  if (!prefix.startsWith("+") || local.length < 6 || local.length > 12) return null;
  const full = prefix + local;
  return /^\+[0-9]{6,15}$/.test(full) ? full : null;
};

// Premier chiffre + points + 3 derniers chiffres, groupés par 3 depuis la droite :
// "612345412" → "6•• ••• 412", "9161234567" → "9 ••• ••• 567"
const groupMasked = (local) => {
  const masked = local[0] + "•".repeat(local.length - 4) + local.slice(-3);
  const groups = [];
  for (let end = masked.length; end > 0; end -= 3) groups.unshift(masked.slice(Math.max(0, end - 3), end));
  return groups.join(" ");
};

// "+237612345412" → "+237 6•• ••• 412"
const maskPhone = (phone, phonePrefix = null) => {
  if (!phone) return phone;
  let prefix = phonePrefix || "";
  let local = String(phone);
  if (prefix && local.startsWith(prefix)) local = local.slice(prefix.length);
  else if (!prefix && local.startsWith("+")) {
    // Sans indicatif connu : on garde le "+" et 3 chiffres
    prefix = local.slice(0, 4);
    local = local.slice(4);
  }
  local = cleanLocalNumber(local);
  if (local.length <= 4) return `${prefix} ${local}`.trim();
  return `${prefix} ${groupMasked(local)}`.trim();
};

module.exports = { cleanLocalNumber, toE164, maskPhone };
