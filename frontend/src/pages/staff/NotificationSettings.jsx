// pages/staff/NotificationSettings.jsx — « Paramètres » du personnel (admin, semi-admin, agent)
//   1. notifications sur CET appareil (activer / couper, tester)
//   2. événements qui envoient une notification (valables sur tous les appareils du compte)
import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing, CheckCircle2, Loader2, Send, Smartphone, AlertTriangle } from "lucide-react";
import { useStaffPush, getStaffSettings, saveStaffSettings, sendStaffTest } from "../../pwa/staffPush";
import { PUSH_HELP } from "../../pwa/pushCore";

const EVENTS = {
  agent: [
    { key: "new_transaction", label: "Nouvelle transaction", text: "Un client vient de créer un transfert qui vous est assigné." },
    { key: "payment_confirmed", label: "Paiement confirmé · à traiter", text: "Le client a payé : vous devez envoyer l'argent au bénéficiaire." },
    { key: "redirection", label: "Transaction redirigée vers vous", text: "Un autre agent vous propose une transaction à accepter ou refuser." },
  ],
  staff: [
    { key: "new_transaction", label: "Nouvelle transaction", text: "Chaque transfert créé par un client, tous agents confondus." },
    { key: "redirection", label: "Redirection proposée", text: "Un agent redirige une transaction vers un autre agent." },
  ],
};

const currentRole = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null")?.role || "admin";
  } catch {
    return "admin";
  }
};

function Switch({ checked, onChange, disabled, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition disabled:opacity-50 ${
        checked ? "bg-blue-700" : "bg-gray-300"
      }`}
    >
      <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition ${checked ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}

export default function NotificationSettings() {
  const role = currentRole();
  const events = role === "agent" ? EVENTS.agent : EVENTS.staff;
  const { support, subscribed, busy, error: pushError, enable, disable, init } = useStaffPush();
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(null);
  const [message, setMessage] = useState(null);   // { tone, text }
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    let alive = true;
    getStaffSettings()
      .then((s) => alive && setSettings(s))
      .catch(() => alive && setMessage({ tone: "error", text: "Impossible de charger vos préférences." }));
    return () => {
      alive = false;
    };
  }, []);

  const toggleEvent = async (key, value) => {
    setSaving(key);
    setMessage(null);
    try {
      setSettings(await saveStaffSettings({ [key]: value }));
    } catch {
      setMessage({ tone: "error", text: "Enregistrement impossible, réessayez." });
    } finally {
      setSaving(null);
    }
  };

  const toggleDevice = async (on) => {
    setMessage(null);
    if (on) await enable();
    else await disable();
    await init();
    getStaffSettings().then(setSettings).catch(() => {});
  };

  const test = async () => {
    setTesting(true);
    setMessage(null);
    try {
      const r = await sendStaffTest();
      setMessage({ tone: "ok", text: `Notification envoyée à ${r.devices} appareil${r.devices > 1 ? "s" : ""}. Elle doit apparaître dans quelques secondes.` });
    } catch (err) {
      setMessage({ tone: "error", text: err.response?.data?.message || "Envoi impossible." });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-4 lg:p-6">
      <header className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-700 text-white shadow-lg shadow-blue-700/20">
          <Bell className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
          <p className="text-sm text-gray-500">Notifications : elles remplacent les e-mails.</p>
        </div>
      </header>

      {message && (
        <p
          role="status"
          className={`flex items-start gap-2 rounded-xl px-4 py-3 text-sm ${
            message.tone === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"
          }`}
        >
          {message.tone === "ok" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
          {message.text}
        </p>
      )}

      {/* 1. Cet appareil */}
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <h2 className="mb-1 flex items-center gap-2 font-bold text-gray-900">
          <Smartphone className="h-5 w-5 text-blue-700" /> Sur cet appareil
        </h2>
        <p className="mb-4 text-sm text-gray-500">
          À activer sur chaque téléphone ou ordinateur où vous voulez être prévenu.
          {settings && ` Appareils abonnés pour votre compte : ${settings.devices}.`}
        </p>

        {support !== "ok" ? (
          <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{PUSH_HELP[support]}</p>
        ) : (
          <>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {subscribed ? <BellRing className="h-5 w-5 text-blue-700" /> : <BellOff className="h-5 w-5 text-gray-400" />}
                <div>
                  <p className="font-medium text-gray-900">Notifications push</p>
                  <p className="text-sm text-gray-500">
                    {subscribed === null ? "Vérification…" : subscribed ? "Activées sur cet appareil" : "Désactivées sur cet appareil"}
                  </p>
                </div>
              </div>
              {busy || subscribed === null ? (
                <Loader2 className="h-6 w-6 animate-spin text-blue-700" />
              ) : (
                <Switch checked={!!subscribed} onChange={toggleDevice} label="Notifications push sur cet appareil" />
              )}
            </div>
            {pushError && <p className="mt-3 text-sm text-red-600">{pushError}</p>}
            <button
              type="button"
              onClick={test}
              disabled={!subscribed || testing}
              className="mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-blue-700 ring-1 ring-blue-200 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Envoyer une notification de test
            </button>
          </>
        )}
      </section>

      {/* 2. Événements */}
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <h2 className="mb-1 font-bold text-gray-900">Me prévenir pour</h2>
        <p className="mb-2 text-sm text-gray-500">Ces choix s'appliquent à tous vos appareils.</p>
        {!settings ? (
          <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-blue-700" /></div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {events.map((e) => (
              <li key={e.key} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="font-medium text-gray-900">{e.label}</p>
                  <p className="text-sm text-gray-500">{e.text}</p>
                </div>
                {saving === e.key ? (
                  <Loader2 className="h-6 w-6 animate-spin text-blue-700" />
                ) : (
                  <Switch checked={!!settings[e.key]} onChange={(v) => toggleEvent(e.key, v)} label={e.label} />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
