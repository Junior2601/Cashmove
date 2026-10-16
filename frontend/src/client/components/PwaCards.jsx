// client/components/PwaCards.jsx — invitations sur l'accueil :
//   - installer l'app (Android : bouton ; iPhone : mode d'emploi)  (§10)
//   - activer les notifications push                                (NOT-02)
import { useState } from "react";
import { BellRing, Download, Share, SquarePlus, X } from "lucide-react";
import { useInstall, isIos } from "../../pwa/install";
import { pushSupport, enablePush } from "../push";
import { useClientSession } from "../session";

const PUSH_DISMISS_KEY = "mc_push_prompt_dismissed";
const read = (k) => {
  try {
    return localStorage.getItem(k) === "1";
  } catch {
    return false;
  }
};
const remember = (k) => {
  try {
    localStorage.setItem(k, "1");
  } catch {
    // stockage indisponible : sans conséquence
  }
};

function Card({ icon: Icon, title, children, onClose }) {
  const IconCmp = Icon;
  return (
    <div className="relative flex gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
        <IconCmp className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1 pr-6">
        <p className="font-semibold text-gray-900 dark:text-white">{title}</p>
        {children}
      </div>
      <button type="button" onClick={onClose} className="absolute right-2 top-2 rounded-full p-1.5 text-gray-400 hover:bg-black/5" aria-label="Plus tard">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function InstallCard() {
  const { promptEvent, installed, dismissed, install, dismiss } = useInstall();
  if (installed || dismissed || (!promptEvent && !isIos())) return null;

  if (promptEvent) {
    return (
      <Card icon={Download} title="Installer MoveCash" onClose={dismiss}>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Accès en un geste depuis l'écran d'accueil, et alertes même app fermée.</p>
        <button type="button" onClick={install} className="mt-3 rounded-full bg-blue-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-800">
          Installer
        </button>
      </Card>
    );
  }

  return (
    <Card icon={SquarePlus} title="Installer MoveCash sur votre iPhone" onClose={dismiss}>
      <ol className="mt-1 space-y-1 text-sm text-gray-600 dark:text-gray-300">
        <li className="flex items-center gap-1.5">
          1. Touchez <Share className="inline h-4 w-4 text-blue-600" aria-label="Partager" /> en bas de Safari
        </li>
        <li>2. Choisissez « Sur l'écran d'accueil »</li>
      </ol>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Nécessaire sur iPhone pour recevoir les notifications.</p>
    </Card>
  );
}

export function PushCard() {
  const client = useClientSession((s) => s.client);
  const [hidden, setHidden] = useState(() => read(PUSH_DISMISS_KEY));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (hidden || !client?.push_enabled || pushSupport() !== "ok" || Notification.permission !== "default") return null;

  const close = () => {
    remember(PUSH_DISMISS_KEY);
    setHidden(true);
  };

  const activate = async () => {
    setBusy(true);
    setError("");
    try {
      await enablePush();
      setHidden(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card icon={BellRing} title="Soyez prévenu quand l'argent arrive" onClose={close}>
      <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Une notification à chaque étape de vos transferts, même app fermée.</p>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      <button type="button" onClick={activate} disabled={busy} className="mt-3 rounded-full bg-blue-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50">
        Activer les notifications
      </button>
    </Card>
  );
}
