// guest/pages/GuestPages.jsx — écrans invités (une route chacun, plus de sections empilées)
// Ils réutilisent les formulaires existants, sans modifier leur fonctionnement.
import { Link } from "react-router-dom";
import { UserPlus } from "lucide-react";
import TransactionForm from "../../components/public/TransactionForm";
import TrackingForm from "../../components/public/TrackingForm";
import ConversionCalculator from "../../components/public/ConversionCalculator";
import ServiceClient from "../../components/public/ServiceClient";

function Page({ title, subtitle, children, footer }) {
  return (
    <div className="space-y-4 px-4 pt-4">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>}
      </header>
      {/* Les formulaires historiques gèrent leurs propres marges latérales */}
      <div className="-mx-2 sm:mx-0">{children}</div>
      {footer}
    </div>
  );
}

function AccountHint({ text }) {
  return (
    <Link
      to="/connexion"
      className="flex items-center gap-3 rounded-2xl bg-blue-50 p-4 text-sm text-blue-900 ring-1 ring-blue-100 hover:bg-blue-100"
    >
      <UserPlus className="h-5 w-5 shrink-0 text-blue-700" />
      <span>{text} <strong className="text-blue-700">Créer un compte</strong></span>
    </Link>
  );
}

export function GuestSend() {
  return (
    <Page
      title="Envoyer"
      subtitle="Sans compte : remplissez le formulaire, puis payez l'agent au numéro indiqué."
      footer={<AccountHint text="Vos numéros et bénéficiaires pré-remplis à chaque envoi ?" />}
    >
      <TransactionForm />
    </Page>
  );
}

export function GuestTrack() {
  return (
    <Page
      title="Suivre un transfert"
      subtitle="Saisissez la référence reçue après votre envoi (ex. TRX…)."
      footer={<AccountHint text="Retrouvez tous vos envois et suivez-les en direct." />}
    >
      <TrackingForm />
    </Page>
  );
}

export function GuestCalculator() {
  return (
    <Page title="Calculatrice" subtitle="Combien recevra votre bénéficiaire, au taux du jour.">
      <ConversionCalculator />
    </Page>
  );
}

export function GuestSupport() {
  return (
    <Page title="Aide" subtitle="Une question sur un transfert ? Écrivez à un agent sur WhatsApp.">
      <ServiceClient />
    </Page>
  );
}
