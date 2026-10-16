// client/pages/History.jsx — historique paginé et filtrable (TRX-04)
import { useEffect, useState } from "react";
import { History as HistoryIcon, Search } from "lucide-react";
import clientApi, { apiError } from "../api";
import { useLiveEvent } from "../realtime";
import { fetchWithOffline } from "../offline";
import { Card, EmptyState, ErrorBox, PageHeader, Spinner } from "../components/ui";
import { btn, inputClass } from "../styles";
import TransactionRow from "../components/TransactionRow";
import { dayGroup } from "../format";

const STATUS_FILTERS = [
  { value: "", label: "Toutes" },
  { value: "en_attente", label: "En attente" },
  { value: "validee", label: "En cours" },
  { value: "effectuee", label: "Terminées" },
  { value: "echouee,annulee,expiree", label: "Échouées" },
];

const PERIODS = [
  { value: "", label: "Toute période" },
  { value: "7", label: "7 derniers jours" },
  { value: "30", label: "30 derniers jours" },
  { value: "90", label: "3 derniers mois" },
];

const isoDaysAgo = (days) => {
  const d = new Date();
  d.setDate(d.getDate() - Number(days));
  return d.toISOString().slice(0, 10);
};

export default function History() {
  const [status, setStatus] = useState("");
  const [period, setPeriod] = useState("");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState(null);
  const [loadedKey, setLoadedKey] = useState(null);   // filtres des données affichées
  const [reloadTick, setReloadTick] = useState(0);     // rechargement en direct
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  // Recherche différée pendant la saisie
  useEffect(() => {
    const t = setTimeout(() => setQuery(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const fetchPage = async (p) => {
    const request = async () =>
      (
        await clientApi.get("me/transactions", {
          params: {
            page: p,
            limit: 20,
            status: status || undefined,
            q: query || undefined,
            from: period ? isoDaysAgo(period) : undefined,
          },
        })
      ).data.data;
    // Première page sans filtre : consultable hors ligne (§10)
    if (p === 1 && !status && !period && !query) return (await fetchWithOffline("history", request)).data;
    return request();
  };

  const filterKey = `${status}|${period}|${query}`;

  useEffect(() => {
    let alive = true;
    fetchPage(1)
      .then((d) => {
        if (!alive) return;
        setItems(d.items);
        setPage(1);
        setPages(d.pagination.pages);
        setError("");
        setLoadedKey(filterKey);
      })
      .catch((err) => {
        if (!alive) return;
        setError(apiError(err));
        setLoadedKey(filterKey);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey, reloadTick]);

  // Un statut a changé ou retour en ligne : la liste se met à jour sans rechargement
  useLiveEvent("mc:transaction", () => setReloadTick((t) => t + 1));
  useLiveEvent("mc:resync", () => setReloadTick((t) => t + 1));

  const stale = loadedKey !== filterKey;

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const d = await fetchPage(page + 1);
      setItems((list) => [...list, ...d.items]);
      setPage(page + 1);
      setPages(d.pagination.pages);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoadingMore(false);
    }
  };

  // Regroupement par jour pour la lisibilité
  const groups = [];
  for (const tx of items || []) {
    const label = dayGroup(tx.created_at);
    if (!groups.length || groups[groups.length - 1].label !== label) groups.push({ label, items: [] });
    groups[groups.length - 1].items.push(tx);
  }

  return (
    <div>
      <PageHeader title="Historique" />
      <div className="space-y-3 px-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            className={`${inputClass} pl-12`}
            placeholder="Bénéficiaire, numéro ou référence"
            aria-label="Rechercher une transaction"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="Filtrer par statut">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatus(f.value)}
              aria-pressed={status === f.value}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${
                status === f.value
                  ? "bg-blue-700 text-white"
                  : "bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50 dark:bg-slate-900 dark:text-gray-300 dark:ring-white/10"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <select className={inputClass} value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Période">
          {PERIODS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>

        <ErrorBox>{error}</ErrorBox>

        {stale ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : items?.length === 0 ? (
          <Card>
            <EmptyState
              icon={HistoryIcon}
              title={status || period || query ? "Aucun résultat" : "Aucune transaction"}
              text={status || period || query ? "Essayez d'autres filtres." : "Vos envois apparaîtront ici."}
            />
          </Card>
        ) : (
          <>
            {groups.map((g) => (
              <section key={g.label}>
                <h2 className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{g.label}</h2>
                <Card className="divide-y divide-gray-100 dark:divide-white/5">
                  {g.items.map((tx) => <TransactionRow key={tx.id} tx={tx} />)}
                </Card>
              </section>
            ))}
            {page < pages && (
              <button type="button" className={btn.secondary} onClick={loadMore} disabled={loadingMore}>
                {loadingMore && <Spinner className="h-5 w-5 text-blue-700" />}
                Charger plus
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
