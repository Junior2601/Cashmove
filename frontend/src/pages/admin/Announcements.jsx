// pages/admin/Announcements.jsx — annonces aux clients, immédiates ou programmées
// Même langage visuel que l'app client (cartes, pastilles, aperçu de la notification).
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { Megaphone, Send, CalendarClock, Clock, Pencil, X, Users, Eye, AlertTriangle, CheckCircle2, Ban, Loader2, Star, RotateCcw } from "lucide-react";
import api from "../../api/axios";

const LINKS = [
  { value: "", label: "Aucun (ouvre les alertes)" },
  { value: "/envoyer", label: "Écran Envoyer" },
  { value: "/", label: "Accueil de l'app" },
  { value: "/transactions", label: "Historique" },
];

const STATUS = {
  scheduled: { label: "Programmée", cls: "bg-blue-100 text-blue-800", icon: CalendarClock },
  sending: { label: "Envoi en cours", cls: "bg-amber-100 text-amber-800", icon: Loader2 },
  sent: { label: "Envoyée", cls: "bg-emerald-100 text-emerald-800", icon: CheckCircle2 },
  cancelled: { label: "Annulée", cls: "bg-gray-100 text-gray-600", icon: Ban },
  failed: { label: "Échec", cls: "bg-red-100 text-red-800", icon: AlertTriangle },
};

const TABS = [
  { key: "upcoming", label: "À venir", statuses: ["scheduled", "sending", "failed"] },
  { key: "sent", label: "Envoyées", statuses: ["sent"] },
  { key: "cancelled", label: "Annulées", statuses: ["cancelled"] },
];

const input =
  "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20";

// ── Dates : saisie et affichage dans le fuseau du navigateur de l'admin ──
const pad = (n) => String(n).padStart(2, "0");
const toLocalInput = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
const formatDate = (iso) =>
  new Date(iso).toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const relative = (iso, nowMs) => {
  const diff = new Date(iso).getTime() - nowMs;
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });
  if (abs < 3600e3) return rtf.format(Math.round(diff / 60e3), "minute");
  if (abs < 86400e3) return rtf.format(Math.round(diff / 3600e3), "hour");
  return rtf.format(Math.round(diff / 86400e3), "day");
};

// Horloge rafraîchie régulièrement : garde l'affichage pur (pas de Date.now() au rendu)
function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

// Raccourcis de programmation
const presets = (nowMs) => {
  const now = new Date(nowMs);
  const at = (d, h) => {
    const x = new Date(now);
    x.setDate(x.getDate() + d);
    x.setHours(h, 0, 0, 0);
    return x;
  };
  const list = [];
  if (now.getHours() < 17) list.push({ label: "Ce soir 18 h", date: at(0, 18) });
  list.push({ label: "Demain 9 h", date: at(1, 9) });
  list.push({ label: "Demain 18 h", date: at(1, 18) });
  const monday = at(((8 - now.getDay()) % 7) || 7, 9);
  list.push({ label: "Lundi 9 h", date: monday });
  return list;
};

function ModeIcon({ icon }) {
  const Icon = icon;
  return <Icon className="h-4 w-4" />;
}

function Preview({ title, body }) {
  return (
    <div className="self-start rounded-2xl bg-linear-to-b from-blue-700 to-blue-900 p-4">
      <p className="mb-2 text-center text-[11px] font-medium uppercase tracking-wide text-blue-200">Aperçu côté client</p>
      <div className="flex items-start gap-3 rounded-2xl bg-white/95 p-3 shadow-lg">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-amber-950">
          <Star className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold text-gray-900">{title || "Titre de l'annonce"}</p>
          <p className="line-clamp-2 text-sm text-gray-500">{body || "Message affiché sous le titre"}</p>
        </div>
        <span className="ml-auto shrink-0 text-xs text-gray-400">maint.</span>
      </div>
    </div>
  );
}

// Formulaire commun : création et modification
function Composer({ initial, audience, onSubmit, onCancel, submitting }) {
  const editing = !!initial;
  // Identifiants uniques : le formulaire existe deux fois (création + fenêtre de modification)
  const uid = useId();
  const ids = { title: `${uid}-title`, body: `${uid}-body`, link: `${uid}-link` };
  const [form, setForm] = useState({
    title: initial?.title || "",
    body: initial?.body || "",
    link: initial?.link || "",
  });
  const [mode, setMode] = useState(editing ? "later" : "now");
  const [when, setWhen] = useState(() =>
    toLocalInput(initial?.scheduled_at ? new Date(initial.scheduled_at) : new Date(Date.now() + 60 * 60e3))
  );
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");
  const now = useNow();

  const scheduledDate = mode === "later" ? new Date(when) : null;
  const tooSoon = scheduledDate && scheduledDate.getTime() < now + 2 * 60e3;

  const submit = async () => {
    setError("");
    try {
      await onSubmit({ ...form, scheduled_at: scheduledDate ? scheduledDate.toISOString() : null });
      if (!editing) {
        setForm({ title: "", body: "", link: "" });
        setMode("now");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Enregistrement impossible");
    } finally {
      setConfirm(false);
    }
  };

  const primaryLabel = mode === "now" ? "Envoyer maintenant" : editing ? "Enregistrer" : "Programmer";

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor={ids.title} className="text-sm font-medium text-gray-700">Titre</label>
          <input id={ids.title} className={input} maxLength={150} placeholder="Nouveau pays disponible" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between">
            <label htmlFor={ids.body} className="text-sm font-medium text-gray-700">Message</label>
            <span className="text-xs text-gray-400">{form.body.length}/500</span>
          </div>
          <textarea id={ids.body} rows={3} maxLength={500} className={input} placeholder="Envois vers le Gabon via Airtel Money" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor={ids.link} className="text-sm font-medium text-gray-700">Au clic, ouvrir</label>
          <select id={ids.link} className={input} value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })}>
            {LINKS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </div>

        {/* Quand ? */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-gray-700">Quand ?</legend>
          {!editing && (
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1">
              {[
                { key: "now", label: "Maintenant", icon: Send },
                { key: "later", label: "Programmer", icon: CalendarClock },
              ].map(({ key, label, icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMode(key)}
                  aria-pressed={mode === key}
                  className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition ${
                    mode === key ? "bg-white text-blue-700 shadow-sm" : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <ModeIcon icon={icon} /> {label}
                </button>
              ))}
            </div>
          )}
          {mode === "later" && (
            <div className="space-y-2">
              <input
                type="datetime-local"
                className={input}
                aria-label="Date et heure d'envoi"
                value={when}
                min={toLocalInput(new Date(now + 2 * 60e3))}
                onChange={(e) => setWhen(e.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                {presets(now).map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setWhen(toLocalInput(p.date))}
                    className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500">
                {tooSoon
                  ? "Choisissez une heure au moins 2 minutes plus tard."
                  : `Envoi ${formatDate(scheduledDate.toISOString())} (${relative(scheduledDate.toISOString(), now)}) · heure de votre appareil`}
              </p>
            </div>
          )}
        </fieldset>

        {error && <p role="alert" className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"><AlertTriangle className="h-4 w-4" /> {error}</p>}

        {confirm ? (
          <div className="flex flex-col gap-3 rounded-2xl bg-amber-50 p-4 sm:flex-row sm:items-center">
            <p className="flex-1 text-sm text-amber-900">
              {mode === "now"
                ? `Envoyer maintenant à ${audience} client${audience > 1 ? "s" : ""} ? Ce n'est pas annulable.`
                : `Programmer l'envoi ${formatDate(scheduledDate.toISOString())} ? Vous pourrez le modifier ou l'annuler jusque-là.`}
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setConfirm(false)} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-amber-100">Retour</button>
              <button type="button" onClick={submit} disabled={submitting} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50">
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Confirmer
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            {onCancel && (
              <button type="button" onClick={onCancel} className="flex-1 rounded-xl bg-white px-4 py-3 font-semibold text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50">
                Annuler
              </button>
            )}
            <button
              type="button"
              onClick={() => (mode === "now" ? setConfirm(true) : submit())}
              disabled={!form.title.trim() || tooSoon || submitting}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {mode === "now" ? <Send className="h-4 w-4" /> : <CalendarClock className="h-4 w-4" />} {primaryLabel}
            </button>
          </div>
        )}
      </div>
      <Preview title={form.title} body={form.body} />
    </div>
  );
}

function AnnouncementCard({ a, onEdit, onSendNow, onCancel, busy, now }) {
  const status = STATUS[a.status] || STATUS.sent;
  const StatusIcon = status.icon;
  const [confirm, setConfirm] = useState(null);   // "send" | "cancel"
  const readRate = a.recipients ? Math.round((a.read_count / a.recipients) * 100) : 0;

  return (
    <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900">{a.title}</h3>
          {a.body && <p className="mt-0.5 text-sm text-gray-500">{a.body}</p>}
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.cls}`}>
          <StatusIcon className={`h-3.5 w-3.5 ${a.status === "sending" ? "animate-spin" : ""}`} /> {status.label}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
        {a.status === "sent" ? (
          <>
            <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4" /> Envoyée {formatDate(a.sent_at)}</span>
            <span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4" /> {a.recipients} client{a.recipients > 1 ? "s" : ""}</span>
            <span className="inline-flex items-center gap-1.5"><Eye className="h-4 w-4" /> {a.read_count} lue{a.read_count > 1 ? "s" : ""} ({readRate} %)</span>
          </>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-4 w-4" /> {a.status === "cancelled" ? "Était prévue" : "Prévue"} {formatDate(a.scheduled_at)}
            {a.status === "scheduled" && <span className="font-medium text-blue-700">· {relative(a.scheduled_at, now)}</span>}
          </span>
        )}
        {a.created_by_name && <span>par {a.created_by_name}</span>}
      </div>

      {a.status === "failed" && a.error && (
        <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{a.error}</p>
      )}

      {["scheduled", "failed"].includes(a.status) && (
        confirm ? (
          <div className="mt-3 flex flex-col gap-2 rounded-xl bg-amber-50 p-3 sm:flex-row sm:items-center">
            <p className="flex-1 text-sm text-amber-900">
              {confirm === "send" ? "Envoyer cette annonce tout de suite ?" : "Annuler cette annonce ? Elle ne sera pas envoyée."}
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setConfirm(null)} className="rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-amber-100">Retour</button>
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  await (confirm === "send" ? onSendNow(a) : onCancel(a));
                  setConfirm(null);
                }}
                className={`rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:opacity-50 ${confirm === "send" ? "bg-blue-700 hover:bg-blue-800" : "bg-red-600 hover:bg-red-700"}`}
              >
                Confirmer
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {a.status === "scheduled" && (
              <button type="button" onClick={() => onEdit(a)} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50">
                <Pencil className="h-4 w-4" /> Modifier
              </button>
            )}
            <button type="button" onClick={() => setConfirm("send")} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-blue-700 ring-1 ring-blue-200 hover:bg-blue-50">
              {a.status === "failed" ? <RotateCcw className="h-4 w-4" /> : <Send className="h-4 w-4" />} {a.status === "failed" ? "Réessayer" : "Envoyer maintenant"}
            </button>
            <button type="button" onClick={() => setConfirm("cancel")} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-red-600 ring-1 ring-red-200 hover:bg-red-50">
              <X className="h-4 w-4" /> Annuler
            </button>
          </div>
        )
      )}
    </article>
  );
}

export default function Announcements() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("upcoming");
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState("");
  const now = useNow();

  const load = useCallback(async () => {
    try {
      const res = await api.get("/announcements");
      setData(res.data.data);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Chargement impossible");
    }
  }, []);

  useEffect(() => {
    let alive = true;
    api
      .get("/announcements")
      .then((res) => alive && setData(res.data.data))
      .catch((err) => alive && setError(err.response?.data?.message || "Chargement impossible"));
    return () => {
      alive = false;
    };
  }, []);

  // Une annonce programmée part pendant que la page est ouverte : statut mis à jour
  const hasPending = data?.items.some((a) => ["scheduled", "sending"].includes(a.status));
  useEffect(() => {
    if (!hasPending) return;
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [hasPending, load]);

  const showFlash = (msg) => {
    setFlash(msg);
    setTimeout(() => setFlash(""), 4000);
  };

  const run = async (fn, message) => {
    setBusy(true);
    try {
      const res = await fn();
      showFlash(typeof message === "function" ? message(res.data.data) : message);
      await load();
    } catch (err) {
      showFlash(err.response?.data?.message || "Action impossible");
      throw err;
    } finally {
      setBusy(false);
    }
  };

  const counts = useMemo(() => {
    const c = {};
    for (const t of TABS) c[t.key] = (data?.items || []).filter((a) => t.statuses.includes(a.status)).length;
    return c;
  }, [data]);

  const visible = useMemo(() => {
    const statuses = TABS.find((t) => t.key === tab).statuses;
    const items = (data?.items || []).filter((a) => statuses.includes(a.status));
    // À venir : la plus proche d'abord
    return tab === "upcoming" ? [...items].sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at)) : items;
  }, [data, tab]);

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <header className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-700 text-white shadow-lg shadow-blue-700/20">
          <Megaphone className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Annonces</h1>
          <p className="text-sm text-gray-500">
            {!data
              ? "Nouveaux pays, taux, promotions"
              : data.audience > 1
                ? `${data.audience} clients acceptent les annonces (réglage « Annonces » de leur profil)`
                : `${data.audience} client accepte les annonces (réglage « Annonces » de son profil)`}
          </p>
        </div>
      </header>

      {flash && (
        <p role="status" className="fixed inset-x-4 top-4 z-70 mx-auto max-w-md rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-xl">
          {flash}
        </p>
      )}

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <h2 className="mb-4 font-bold text-gray-900">Nouvelle annonce</h2>
        <Composer
          audience={data?.audience ?? 0}
          submitting={busy}
          onSubmit={(payload) =>
            run(
              () => api.post("/announcements", payload),
              (a) => (a.status === "sent" ? `Annonce envoyée à ${a.recipients} client${a.recipients > 1 ? "s" : ""}` : `Annonce programmée ${formatDate(a.scheduled_at)}`)
            ).then(() => setTab(payload.scheduled_at ? "upcoming" : "sent"))
          }
        />
      </section>

      <section>
        <div className="mb-3 flex gap-2 overflow-x-auto" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${
                tab === t.key ? "bg-blue-700 text-white" : "bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50"
              }`}
            >
              {t.label} {counts[t.key] > 0 && <span className="ml-1 opacity-75">{counts[t.key]}</span>}
            </button>
          ))}
        </div>

        {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        {!data && !error ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-blue-700" /></div>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl bg-white px-6 py-12 text-center shadow-sm ring-1 ring-black/5">
            <Megaphone className="mx-auto mb-3 h-8 w-8 text-blue-300" />
            <p className="font-semibold text-gray-900">
              {tab === "upcoming" ? "Aucune annonce programmée" : tab === "sent" ? "Aucune annonce envoyée" : "Aucune annonce annulée"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {visible.map((a) => (
              <AnnouncementCard
                key={a.id}
                a={a}
                busy={busy}
                now={now}
                onEdit={setEditing}
                onSendNow={(x) => run(() => api.post(`/announcements/${x.id}/send-now`), (r) => `Annonce envoyée à ${r.recipients} client${r.recipients > 1 ? "s" : ""}`).catch(() => {})}
                onCancel={(x) => run(() => api.delete(`/announcements/${x.id}`), "Annonce annulée").catch(() => {})}
              />
            ))}
          </div>
        )}
      </section>

      {/* Modification d'une annonce programmée */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Modifier l'annonce">
          <button type="button" className="absolute inset-0 bg-black/40" onClick={() => setEditing(null)} aria-label="Fermer" />
          <div className="relative max-h-[90dvh] w-full max-w-4xl overflow-y-auto rounded-t-3xl bg-gray-50 p-5 sm:rounded-3xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Modifier l'annonce programmée</h2>
              <button type="button" onClick={() => setEditing(null)} className="rounded-full p-2 text-gray-500 hover:bg-black/5" aria-label="Fermer"><X className="h-5 w-5" /></button>
            </div>
            <Composer
              initial={editing}
              audience={data?.audience ?? 0}
              submitting={busy}
              onCancel={() => setEditing(null)}
              onSubmit={(payload) => run(() => api.patch(`/announcements/${editing.id}`, payload), "Annonce mise à jour").then(() => setEditing(null))}
            />
          </div>
        </div>
      )}
    </div>
  );
}
