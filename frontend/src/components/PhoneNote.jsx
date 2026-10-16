// components/PhoneNote.jsx — note affichée sous un champ de numéro pendant la saisie
//   1. un commentaire selon le rôle du numéro (qui paie, qui reçoit…)
//   2. l'état de la saisie : format attendu, chiffres saisis, début incorrect, numéro complet
// Utilisé par les formulaires invité, client, agent et admin.
import { Info, CheckCircle2, AlertTriangle } from "lucide-react";
import { describePhoneInput } from "../utils/phoneValidator";

const ROLE_NOTES = {
  sender: (m) => `Le numéro ${m ? `${m} ` : ""}depuis lequel vous payez.`,
  receiver: (m) =>
    `Le numéro ${m ? `${m} ` : ""}qui recevra l'argent. Vérifiez-le avec le bénéficiaire : un envoi sur un mauvais numéro est difficile à récupérer.`,
  account: (m) => `Votre numéro ${m ? `${m} ` : ""}: il sera pré-rempli à chaque envoi.`,
  beneficiary: (m) => `Le numéro ${m ? `${m} ` : ""}de votre proche, sur lequel il recevra l'argent.`,
  self: () => "Facultatif. Sert à pré-remplir votre premier numéro d'envoi ; il n'est pas vérifié.",
  "client-sender": (m) => `Le numéro ${m ? `${m} ` : ""}du client qui paie.`,
  "client-receiver": (m) => `Le numéro ${m ? `${m} ` : ""}du bénéficiaire. Relisez-le avec le client avant de valider.`,
  authorized: (m) => `Le numéro ${m ? `${m} ` : ""}sur lequel les clients paient cet agent. Il leur est affiché tel quel.`,
};

const TONES = {
  light: {
    note: "text-gray-500",
    info: "text-gray-500",
    ok: "text-emerald-700",
    warn: "text-amber-700",
    error: "text-red-600",
  },
  dark: {
    note: "text-blue-200",
    info: "text-blue-200",
    ok: "text-emerald-300",
    warn: "text-yellow-200",
    error: "text-red-200",
  },
};

/**
 * prefix  : indicatif du pays choisi (« +225 »), absent si aucun pays n'est choisi
 * value   : saisie actuelle
 * role    : clé de ROLE_NOTES
 * method  : moyen de paiement (« Orange Money »), pour un commentaire précis
 * variant : "light" (fond clair) ou "dark" (écran de connexion bleu)
 * id      : à relier au champ avec aria-describedby
 */
export default function PhoneNote({ prefix, value, role, method, variant = "light", id, className = "" }) {
  const tone = TONES[variant] || TONES.light;
  const roleNote = ROLE_NOTES[role]?.(method);

  let status;
  if (!prefix) {
    status = { kind: "info", text: "Choisissez d'abord le pays : le format du numéro en dépend." };
  } else {
    const d = describePhoneInput(value, prefix);
    const kind =
      d.state === "valid" || d.state === "prefix"
        ? "ok"
        : d.state === "wrong-start" || d.state === "too-long" || d.state === "invalid"
          ? "error"
          : d.state === "typing"
            ? "warn"
            : "info";
    status = { kind, text: d.text };
  }

  const Icon = status.kind === "ok" ? CheckCircle2 : status.kind === "error" ? AlertTriangle : Info;

  return (
    <div id={id} className={`mt-1.5 space-y-0.5 text-xs leading-relaxed ${className}`}>
      {roleNote && <p className={tone.note}>{roleNote}</p>}
      <p className={`flex items-start gap-1.5 ${tone[status.kind]}`} aria-live="polite">
        <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{status.text}</span>
      </p>
    </div>
  );
}
