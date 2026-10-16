// client/pages/Home.jsx — tableau de bord (maquette B · NUM-03, TRX-04)
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, ArrowRightLeft, Send } from "lucide-react";
import clientApi from "../api";
import { useLiveEvent } from "../realtime";
import { fetchWithOffline } from "../offline";
import { InstallCard, PushCard } from "../components/PwaCards";
import { useClientSession } from "../session";
import useReferenceData from "../useReferenceData";
import { formatRate } from "../format";
import { Avatar, Card, EmptyState, Spinner } from "../components/ui";
import { btn } from "../styles";
import TransactionRow from "../components/TransactionRow";

export default function Home() {
  const client = useClientSession((s) => s.client);
  const { data: ref } = useReferenceData();
  const [rates, setRates] = useState(null);
  const [beneficiaries, setBeneficiaries] = useState(null);
  const [recent, setRecent] = useState(null);

  // Statut d'un envoi changé ou retour en ligne : dernières transactions à jour
  const reloadRecent = () =>
    clientApi
      .get("me/transactions", { params: { limit: 3 } })
      .then((r) => setRecent(r.data.data.items))
      .catch(() => {});
  useLiveEvent("mc:transaction", reloadRecent);
  useLiveEvent("mc:resync", reloadRecent);
  useLiveEvent("mc:rates", (list) => setRates(list));

  useEffect(() => {
    let alive = true;
    // Hors ligne : dernières données enregistrées sur l'appareil (§10)
    fetchWithOffline("rates", async () => (await clientApi.get("rates/active")).data.data || [])
      .then((r) => alive && setRates(r.data))
      .catch(() => alive && setRates([]));
    fetchWithOffline("beneficiaries", async () => (await clientApi.get("me/beneficiaries")).data.data)
      .then((r) => alive && setBeneficiaries(r.data))
      .catch(() => alive && setBeneficiaries([]));
    fetchWithOffline("recent", async () => (await clientApi.get("me/transactions", { params: { limit: 3 } })).data.data.items)
      .then((r) => alive && setRecent(r.data))
      .catch(() => alive && setRecent([]));
    return () => {
      alive = false;
    };
  }, []);

  // Taux du jour : depuis la devise du pays du client si possible
  const rateCard = useMemo(() => {
    // On attend l'historique : sinon la carte affiche une paire puis bascule sur une autre
    if (!rates?.length || recent === null) return null;
    const last = recent[0];
    const myCurrency = ref?.countryById[client?.country_id]?.currency_id;
    const rate =
      (last && rates.find((r) => r.from_currency_code === last.from_currency_code && r.to_currency_code === last.to_currency_code)) ||
      rates.find((r) => r.from_currency_id === myCurrency) ||
      rates[0];
    const fromCountries = (ref?.countries || []).filter((c) => c.currency_id === rate.from_currency_id).map((c) => c.id);
    const fees = (ref?.methods || [])
      .filter((m) => fromCountries.includes(m.country_id))
      .map((m) => Number(m.withdrawal_fee_percent || 0));
    return { rate, minFee: fees.length ? Math.min(...fees) : null };
  }, [rates, ref, client, recent]);

  const shortcuts = useMemo(() => {
    if (!beneficiaries) return null;
    const favorites = beneficiaries.filter((b) => b.is_favorite);
    return (favorites.length ? favorites : beneficiaries).slice(0, 6);
  }, [beneficiaries]);

  return (
    <div className="space-y-6 px-4 pt-[max(1rem,env(safe-area-inset-top))]">
      <header className="flex items-center justify-between pt-2">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Bonjour,</p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {client?.first_name} {client?.last_name}
          </h1>
        </div>
        <Link to="/profil" aria-label="Mon profil">
          <Avatar name={`${client?.first_name || ""} ${client?.last_name || ""}`} />
        </Link>
      </header>

      <InstallCard />
      <PushCard />

      {/* Taux du jour */}
      <section className="rounded-2xl bg-gradient-to-br from-blue-700 to-blue-900 p-5 text-white shadow-lg shadow-blue-900/20">
        <p className="text-sm text-blue-100">Taux du jour</p>
        {rateCard ? (
          <>
            <p className="mt-1 text-2xl font-bold">
              1 {rateCard.rate.from_currency_code} = {formatRate(rateCard.rate.rate)} {rateCard.rate.to_currency_code}
            </p>
            {rateCard.minFee !== null && (
              <p className="mt-1 text-xs text-blue-100">
                {rateCard.minFee > 0 ? `Frais à partir de ${formatRate(rateCard.minFee)} %` : "Sans frais de retrait sur certains moyens"}
              </p>
            )}
          </>
        ) : rates === null || recent === null ? (
          <Spinner className="mt-2 h-6 w-6 text-white" />
        ) : (
          <p className="mt-1 text-sm text-blue-100">Aucun taux disponible pour le moment</p>
        )}
        <Link
          to="/envoyer"
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-yellow-400 px-4 py-2 text-sm font-bold text-blue-950 hover:bg-yellow-300"
        >
          <Send className="h-4 w-4" /> Envoyer de l'argent
        </Link>
      </section>

      {/* Envoi rapide */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold text-gray-900 dark:text-white">Envoi rapide</h2>
          <Link to="/profil/numeros" className={`text-sm ${btn.link}`}>Tout voir</Link>
        </div>
        {shortcuts === null ? (
          <Spinner />
        ) : (
          <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-1">
            {shortcuts.map((b) => (
              <Link key={b.id} to={`/envoyer?beneficiary=${b.id}`} className="flex w-16 shrink-0 flex-col items-center gap-1.5">
                <Avatar name={b.name} size="lg" />
                <span className="w-full truncate text-center text-xs text-gray-700 dark:text-gray-300">{b.name.split(" ")[0]}</span>
              </Link>
            ))}
            <Link to="/profil/numeros?add=beneficiary" className="flex w-16 shrink-0 flex-col items-center gap-1.5">
              <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-blue-400 text-blue-700 dark:text-blue-300">
                <Plus className="h-6 w-6" />
              </span>
              <span className="text-xs text-gray-700 dark:text-gray-300">Ajouter</span>
            </Link>
          </div>
        )}
      </section>

      {/* Dernières transactions */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold text-gray-900 dark:text-white">Dernières transactions</h2>
          <Link to="/transactions" className={`text-sm ${btn.link}`}>Historique</Link>
        </div>
        <Card className="divide-y divide-gray-100 dark:divide-white/5">
          {recent === null ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : recent.length === 0 ? (
            <EmptyState
              icon={ArrowRightLeft}
              title="Aucun envoi pour l'instant"
              text="Vos transferts apparaîtront ici, avec leur statut en direct."
            />
          ) : (
            recent.map((tx) => <TransactionRow key={tx.id} tx={tx} />)
          )}
        </Card>
      </section>
    </div>
  );
}
