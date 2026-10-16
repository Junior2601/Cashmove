// pwa/StaffPushControl.jsx — activation des notifications push dans le back-office
//   <StaffPushBanner />  invitation en haut des pages tant que l'appareil n'est pas abonné
//   <StaffPushToggle />  bouton cloche (activer / couper sur cet appareil)
import { useState } from "react";
import { Bell, BellOff, BellRing, Loader2, X } from "lucide-react";
import { useStaffPush } from "./staffPush";
import { PUSH_HELP } from "./pushCore";

const DISMISS_KEY = "mc_staff_push_dismissed";
const isDismissed = () => {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
};

export function StaffPushBanner({ className = "mx-4 mt-4 lg:mx-0" }) {
  const { support, subscribed, busy, error, enable } = useStaffPush();
  const [hidden, setHidden] = useState(isDismissed);

  if (hidden || subscribed !== false) return null;

  const close = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // stockage indisponible : la bannière reviendra au prochain chargement
    }
    setHidden(true);
  };

  return (
    <div className={`flex items-start gap-3 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200 ${className}`} role="status">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-amber-950">
        <BellRing className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-gray-900">Activez les notifications sur cet appareil</p>
        <p className="text-sm text-gray-600">
          Les nouvelles transactions, les paiements à traiter et les redirections ne sont plus envoyés par e-mail.
        </p>
        {support !== "ok" ? (
          <p className="mt-1 text-sm font-medium text-amber-900">{PUSH_HELP[support]}</p>
        ) : (
          <>
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
            <button
              type="button"
              onClick={enable}
              disabled={busy}
              className="mt-2 inline-flex items-center gap-2 rounded-full bg-blue-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Activer les notifications
            </button>
          </>
        )}
      </div>
      <button type="button" onClick={close} className="rounded-full p-1.5 text-gray-400 hover:bg-black/5" aria-label="Plus tard">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function StaffPushToggle({ className = "" }) {
  const { support, subscribed, busy, enable, disable } = useStaffPush();
  if (support !== "ok" || subscribed === null) return null;
  const label = subscribed ? "Notifications activées sur cet appareil — couper" : "Activer les notifications sur cet appareil";
  return (
    <button
      type="button"
      onClick={subscribed ? disable : enable}
      disabled={busy}
      aria-pressed={subscribed}
      aria-label={label}
      title={label}
      className={`rounded-lg p-2 transition disabled:opacity-50 ${subscribed ? "text-blue-700 hover:bg-blue-50" : "text-gray-400 hover:bg-gray-100 hover:text-gray-700"} ${className}`}
    >
      {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : subscribed ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
    </button>
  );
}
