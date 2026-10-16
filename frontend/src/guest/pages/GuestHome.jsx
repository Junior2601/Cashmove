// guest/pages/GuestHome.jsx — accueil des visiteurs (remplace le carrousel, cahier V2 · §5)
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Send, Search, Calculator, Headphones, Zap, ShieldCheck, TrendingUp, Check, ArrowRight, UserPlus } from "lucide-react";
import clientApi from "../../client/api";
import { formatRate } from "../../client/format";
import { InstallCard } from "../../client/components/PwaCards";

const ACTIONS = [
  { to: "/envoyer", label: "Envoyer", text: "Nouveau transfert", icon: Send, cls: "bg-blue-700 text-white" },
  { to: "/suivi", label: "Suivre", text: "Avec la référence", icon: Search, cls: "bg-emerald-100 text-emerald-700" },
  { to: "/calculatrice", label: "Calculer", text: "Combien il reçoit", icon: Calculator, cls: "bg-amber-100 text-amber-700" },
  { to: "/aide", label: "Aide", text: "Agents WhatsApp", icon: Headphones, cls: "bg-violet-100 text-violet-700" },
];

const STEPS = [
  { title: "Remplissez le formulaire", text: "Pays, numéros et montant : le montant reçu s'affiche avant de valider." },
  { title: "Payez l'agent", text: "Envoyez la somme au numéro indiqué dans les 5 minutes, puis confirmez." },
  { title: "Le bénéficiaire reçoit", text: "Un agent effectue le transfert. Suivez-le avec votre référence." },
];

const PERKS = [
  { icon: Zap, title: "Transferts rapides", text: "Traités en quelques minutes" },
  { icon: TrendingUp, title: "Taux compétitifs", text: "Affichés avant chaque envoi" },
  { icon: ShieldCheck, title: "Sécurisé", text: "Agents vérifiés, suivi par référence" },
];

function ActionIcon({ icon, className }) {
  const Icon = icon;
  return <Icon className={className} />;
}

export default function GuestHome() {
  const [rates, setRates] = useState(null);

  useEffect(() => {
    let alive = true;
    clientApi
      .get("rates/active")
      .then((r) => alive && setRates(r.data.data || []))
      .catch(() => alive && setRates([]));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="space-y-6 px-4 pt-4">
      {/* Accroche */}
      <section className="overflow-hidden rounded-3xl bg-linear-to-br from-blue-700 to-blue-950 p-6 text-white shadow-lg shadow-blue-900/20">
        <p className="text-sm font-medium text-blue-200">Russie ⇄ Afrique</p>
        <h1 className="mt-1 text-2xl font-extrabold leading-tight sm:text-3xl">
          Transférez de l'argent en quelques minutes
        </h1>
        <p className="mt-2 text-sm text-blue-100">Rapide, sécurisé et sans création de compte.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link to="/envoyer" className="inline-flex items-center gap-2 rounded-full bg-yellow-400 px-5 py-2.5 text-sm font-bold text-blue-950 hover:bg-yellow-300">
            <Send className="h-4 w-4" /> Envoyer de l'argent
          </Link>
          <Link to="/suivi" className="inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold text-white ring-1 ring-white/25 hover:bg-white/20">
            <Search className="h-4 w-4" /> Suivre un transfert
          </Link>
        </div>
      </section>

      <InstallCard />

      {/* Raccourcis */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {ACTIONS.map(({ to, label, text, icon, cls }) => (
          <Link key={to} to={to} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 transition hover:ring-blue-300">
            <span className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl ${cls}`}>
              <ActionIcon icon={icon} className="h-5 w-5" />
            </span>
            <p className="font-semibold text-gray-900">{label}</p>
            <p className="text-xs text-gray-500">{text}</p>
          </Link>
        ))}
      </section>

      {/* Taux du jour */}
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">Taux du jour</h2>
          <Link to="/calculatrice" className="text-sm font-semibold text-blue-700 hover:underline">Calculer</Link>
        </div>
        {rates === null ? (
          <div className="space-y-2" aria-label="Chargement des taux">
            {[0, 1].map((i) => <div key={i} className="h-10 animate-pulse rounded-xl bg-gray-100" />)}
          </div>
        ) : rates.length === 0 ? (
          <p className="text-sm text-gray-500">Aucun taux publié pour le moment.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {rates.map((r) => (
              <li key={r.id} className="flex items-center justify-between py-2.5">
                <span className="text-sm text-gray-500">{r.from_currency_code} → {r.to_currency_code}</span>
                <span className="font-semibold text-gray-900">
                  1 {r.from_currency_code} = {formatRate(r.rate)} {r.to_currency_code}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Comment ça marche */}
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <h2 className="mb-4 font-bold text-gray-900">Comment ça marche</h2>
        <ol className="space-y-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-700 text-sm font-bold text-white">{i + 1}</span>
              <div>
                <p className="font-semibold text-gray-900">{s.title}</p>
                <p className="text-sm text-gray-500">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Avantages */}
      <section className="grid gap-3 sm:grid-cols-3">
        {PERKS.map(({ icon, title, text }) => (
          <div key={title} className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <ActionIcon icon={icon} className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold text-gray-900">{title}</p>
              <p className="text-xs text-gray-500">{text}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Compte client */}
      <section className="rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/60 p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-700 text-white">
            <UserPlus className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="font-bold text-gray-900">Envoyez plus vite avec un compte gratuit</h2>
            <ul className="mt-2 space-y-1 text-sm text-gray-700">
              {["Vos numéros et bénéficiaires enregistrés", "Historique de tous vos transferts", "Alertes en direct à chaque étape"].map((t) => (
                <li key={t} className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600" /> {t}</li>
              ))}
            </ul>
            <Link to="/connexion" className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-blue-700 hover:underline">
              Créer mon compte avec mon e-mail <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
