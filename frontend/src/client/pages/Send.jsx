// client/pages/Send.jsx — envoi rapide (maquette C · TRX-01, TRX-02, TRX-03)
//   /envoyer                  numéro par défaut pré-rempli
//   /envoyer?beneficiary=12   depuis un raccourci de l'accueil
//   /envoyer?repeat=TRX…      « refaire un envoi » depuis l'historique
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronRight, Plus, Star, UserPlus, Wallet, WifiOff } from "lucide-react";
import clientApi, { apiError } from "../api";
import { useLiveEvent } from "../realtime";
import { useOnline } from "../offline";
import { useClientSession } from "../session";
import useReferenceData from "../useReferenceData";
import { formatAmount, formatRate, maskPhone } from "../format";
import { Avatar, Card, ErrorBox, FullPageSpinner, MethodLogo, PageHeader, Sheet, Spinner, EmptyState } from "../components/ui";
import { btn } from "../styles";
import BookEntryForm from "../components/BookEntryForm";

// Numéro saisi dans le formulaire → format international, comme le serveur
const toE164 = (prefix, raw) => {
  const p = String(prefix || "").replace(/[^\d+]/g, "");
  let digits = String(raw || "").replace(/\D/g, "");
  if (String(raw).trim().startsWith("+") && digits.startsWith(p.slice(1))) digits = digits.slice(p.length - 1);
  return p + digits;
};

function Choice({ label, onClick, children }) {
  return (
    <button type="button" onClick={onClick} className="w-full text-left">
      <Card className="flex items-center gap-3 px-4 py-3 transition hover:ring-blue-300">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
          <div className="mt-1">{children}</div>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-gray-400" />
      </Card>
    </button>
  );
}

export default function Send() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const client = useClientSession((s) => s.client);
  const offlineSession = useClientSession((s) => s.offline);
  const online = useOnline() && !offlineSession;
  const { data: ref } = useReferenceData();

  const [accounts, setAccounts] = useState(null);
  const [beneficiaries, setBeneficiaries] = useState(null);
  const [from, setFrom] = useState(null);       // numéro d'envoi
  const [to, setTo] = useState(null);           // bénéficiaire (enregistré ou ponctuel)
  const [amount, setAmount] = useState("");
  // Résultat du devis, associé aux paramètres qui l'ont produit
  const [quoteState, setQuoteState] = useState({ key: null, data: null, error: "" });
  // Nouveaux taux publiés pendant la saisie (rates:update) → devis recalculé
  const [ratesVersion, setRatesVersion] = useState(0);
  useLiveEvent("mc:rates", () => setRatesVersion((v) => v + 1));
  const [sheet, setSheet] = useState(null);     // "from" | "to" | "new-from" | "new-to" | "recap"
  const [saveNew, setSaveNew] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  // Chargement des carnets + pré-remplissage (défaut, raccourci, ou « refaire »)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [a, b] = await Promise.all([clientApi.get("me/accounts"), clientApi.get("me/beneficiaries")]);
        if (!alive) return;
        const accs = a.data.data;
        const bens = b.data.data;
        setAccounts(accs);
        setBeneficiaries(bens);

        let nextFrom = accs.find((x) => x.is_default) || accs[0] || null;
        let nextTo = null;

        const repeat = params.get("repeat");
        const benId = params.get("beneficiary");
        if (repeat) {
          const tx = (await clientApi.get(`me/transactions/${encodeURIComponent(repeat)}`)).data.data;
          nextFrom = accs.find((x) => x.payment_method_id === tx.sender_method_id && x.phone === tx.sender_phone) || {
            oneOff: true,
            country_id: tx.from_country_id,
            payment_method_id: tx.sender_method_id,
            payment_method_name: tx.sender_method,
            country_name: tx.from_country,
            phone: tx.sender_phone,
            phone_masked: maskPhone(tx.sender_phone, tx.from_phone_prefix),
          };
          nextTo = bens.find((x) => x.id === tx.beneficiary_id) || {
            oneOff: true,
            name: tx.receiver_phone,
            country_id: tx.to_country_id,
            payment_method_id: tx.receiver_method_id,
            payment_method_name: tx.receiver_method,
            country_name: tx.to_country,
            phone: tx.receiver_phone,
            phone_masked: maskPhone(tx.receiver_phone, tx.to_phone_prefix),
          };
          setAmount(String(Number(tx.send_amount)));
        } else if (benId) {
          nextTo = bens.find((x) => String(x.id) === benId) || null;
        }
        if (alive) {
          setFrom(nextFrom);
          setTo(nextTo);
        }
      } catch (err) {
        if (alive) setError(apiError(err, "Chargement impossible"));
      }
    })();
    return () => {
      alive = false;
    };
  }, [params, online]);

  const sameCountry = from && to && from.country_id === to.country_id;
  const numericAmount = parseFloat(String(amount).replace(",", "."));

  // Devis en direct (TRX-01), calculé par le serveur comme la vraie transaction
  const quoteKey =
    from && to && !sameCountry && numericAmount > 0
      ? [from.country_id, to.country_id, from.payment_method_id, to.payment_method_id, numericAmount, ratesVersion].join("|")
      : null;
  const quoting = quoteKey !== null && quoteState.key !== quoteKey;
  const quote = quoteState.key === quoteKey ? quoteState.data : null;
  const quoteError = quoteState.key === quoteKey ? quoteState.error : "";

  useEffect(() => {
    if (!quoteKey) return;
    const [fromCountry, toCountry, senderMethod, receiverMethod, value] = quoteKey.split("|");
    const t = setTimeout(async () => {
      try {
        const res = await clientApi.get("rates/quote", {
          params: {
            from_country_id: fromCountry,
            to_country_id: toCountry,
            sender_method_id: senderMethod,
            receiver_method_id: receiverMethod,
            amount: value,
          },
        });
        setQuoteState({ key: quoteKey, data: res.data.data, error: "" });
      } catch (err) {
        setQuoteState({ key: quoteKey, data: null, error: apiError(err, "Calcul impossible") });
      }
    }, 350);
    return () => clearTimeout(t);
  }, [quoteKey]);

  const fromCurrency = useMemo(() => {
    const c = from && ref?.countryById[from.country_id];
    return c ? c.currency_code : "";
  }, [from, ref]);

  const addAccount = useCallback(async (payload) => {
    try {
      const res = await clientApi.post("me/accounts", payload);
      setAccounts((list) => [...(list || []).map((a) => (payload.is_default ? { ...a, is_default: false } : a)), res.data.data]);
      setFrom(res.data.data);
      setSheet(null);
    } catch (err) {
      throw new Error(apiError(err));
    }
  }, []);

  const addBeneficiary = useCallback(
    async (payload) => {
      if (saveNew) {
        try {
          const res = await clientApi.post("me/beneficiaries", payload);
          setBeneficiaries((list) => [...(list || []), res.data.data]);
          setTo(res.data.data);
        } catch (err) {
          throw new Error(apiError(err));
        }
      } else {
        const country = ref?.countryById[payload.country_id];
        const method = (ref?.methodsByCountry[payload.country_id] || []).find((m) => m.id === payload.payment_method_id);
        const phone = toE164(country?.phone_prefix, payload.phone);
        setTo({
          oneOff: true,
          name: payload.name,
          country_id: payload.country_id,
          payment_method_id: payload.payment_method_id,
          payment_method_name: method?.method,
          country_name: country?.name,
          phone,
          phone_masked: maskPhone(phone, country?.phone_prefix),
        });
      }
      setSheet(null);
    },
    [saveNew, ref]
  );

  const send = async () => {
    setError("");
    setSending(true);
    try {
      const res = await clientApi.post("transactions", {
        from_country_id: from.country_id,
        to_country_id: to.country_id,
        sender_phone: from.phone,
        receiver_phone: to.phone,
        sender_method_id: from.payment_method_id,
        receiver_method_id: to.payment_method_id,
        send_amount: numericAmount,
      });
      navigate(`/transactions/${res.data.data.tracking_code}`, { replace: true, state: { justCreated: true } });
    } catch (err) {
      setError(apiError(err, "Envoi impossible"));
      setSending(false);
    }
  };

  // Pas de réseau : message clair plutôt qu'un formulaire inutilisable (§10)
  if (!online) {
    return (
      <div>
        <PageHeader title="Envoyer" />
        <div className="px-4">
          <Card>
            <EmptyState
              icon={WifiOff}
              title="Envoi impossible sans connexion"
              text="Un transfert a besoin d'internet pour calculer le taux et réserver un agent. Vos numéros et bénéficiaires restent enregistrés : reconnectez-vous pour continuer."
            />
          </Card>
        </div>
      </div>
    );
  }

  if (accounts === null && !error) return <FullPageSpinner />;

  const canContinue = from && to && !sameCountry && quote && !quoting;

  return (
    <div>
      <PageHeader title="Envoyer" />
      <div className="space-y-3 px-4">
        <Choice label={from?.is_default ? "Depuis · mon numéro par défaut" : "Depuis"} onClick={() => setSheet(accounts?.length ? "from" : "new-from")}>
          {from ? (
            <div className="flex items-center gap-3">
              <MethodLogo method={from.payment_method_name} className="h-8 w-8" />
              <span className="min-w-0">
                <span className="block truncate font-semibold">{from.payment_method_name}</span>
                <span className="block truncate text-sm text-gray-500 dark:text-gray-400">{from.phone_masked}</span>
              </span>
            </div>
          ) : (
            <span className="flex items-center gap-2 font-semibold text-blue-700 dark:text-blue-300">
              <Wallet className="h-5 w-5" /> Ajouter mon numéro d'envoi
            </span>
          )}
        </Choice>

        <Choice label="Vers · bénéficiaire" onClick={() => setSheet(beneficiaries?.length ? "to" : "new-to")}>
          {to ? (
            <div className="flex items-center gap-3">
              <Avatar name={to.name} size="sm" />
              <span className="min-w-0">
                <span className="block truncate font-semibold">{to.name}</span>
                <span className="block truncate text-sm text-gray-500 dark:text-gray-400">
                  {to.payment_method_name} · {to.country_name}
                </span>
              </span>
            </div>
          ) : (
            <span className="flex items-center gap-2 font-semibold text-blue-700 dark:text-blue-300">
              <UserPlus className="h-5 w-5" /> Choisir un bénéficiaire
            </span>
          )}
        </Choice>

        {sameCountry && <ErrorBox>Le pays d'envoi et le pays de réception doivent être différents.</ErrorBox>}

        <Card className="px-4 py-4">
          <label htmlFor="send-amount" className="text-sm text-gray-500 dark:text-gray-400">Vous envoyez</label>
          <div className="mt-1 flex items-baseline gap-2 border-b border-gray-100 pb-3 dark:border-white/10">
            <input
              id="send-amount"
              className="min-w-0 flex-1 bg-transparent text-3xl font-bold text-gray-900 outline-none placeholder:text-gray-300 dark:text-white"
              inputMode="decimal"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ""))}
            />
            <span className="font-semibold text-gray-500">{fromCurrency}</span>
          </div>
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">{to ? `${to.name.split(" ")[0]} reçoit` : "Le bénéficiaire reçoit"}</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="min-h-9 flex-1 text-3xl font-bold text-blue-700 dark:text-blue-300">
              {quoting ? <Spinner className="h-6 w-6 text-blue-700 dark:text-blue-300" /> : quote ? formatAmount(quote.receive_amount) : "—"}
            </span>
            <span className="font-semibold text-gray-500">{quote?.to_currency.code || ""}</span>
          </div>
        </Card>

        <ErrorBox>{quoteError}</ErrorBox>

        {quote && (
          <dl className="space-y-1.5 px-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">Frais de retrait ({formatRate(quote.withdrawal_fee_percent)} %)</dt>
              <dd className="font-medium">{formatAmount(quote.withdrawal_fee_amount, quote.from_currency.code)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">Taux</dt>
              <dd className="font-medium">1 {quote.from_currency.code} = {formatRate(quote.rate)} {quote.to_currency.code}</dd>
            </div>
            <div className="flex justify-between font-bold">
              <dt>Total à payer</dt>
              <dd>{formatAmount(quote.send_amount, quote.from_currency.code)}</dd>
            </div>
          </dl>
        )}

        <ErrorBox>{!sheet && error}</ErrorBox>

        <button type="button" className={btn.primary} disabled={!canContinue} onClick={() => { setError(""); setSheet("recap"); }}>
          Continuer
        </button>
      </div>

      {/* Choix du numéro d'envoi */}
      <Sheet open={sheet === "from"} onClose={() => setSheet(null)} title="Envoyer depuis">
        <div className="space-y-2 pb-2">
          {(accounts || []).map((a) => (
            <button key={a.id} type="button" onClick={() => { setFrom(a); setSheet(null); }} className="w-full text-left">
              <Card className={`flex items-center gap-3 px-4 py-3 ${from?.id === a.id ? "ring-2 ring-blue-600" : ""}`}>
                <MethodLogo method={a.payment_method_name} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{a.label ? `${a.label} · ` : ""}{a.payment_method_name}</span>
                  <span className="block truncate text-sm text-gray-500">{a.country_name} · {a.phone_masked}</span>
                </span>
                {a.is_default && <Star className="h-5 w-5 text-amber-400" fill="currentColor" />}
              </Card>
            </button>
          ))}
          <button type="button" className={btn.secondary} onClick={() => setSheet("new-from")}>
            <Plus className="h-5 w-5" /> Nouveau numéro
          </button>
        </div>
      </Sheet>

      <Sheet open={sheet === "new-from"} onClose={() => setSheet(null)} title="Mon numéro d'envoi">
        <BookEntryForm
          kind="account"
          initial={{ is_default: !accounts?.length, country_id: client?.country_id, phone: client?.phone, phone_prefix: client?.phone_prefix }}
          countryFilter={to ? (c) => c.id !== to.country_id : undefined}
          onSubmit={addAccount}
          submitLabel="Utiliser ce numéro"
        />
      </Sheet>

      {/* Choix du bénéficiaire */}
      <Sheet open={sheet === "to"} onClose={() => setSheet(null)} title="Envoyer à">
        <div className="space-y-2 pb-2">
          {(beneficiaries || []).map((b) => (
            <button key={b.id} type="button" onClick={() => { setTo(b); setSheet(null); }} className="w-full text-left">
              <Card className={`flex items-center gap-3 px-4 py-3 ${to?.id === b.id ? "ring-2 ring-blue-600" : ""}`}>
                <Avatar name={b.name} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{b.name}</span>
                  <span className="block truncate text-sm text-gray-500">{b.payment_method_name} · {b.country_name} · {b.phone_masked}</span>
                </span>
                {b.is_favorite && <Star className="h-5 w-5 text-amber-400" fill="currentColor" />}
              </Card>
            </button>
          ))}
          <button type="button" className={btn.secondary} onClick={() => { setSaveNew(true); setSheet("new-to"); }}>
            <UserPlus className="h-5 w-5" /> Nouveau bénéficiaire
          </button>
        </div>
      </Sheet>

      <Sheet open={sheet === "new-to"} onClose={() => setSheet(null)} title="Nouveau bénéficiaire">
        <BookEntryForm
          kind="beneficiary"
          countryFilter={from ? (c) => c.id !== from.country_id : undefined}
          onSubmit={addBeneficiary}
          submitLabel="Choisir ce bénéficiaire"
          extra={
            <label className="flex cursor-pointer items-center gap-3 px-1 text-sm">
              <input type="checkbox" className="h-5 w-5 accent-blue-700" checked={saveNew} onChange={(e) => setSaveNew(e.target.checked)} />
              Enregistrer dans mes bénéficiaires
            </label>
          }
        />
      </Sheet>

      {/* Récapitulatif avant validation (TRX-02) */}
      <Sheet open={sheet === "recap"} onClose={() => !sending && setSheet(null)} title="Récapitulatif">
        {quote && from && to && (
          <div className="space-y-4 pb-2">
            <Card className="divide-y divide-gray-100 text-sm dark:divide-white/5">
              {[
                ["Depuis", `${from.payment_method_name} · ${from.phone_masked}`],
                ["Vers", `${to.name} · ${to.payment_method_name} (${to.country_name})`],
                ["Numéro du bénéficiaire", to.phone_masked],
                ["Vous envoyez", formatAmount(quote.send_amount, quote.from_currency.code)],
                ["Frais de retrait", formatAmount(quote.withdrawal_fee_amount, quote.from_currency.code)],
                ["Taux", `1 ${quote.from_currency.code} = ${formatRate(quote.rate)} ${quote.to_currency.code}`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 px-4 py-2.5">
                  <span className="text-gray-500 dark:text-gray-400">{k}</span>
                  <span className="text-right font-medium">{v}</span>
                </div>
              ))}
              <div className="flex justify-between gap-4 px-4 py-3 text-base font-bold">
                <span>{to.name.split(" ")[0]} reçoit</span>
                <span className="text-blue-700 dark:text-blue-300">{formatAmount(quote.receive_amount, quote.to_currency.code)}</span>
              </div>
            </Card>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Après confirmation, vous aurez 5 minutes pour payer au numéro de l'agent indiqué, puis valider le paiement.
            </p>
            <ErrorBox>{error}</ErrorBox>
            <button type="button" className={btn.primary} onClick={send} disabled={sending}>
              {sending && <Spinner className="h-5 w-5 text-white" />}
              Confirmer l'envoi
            </button>
          </div>
        )}
      </Sheet>
    </div>
  );
}
