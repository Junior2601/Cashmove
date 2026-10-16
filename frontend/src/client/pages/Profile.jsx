// client/pages/Profile.jsx — profil, sécurité, réglages, support (CPT-03..05, NOT-04, SUP-01)
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BookUser, ChevronRight, Download, Headphones, KeyRound, LogOut, Share, Smartphone, Trash2, UserRound } from "lucide-react";
import clientApi, { apiError } from "../api";
import { useClientSession } from "../session";
import useReferenceData from "../useReferenceData";
import { Avatar, Card, ErrorBox, Field, PageHeader, Sheet, Spinner, Toggle } from "../components/ui";
import { btn, inputClass } from "../styles";
import ServiceClient from "../../components/public/ServiceClient";
import PhoneNote from "../../components/PhoneNote";
import { pushSupport, PUSH_HELP, enablePush, disablePush, getDeviceSubscription } from "../push";
import { useInstall, isIos } from "../../pwa/install";
import { savePinVerifier, clearPinVerifier } from "../pinVerifier";

function Row({ icon, label, hint, onClick, to, danger }) {
  const Icon = icon;
  const content = (
    <>
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${danger ? "bg-red-50 text-red-600 dark:bg-red-500/10" : "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"}`}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block font-medium ${danger ? "text-red-600" : "text-gray-900 dark:text-white"}`}>{label}</span>
        {hint && <span className="block truncate text-sm text-gray-500 dark:text-gray-400">{hint}</span>}
      </span>
      {!danger && <ChevronRight className="h-5 w-5 text-gray-400" />}
    </>
  );
  const cls = "flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-gray-50 dark:hover:bg-white/5";
  return to ? <Link to={to} className={cls}>{content}</Link> : <button type="button" onClick={onClick} className={cls}>{content}</button>;
}

// Notifications push sur CET appareil (abonnement navigateur + préférence du compte)
function PushToggle({ client, onSaved }) {
  const support = pushSupport();
  const [subscribed, setSubscribed] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getDeviceSubscription().then((s) => setSubscribed(!!s));
  }, []);

  const change = async (on) => {
    setBusy(true);
    setError("");
    try {
      if (on) await enablePush();
      else await disablePush();
      setSubscribed(on);
      await onSaved({ push_enabled: on });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <Toggle
        label="Notifications push"
        description={support === "ok" ? "Être prévenu quand l'app est fermée" : PUSH_HELP[support]}
        checked={support === "ok" && !!client?.push_enabled && !!subscribed}
        disabled={support !== "ok" || busy || subscribed === null}
        onChange={change}
      />
      {error && <p className="pb-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}

const localPart = (phone, prefix) => (phone && prefix && phone.startsWith(prefix) ? phone.slice(prefix.length) : phone || "");

export default function Profile() {
  const navigate = useNavigate();
  const { client, setClient, logout, endSession } = useClientSession();
  const { data: ref } = useReferenceData();
  const install = useInstall();
  const [sheet, setSheet] = useState(null);    // "info" | "pin" | "support" | "delete"
  const [form, setForm] = useState({});
  const [pins, setPins] = useState({ current: "", next: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [savedPrefs, setSavedPrefs] = useState("");

  const currencies = useMemo(() => {
    const seen = new Map();
    for (const c of ref?.countries || []) if (c.currency_id && !seen.has(c.currency_id)) seen.set(c.currency_id, c.currency_code);
    return [...seen.entries()];
  }, [ref]);

  const fullName = `${client?.first_name || ""} ${client?.last_name || ""}`.trim();

  const open = (name) => {
    setError("");
    if (name === "info") {
      setForm({
        first_name: client.first_name,
        last_name: client.last_name,
        country_id: String(client.country_id),
        phone: localPart(client.phone, client.phone_prefix),
      });
    }
    if (name === "pin") setPins({ current: "", next: "" });
    setSheet(name);
  };

  const patch = async (payload) => {
    const res = await clientApi.patch("me", payload);
    setClient(res.data.data);
    return res.data.data;
  };

  const saveInfo = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await patch({ ...form, country_id: Number(form.country_id) });
      setSheet(null);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  const savePref = async (payload) => {
    try {
      await patch(payload);
      setSavedPrefs("Enregistré");
      setTimeout(() => setSavedPrefs(""), 1500);
    } catch (err) {
      setSavedPrefs(apiError(err));
    }
  };

  const savePin = async (remove = false) => {
    setBusy(true);
    setError("");
    try {
      await clientApi.put("me/pin", { pin: remove ? null : pins.next, current_pin: pins.current });
      // Empreinte locale pour déverrouiller hors ligne (supprimée si le PIN l'est)
      if (remove) clearPinVerifier();
      else savePinVerifier(client.id, pins.next);
      setClient({ ...client, has_pin: !remove });
      setSheet(null);
    } catch (err) {
      // 5 PIN actuels erronés : sessions fermées par le serveur
      if (err?.response?.status === 423) {
        endSession();
        navigate("/connexion", { replace: true, state: { message: err.response.data.message } });
        return;
      }
      const left = err?.response?.data?.attempts_left;
      setError(left !== undefined ? `${apiError(err)} · ${left} essai${left > 1 ? "s" : ""} restant${left > 1 ? "s" : ""}` : apiError(err));
    } finally {
      setBusy(false);
    }
  };

  const exportData = async () => {
    try {
      const res = await clientApi.get("me/export");
      const blob = new Blob([JSON.stringify(res.data.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `movecash-mes-donnees-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(apiError(err));
    }
  };

  const deleteAccount = async () => {
    setBusy(true);
    try {
      await clientApi.delete("me");
      await logout();
      navigate("/", { replace: true });
    } catch (err) {
      setError(apiError(err));
      setBusy(false);
    }
  };

  const signOut = async () => {
    await logout();
    navigate("/", { replace: true });
  };

  const formCountry = ref?.countryById[form.country_id];

  return (
    <div>
      <PageHeader title="Profil" />
      <div className="space-y-5 px-4">
        <Card className="flex items-center gap-4 p-4">
          <Avatar name={fullName} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-lg font-bold text-gray-900 dark:text-white">{fullName}</p>
            <p className="truncate text-sm text-gray-500 dark:text-gray-400">{client?.email}</p>
            {client?.phone && <p className="truncate text-sm text-gray-500 dark:text-gray-400">{client.phone_masked || client.phone}</p>}
          </div>
        </Card>

        <Card className="divide-y divide-gray-100 overflow-hidden dark:divide-white/5">
          <Row icon={BookUser} label="Mes numéros et bénéficiaires" hint="Comptes d'envoi, carnet de bénéficiaires" to="/profil/numeros" />
          <Row icon={UserRound} label="Informations personnelles" hint={client?.country_name} onClick={() => open("info")} />
          <Row icon={KeyRound} label="Code PIN" hint={client?.has_pin ? "Activé · demandé à l'ouverture de l'app" : "Désactivé"} onClick={() => open("pin")} />
          <Row icon={Headphones} label="Support" hint="Contacter un agent sur WhatsApp" onClick={() => open("support")} />
          {!install.installed && (install.promptEvent || isIos()) && (
            <Row
              icon={Smartphone}
              label="Installer l'application"
              hint={install.promptEvent ? "Sur l'écran d'accueil, sans passer par un store" : "Safari : Partager → Sur l'écran d'accueil"}
              onClick={() => (install.promptEvent ? install.install() : open("install"))}
            />
          )}
        </Card>

        <section>
          <h2 className="mb-2 flex items-center justify-between px-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Réglages <span className="normal-case tracking-normal text-emerald-600">{savedPrefs}</span>
          </h2>
          <Card className="divide-y divide-gray-100 px-4 dark:divide-white/5">
            <PushToggle client={client} onSaved={savePref} />
            <Toggle label="Son" checked={!!client?.sound_enabled} onChange={(v) => savePref({ sound_enabled: v })} />
            <Toggle
              label="Annonces"
              description="Nouveaux pays, taux, promotions"
              checked={!!client?.announcements_enabled}
              onChange={(v) => savePref({ announcements_enabled: v })}
            />
            <div className="grid grid-cols-2 gap-3 py-3">
              <Field label="Langue" htmlFor="pref-lang">
                <select id="pref-lang" className={inputClass} value={client?.language || "fr"} onChange={(e) => savePref({ language: e.target.value })}>
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                </select>
              </Field>
              <Field label="Devise affichée" htmlFor="pref-cur">
                <select
                  id="pref-cur"
                  className={inputClass}
                  value={client?.display_currency_id || ""}
                  onChange={(e) => savePref({ display_currency_id: e.target.value ? Number(e.target.value) : null })}
                >
                  <option value="">Automatique</option>
                  {currencies.map(([id, code]) => (
                    <option key={id} value={id}>{code}</option>
                  ))}
                </select>
              </Field>
            </div>
          </Card>
        </section>

        <Card className="divide-y divide-gray-100 overflow-hidden dark:divide-white/5">
          <Row icon={Download} label="Exporter mes données" hint="Fichier JSON (profil, carnets, transactions)" onClick={exportData} />
          <Row icon={LogOut} label="Se déconnecter" onClick={signOut} danger />
          <Row icon={Trash2} label="Supprimer mon compte" onClick={() => open("delete")} danger />
        </Card>
        <ErrorBox>{!sheet && error}</ErrorBox>
      </div>

      <Sheet open={sheet === "info"} onClose={() => setSheet(null)} title="Informations personnelles">
        <form onSubmit={saveInfo} className="space-y-4 pb-2">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Prénom" htmlFor="pi-first">
              <input id="pi-first" className={inputClass} value={form.first_name || ""} onChange={(e) => setForm({ ...form, first_name: e.target.value })} autoComplete="given-name" />
            </Field>
            <Field label="Nom" htmlFor="pi-last">
              <input id="pi-last" className={inputClass} value={form.last_name || ""} onChange={(e) => setForm({ ...form, last_name: e.target.value })} autoComplete="family-name" />
            </Field>
          </div>
          <Field label="E-mail" hint="Votre identifiant de connexion, non modifiable">
            <input className={inputClass} value={client?.email || ""} disabled />
          </Field>
          <Field label="Pays de résidence" htmlFor="pi-country">
            <select id="pi-country" className={inputClass} value={form.country_id || ""} onChange={(e) => setForm({ ...form, country_id: e.target.value })}>
              {(ref?.countries || []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Téléphone" htmlFor="pi-phone">
            <div className="flex">
              <span className="inline-flex items-center rounded-l-xl border border-r-0 border-gray-300 bg-gray-100 px-3 text-sm text-gray-600 dark:border-white/15 dark:bg-slate-800 dark:text-gray-300">
                {formCountry?.phone_prefix || "+…"}
              </span>
              <input id="pi-phone" className={`${inputClass} rounded-l-none`} inputMode="tel" value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <PhoneNote prefix={formCountry?.phone_prefix} value={form.phone} role="self" />
          </Field>
          <ErrorBox>{error}</ErrorBox>
          <button type="submit" className={btn.primary} disabled={busy}>
            {busy && <Spinner className="h-5 w-5 text-white" />} Enregistrer
          </button>
        </form>
      </Sheet>

      <Sheet open={sheet === "pin"} onClose={() => setSheet(null)} title="Code PIN">
        <div className="space-y-4 pb-2">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Le code PIN à 4 chiffres protège l'app : il est demandé à chaque ouverture, et quand vous y revenez
            après plus de 2 minutes.  Après 5 erreurs, vous devrez vous reconnecter avec votre e-mail.
          </p>
          {client?.has_pin && (
            <Field label="Code PIN actuel" htmlFor="pin-cur">
              <input id="pin-cur" type="password" inputMode="numeric" maxLength={4} className={`${inputClass} tracking-[0.5em]`} value={pins.current} onChange={(e) => setPins({ ...pins, current: e.target.value.replace(/\D/g, "") })} />
            </Field>
          )}
          <Field label={client?.has_pin ? "Nouveau code PIN" : "Code PIN"} htmlFor="pin-new">
            <input id="pin-new" type="password" inputMode="numeric" maxLength={4} className={`${inputClass} tracking-[0.5em]`} value={pins.next} onChange={(e) => setPins({ ...pins, next: e.target.value.replace(/\D/g, "") })} />
          </Field>
          <ErrorBox>{error}</ErrorBox>
          <button type="button" className={btn.primary} disabled={busy || pins.next.length !== 4 || (client?.has_pin && pins.current.length !== 4)} onClick={() => savePin(false)}>
            {busy && <Spinner className="h-5 w-5 text-white" />} {client?.has_pin ? "Changer le code" : "Activer le code PIN"}
          </button>
          {client?.has_pin && (
            <button type="button" className="w-full py-2 text-sm font-semibold text-red-600 disabled:opacity-50" disabled={busy || pins.current.length !== 4} onClick={() => savePin(true)}>
              Désactiver le code PIN
            </button>
          )}
        </div>
      </Sheet>

      <Sheet open={sheet === "install"} onClose={() => setSheet(null)} title="Installer sur iPhone">
        <ol className="space-y-3 pb-4 text-gray-700 dark:text-gray-300">
          <li className="flex items-center gap-2">1. Ouvrez movecash.site dans <strong>Safari</strong></li>
          <li className="flex items-center gap-2">2. Touchez <Share className="h-5 w-5 text-blue-600" aria-label="Partager" /> en bas de l'écran</li>
          <li>3. Choisissez <strong>« Sur l'écran d'accueil »</strong>, puis « Ajouter »</li>
        </ol>
        <p className="pb-2 text-sm text-gray-500">Une fois installée (iOS 16.4 ou plus), l'app peut recevoir les notifications.</p>
      </Sheet>

      <Sheet open={sheet === "support"} onClose={() => setSheet(null)} title="Support">
        <ServiceClient message={`Bonjour, je suis ${fullName} (${client?.email}), client MoveCash.`} />
      </Sheet>

      <Sheet open={sheet === "delete"} onClose={() => !busy && setSheet(null)} title="Supprimer mon compte">
        <div className="space-y-4 pb-2">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Votre profil, vos numéros et vos bénéficiaires seront effacés et vous serez déconnecté. Les transactions déjà
            effectuées sont conservées de façon anonyme pour des raisons comptables.
          </p>
          <ErrorBox>{error}</ErrorBox>
          <button type="button" className={btn.danger} onClick={deleteAccount} disabled={busy}>
            {busy && <Spinner className="h-5 w-5 text-white" />} Supprimer définitivement
          </button>
          <button type="button" className={btn.secondary} onClick={() => setSheet(null)} disabled={busy}>Annuler</button>
        </div>
      </Sheet>
    </div>
  );
}
