// client/pages/TransactionView.jsx — détail et frise des statuts (maquette D · TRX-03, TRX-05)
import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Check, Copy, Headphones, RotateCcw, X, Clock } from "lucide-react";
import clientApi, { apiError } from "../api";
import { useLiveEvent } from "../realtime";
import { fetchWithOffline } from "../offline";
import { formatAmount, formatDateTime, formatRate, formatTime, isExpired, parseDate } from "../format";
import { Card, ErrorBox, FullPageSpinner, PageHeader, Sheet, Spinner, StatusBadge } from "../components/ui";
import { btn } from "../styles";
import ServiceClient from "../../components/public/ServiceClient";

// Étapes affichées, construites à partir des statuts du back-office
const buildSteps = (tx) => {
  const at = (status) => tx.events?.find((e) => e.to_status === status)?.created_at;
  const failed = ["echouee", "annulee", "expiree"].includes(tx.status);
  const steps = [
    { key: "created", title: "Transaction créée", text: "Référence attribuée", time: at("en_attente") || tx.created_at, done: true },
    {
      key: "paid",
      title: "Paiement confirmé",
      text: tx.status === "en_attente" ? "En attente de votre paiement" : `Payé via ${tx.sender_method}`,
      time: at("validee"),
      done: ["validee", "effectuee"].includes(tx.status),
    },
    {
      key: "processing",
      title: "Transfert en cours",
      text: "Un agent traite votre envoi",
      done: tx.status === "effectuee",
      current: tx.status === "validee",
    },
    {
      key: "completed",
      title: "Fonds remis",
      text: `Envoyés sur ${tx.receiver_method}`,
      time: at("effectuee") || tx.completed_at,
      done: tx.status === "effectuee",
    },
  ];
  if (failed) {
    const reached = steps.filter((s) => s.done);
    const labels = { echouee: "Transaction échouée", annulee: "Transaction annulée", expiree: "Délai de paiement dépassé" };
    return [
      ...reached,
      { key: "failed", title: labels[tx.status], text: "Contactez le support si vous avez déjà payé", time: at(tx.status) || tx.cancelled_at, failed: true },
    ];
  }
  return steps;
};

function Countdown({ until, onEnd }) {
  const [left, setLeft] = useState(() => parseDate(until).getTime() - Date.now());
  useEffect(() => {
    const end = parseDate(until).getTime();
    const t = setInterval(() => {
      const l = end - Date.now();
      setLeft(l);
      if (l <= 0) {
        clearInterval(t);
        onEnd?.();
      }
    }, 1000);
    return () => clearInterval(t);
  }, [until, onEnd]);
  const s = Math.max(0, Math.floor(left / 1000));
  return <span className="tabular-nums">{Math.floor(s / 60)}:{String(s % 60).padStart(2, "0")}</span>;
}

export default function TransactionView() {
  const { ref } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [tx, setTx] = useState(null);
  const [error, setError] = useState("");
  const [validating, setValidating] = useState(false);
  const [support, setSupport] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetchWithOffline(`tx_${ref}`, async () => (await clientApi.get(`me/transactions/${encodeURIComponent(ref)}`)).data.data);
      setTx(res.data);
    } catch (err) {
      setError(apiError(err, "Transaction introuvable"));
    }
  }, [ref]);

  useEffect(() => {
    let alive = true;
    fetchWithOffline(`tx_${ref}`, async () => (await clientApi.get(`me/transactions/${encodeURIComponent(ref)}`)).data.data)
      .then((res) => alive && setTx(res.data))
      .catch((err) => alive && setError(apiError(err, "Transaction introuvable")));
    return () => {
      alive = false;
    };
  }, [ref]);

  // Suivi en direct : la frise avance dès que le statut change (NOT-01)
  useLiveEvent("mc:transaction", (e) => {
    if (e.tracking_code === tx?.tracking_code) load();
  });
  useLiveEvent("mc:resync", () => load());

  const confirmPayment = async () => {
    setError("");
    setValidating(true);
    try {
      await clientApi.put(`transactions/validate/${tx.id}`);
      await load();
    } catch (err) {
      setError(apiError(err, "Validation impossible"));
    } finally {
      setValidating(false);
    }
  };

  const copyNumber = async () => {
    try {
      await navigator.clipboard.writeText(tx.authorized_number);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // presse-papiers indisponible : le numéro reste affiché
    }
  };

  if (!tx && !error) return <FullPageSpinner />;
  if (!tx) {
    return (
      <div>
        <PageHeader title="Transaction" back="/transactions" />
        <div className="px-4"><ErrorBox>{error}</ErrorBox></div>
      </div>
    );
  }

  const awaitingPayment = tx.status === "en_attente" && !isExpired(tx.expires_at);
  const steps = buildSteps(tx);
  const name = tx.beneficiary_name || tx.receiver_phone;

  return (
    <div>
      <PageHeader title="Détail" back="/transactions" />
      <div className="space-y-4 px-4">
        <div>
          <p className="font-mono text-xs text-gray-500 dark:text-gray-400">{tx.tracking_code}</p>
          <div className="mt-1 flex items-start justify-between gap-3">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatAmount(tx.send_amount, tx.from_currency_symbol || tx.from_currency_code)} → {name.split(" ")[0]}
            </p>
            <StatusBadge status={tx.status} />
          </div>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            Reçoit {formatAmount(tx.receive_amount, tx.to_currency_code)} · {formatDateTime(tx.created_at)}
          </p>
        </div>

        {/* Paiement à effectuer (statut en attente) */}
        {awaitingPayment && (
          <Card className="space-y-3 border-2 border-amber-300 p-4 dark:border-amber-500/40">
            <div className="flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-300">
              <Clock className="h-5 w-5" />
              {location.state?.justCreated ? "Dernière étape : payez" : "Paiement en attente"} — <Countdown until={tx.expires_at} onEnd={load} />
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Envoyez <strong>{formatAmount(tx.send_amount, tx.from_currency_code)}</strong> via <strong>{tx.sender_method}</strong> au numéro :
            </p>
            <button
              type="button"
              onClick={copyNumber}
              className="flex w-full items-center justify-between rounded-xl bg-gray-100 px-4 py-3 font-mono text-lg font-bold text-gray-900 dark:bg-white/10 dark:text-white"
            >
              {tx.authorized_number || "—"}
              <span className="flex items-center gap-1 font-sans text-sm font-medium text-blue-700 dark:text-blue-300">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copié" : "Copier"}
              </span>
            </button>
            {tx.agent_name && <p className="text-xs text-gray-500">Agent : {tx.agent_name}</p>}
            <ErrorBox>{error}</ErrorBox>
            <button type="button" className={btn.primary} onClick={confirmPayment} disabled={validating}>
              {validating && <Spinner className="h-5 w-5 text-white" />}
              J'ai effectué le paiement
            </button>
          </Card>
        )}

        {/* Frise chronologique */}
        <Card className="p-4">
          <ol>
            {steps.map((s, i) => {
              const last = i === steps.length - 1;
              return (
                <li key={s.key} className="relative flex gap-3 pb-5 last:pb-0">
                  {!last && (
                    <span
                      className={`absolute left-[13px] top-7 h-[calc(100%-1.25rem)] w-0.5 ${s.done ? "bg-emerald-500" : "bg-gray-200 dark:bg-white/10"}`}
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                      s.failed
                        ? "bg-red-600 text-white"
                        : s.done
                          ? "bg-emerald-500 text-white"
                          : s.current
                            ? "border-4 border-blue-700 bg-white dark:bg-slate-900"
                            : "border-2 border-gray-300 bg-white dark:border-white/20 dark:bg-slate-900"
                    }`}
                  >
                    {s.failed ? <X className="h-4 w-4" /> : s.done ? <Check className="h-4 w-4" /> : null}
                  </span>
                  <div className="min-w-0">
                    <p className={`font-semibold ${s.current ? "text-blue-700 dark:text-blue-300" : s.failed ? "text-red-700 dark:text-red-400" : "text-gray-900 dark:text-white"}`}>
                      {s.title}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {s.time ? `${formatTime(s.time)} · ` : ""}{s.text}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </Card>

        {/* Détails */}
        <Card className="divide-y divide-gray-100 text-sm dark:divide-white/5">
          {[
            ["Bénéficiaire", tx.beneficiary_name ? `${tx.beneficiary_name} · ${tx.receiver_phone}` : tx.receiver_phone],
            ["Réception", `${tx.receiver_method} · ${tx.to_country}`],
            ["Envoi depuis", `${tx.sender_method} · ${tx.sender_phone}`],
            ["Montant envoyé", formatAmount(tx.send_amount, tx.from_currency_code)],
            ["Frais de retrait", formatAmount(tx.withdrawal_fee_amount, tx.from_currency_code)],
            ["Taux", `1 ${tx.from_currency_code} = ${formatRate(tx.rate_applied)} ${tx.to_currency_code}`],
            ["Montant reçu", formatAmount(tx.receive_amount, tx.to_currency_code)],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 px-4 py-2.5">
              <span className="text-gray-500 dark:text-gray-400">{k}</span>
              <span className="text-right font-medium">{v}</span>
            </div>
          ))}
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <button type="button" className={btn.secondary} onClick={() => setSupport(true)}>
            <Headphones className="h-5 w-5" /> Support
          </button>
          <button type="button" className={btn.primary} onClick={() => navigate(`/envoyer?repeat=${encodeURIComponent(tx.tracking_code)}`)}>
            <RotateCcw className="h-5 w-5" /> Refaire
          </button>
        </div>
        <p className="pb-2 text-center text-xs text-gray-400">
          <Link to="/transactions" className="underline underline-offset-2">Retour à l'historique</Link>
        </p>
      </div>

      {/* Support avec la référence jointe (SUP-01) */}
      <Sheet open={support} onClose={() => setSupport(false)} title="Support">
        <p className="mb-3 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:bg-blue-500/10 dark:text-blue-200">
          Donnez cette référence à l'agent : <strong className="font-mono">{tx.tracking_code}</strong>
        </p>
        <ServiceClient message={`Bonjour, j'ai une question sur ma transaction MoveCash ${tx.tracking_code}.`} />
      </Sheet>
    </div>
  );
}
