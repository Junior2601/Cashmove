// client/format.js — mise en forme partagée par les écrans clients

// Statuts du back-office → libellés et pastilles du cahier V2 (§5)
// jaune en attente, bleu en cours, vert terminée, rouge échouée
export const STATUS = {
  en_attente: { label: "En attente", tone: "yellow" },
  validee:    { label: "En cours",   tone: "blue" },
  effectuee:  { label: "Terminée",   tone: "green" },
  echouee:    { label: "Échouée",    tone: "red" },
  annulee:    { label: "Annulée",    tone: "red" },
  expiree:    { label: "Expirée",    tone: "gray" },
};

export const statusInfo = (status) => STATUS[status] || { label: status, tone: "gray" };

export const formatAmount = (value, currency) => {
  const n = Number(value);
  if (!isFinite(n)) return "—";
  const text = n.toLocaleString("fr-FR", {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return currency ? `${text} ${currency}` : text;
};

export const formatRate = (value) =>
  Number(value).toLocaleString("fr-FR", { maximumFractionDigits: 4 });

// Les dates arrivent sans fuseau ("2026-10-15 09:42:00") : heure de Nairobi (UTC+3)
export const parseDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  const s = String(value);
  return new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? s : s.replace(" ", "T") + "+03:00");
};

export const formatDateTime = (value) => {
  const d = parseDate(value);
  if (!d || isNaN(d)) return "";
  return d.toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};

export const formatTime = (value) => {
  const d = parseDate(value);
  if (!d || isNaN(d)) return "";
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
};

// "Aujourd'hui" / "Hier" / "Cette semaine" / "15 oct."
export const dayGroup = (value) => {
  const d = parseDate(value);
  if (!d || isNaN(d)) return "";
  const today = new Date();
  const startOf = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOf(today) - startOf(d)) / 86400000);
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return "Hier";
  if (diffDays < 7) return "Cette semaine";
  return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
};

export const isExpired = (value) => {
  const d = parseDate(value);
  return !!d && d.getTime() < Date.now();
};

export const initials = (name = "") =>
  name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() || "").join("") || "?";

// Couleur d'avatar stable pour un même nom
const AVATAR_COLORS = ["bg-sky-500", "bg-orange-500", "bg-violet-500", "bg-emerald-500", "bg-pink-500", "bg-amber-500"];
export const avatarColor = (name = "") => {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
};

// "+2250712345412" → "+225 0•• ••• •41 2" (NUM-04) — le serveur fournit aussi phone_masked
export const maskPhone = (phone, prefix = "") => {
  if (!phone) return "";
  let local = String(phone);
  if (prefix && local.startsWith(prefix)) local = local.slice(prefix.length);
  local = local.replace(/\D/g, "");
  if (local.length <= 4) return `${prefix} ${local}`.trim();
  // Groupes de 3 depuis la droite, comme le serveur : "6•• ••• 412", "9 ••• ••• 567"
  const masked = local[0] + "•".repeat(local.length - 4) + local.slice(-3);
  const groups = [];
  for (let end = masked.length; end > 0; end -= 3) groups.unshift(masked.slice(Math.max(0, end - 3), end));
  return `${prefix} ${groups.join(" ")}`.trim();
};

export const countryFlag = (countryName) => {
  if (!countryName) return "/flags/default.png";
  const clean = countryName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  return `/flags/${clean}.png`;
};

export const methodLogo = (methodName) => {
  if (!methodName) return "/payment-methods/default.png";
  const map = {
    "orange money": "/payment-methods/orange-money.png",
    "mtn money": "/payment-methods/mtn-money.png",
    wave: "/payment-methods/wave.png",
    "airtel money": "/payment-methods/airtel-money.png",
    momo: "/payment-methods/momo.png",
    "alpha bank": "/payment-methods/alpha-bank.png",
    sberbank: "/payment-methods/sberbank.png",
    tinkoff: "/payment-methods/tinkoff.png",
  };
  const n = methodName.toLowerCase();
  return map[n] || `/payment-methods/${n.replace(/\s+/g, "-")}.png`;
};
