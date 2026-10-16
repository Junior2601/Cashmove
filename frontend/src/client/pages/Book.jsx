// client/pages/Book.jsx — mes numéros d'envoi et bénéficiaires (maquette F · NUM-01..04)
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Star, Trash2, UserPlus } from "lucide-react";
import clientApi, { apiError } from "../api";
import { Avatar, Card, EmptyState, ErrorBox, FullPageSpinner, MethodLogo, PageHeader, Sheet } from "../components/ui";
import { btn } from "../styles";
import BookEntryForm from "../components/BookEntryForm";

const ENDPOINT = { account: "me/accounts", beneficiary: "me/beneficiaries" };

export default function Book() {
  const [params, setParams] = useSearchParams();
  const [accounts, setAccounts] = useState(null);
  const [beneficiaries, setBeneficiaries] = useState(null);
  const [error, setError] = useState("");
  // { kind: "account" | "beneficiary", entry?: objet existant }
  const [editing, setEditing] = useState(() => {
    const add = params.get("add");
    return add === "beneficiary" || add === "account" ? { kind: add } : null;
  });
  const [confirmDelete, setConfirmDelete] = useState(false);

  const reload = async () => {
    try {
      const [a, b] = await Promise.all([clientApi.get(ENDPOINT.account), clientApi.get(ENDPOINT.beneficiary)]);
      setAccounts(a.data.data);
      setBeneficiaries(b.data.data);
    } catch (err) {
      setError(apiError(err));
    }
  };

  useEffect(() => {
    let alive = true;
    Promise.all([clientApi.get(ENDPOINT.account), clientApi.get(ENDPOINT.beneficiary)])
      .then(([a, b]) => {
        if (!alive) return;
        setAccounts(a.data.data);
        setBeneficiaries(b.data.data);
      })
      .catch((err) => alive && setError(apiError(err)));
    return () => {
      alive = false;
    };
  }, []);

  const close = () => {
    setEditing(null);
    setConfirmDelete(false);
    if (params.get("add")) setParams({}, { replace: true });
  };

  const save = async (payload) => {
    const { kind, entry } = editing;
    try {
      if (entry) await clientApi.patch(`${ENDPOINT[kind]}/${entry.id}`, payload);
      else await clientApi.post(ENDPOINT[kind], payload);
    } catch (err) {
      throw new Error(apiError(err));
    }
    await reload();
    close();
  };

  const remove = async () => {
    const { kind, entry } = editing;
    try {
      await clientApi.delete(`${ENDPOINT[kind]}/${entry.id}`);
      await reload();
      close();
    } catch (err) {
      setError(apiError(err));
      close();
    }
  };

  const toggleFlag = async (kind, entry) => {
    const key = kind === "account" ? "is_default" : "is_favorite";
    if (kind === "account" && entry.is_default) return;  // il faut toujours un numéro par défaut
    try {
      await clientApi.patch(`${ENDPOINT[kind]}/${entry.id}`, { [key]: !entry[key] });
      await reload();
    } catch (err) {
      setError(apiError(err));
    }
  };

  if (accounts === null && !error) return <FullPageSpinner />;

  const isAccount = editing?.kind === "account";

  return (
    <div>
      <PageHeader title="Mes numéros" back="/profil" />
      <div className="space-y-6 px-4">
        <ErrorBox>{error}</ErrorBox>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-bold text-gray-900 dark:text-white">Numéros d'envoi</h2>
            <button type="button" onClick={() => setEditing({ kind: "account" })} className={`flex items-center gap-1 text-sm ${btn.link}`}>
              <Plus className="h-4 w-4" /> Ajouter
            </button>
          </div>
          <Card className="divide-y divide-gray-100 dark:divide-white/5">
            {accounts?.length ? (
              accounts.map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                  <button type="button" onClick={() => setEditing({ kind: "account", entry: a })} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <MethodLogo method={a.payment_method_name} />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{a.label ? `${a.label} · ` : ""}{a.payment_method_name}</span>
                      <span className="block truncate text-sm text-gray-500 dark:text-gray-400">{a.country_name} · {a.phone_masked}</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleFlag("account", a)}
                    className="rounded-full p-2 hover:bg-black/5 dark:hover:bg-white/10"
                    aria-label={a.is_default ? "Numéro par défaut" : "Définir comme numéro par défaut"}
                    aria-pressed={a.is_default}
                  >
                    <Star className={`h-5 w-5 ${a.is_default ? "text-amber-400" : "text-gray-300 dark:text-gray-600"}`} fill={a.is_default ? "currentColor" : "none"} />
                  </button>
                </div>
              ))
            ) : (
              <EmptyState title="Aucun numéro enregistré" text="Ajoutez le compte depuis lequel vous payez : il sera pré-rempli à chaque envoi." />
            )}
          </Card>
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-bold text-gray-900 dark:text-white">Bénéficiaires</h2>
            <button type="button" onClick={() => setEditing({ kind: "beneficiary" })} className={`flex items-center gap-1 text-sm ${btn.link}`}>
              <Plus className="h-4 w-4" /> Ajouter
            </button>
          </div>
          <Card className="divide-y divide-gray-100 dark:divide-white/5">
            {beneficiaries?.length ? (
              beneficiaries.map((b) => (
                <div key={b.id} className="flex items-center gap-3 px-4 py-3">
                  <button type="button" onClick={() => setEditing({ kind: "beneficiary", entry: b })} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <Avatar name={b.name} />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{b.name}</span>
                      <span className="block truncate text-sm text-gray-500 dark:text-gray-400">
                        {b.payment_method_name} · {b.country_name} · {b.phone_masked}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleFlag("beneficiary", b)}
                    className="rounded-full p-2 hover:bg-black/5 dark:hover:bg-white/10"
                    aria-label={b.is_favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                    aria-pressed={b.is_favorite}
                  >
                    <Star className={`h-5 w-5 ${b.is_favorite ? "text-amber-400" : "text-gray-300 dark:text-gray-600"}`} fill={b.is_favorite ? "currentColor" : "none"} />
                  </button>
                </div>
              ))
            ) : (
              <EmptyState
                icon={UserPlus}
                title="Aucun bénéficiaire"
                text="Enregistrez vos proches pour leur envoyer de l'argent en deux gestes."
              />
            )}
          </Card>
        </section>
      </div>

      <Sheet
        open={!!editing}
        onClose={close}
        title={editing?.entry ? (isAccount ? "Modifier le numéro" : "Modifier le bénéficiaire") : isAccount ? "Nouveau numéro d'envoi" : "Nouveau bénéficiaire"}
      >
        {editing && (
          <>
            <BookEntryForm
              key={`${editing.kind}-${editing.entry?.id || "new"}`}
              kind={editing.kind}
              initial={editing.entry || (isAccount ? { is_default: !accounts?.length } : {})}
              onSubmit={save}
            />
            {editing.entry && (
              confirmDelete ? (
                <div className="mt-3 space-y-2 rounded-xl bg-red-50 p-3 dark:bg-red-500/10">
                  <p className="text-sm text-red-800 dark:text-red-200">Supprimer définitivement cette entrée ?</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" className={btn.secondary} onClick={() => setConfirmDelete(false)}>Annuler</button>
                    <button type="button" className={btn.danger} onClick={remove}>Supprimer</button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirmDelete(true)} className="mt-3 flex w-full items-center justify-center gap-2 py-3 text-sm font-semibold text-red-600">
                  <Trash2 className="h-4 w-4" /> Supprimer
                </button>
              )
            )}
          </>
        )}
      </Sheet>
    </div>
  );
}
