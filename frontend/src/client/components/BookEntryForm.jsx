// client/components/BookEntryForm.jsx
// Formulaire commun « numéro d'envoi » / « bénéficiaire » (cahier V2 · NUM-01..04)
import { useMemo, useState } from "react";
import { Star } from "lucide-react";
import useReferenceData from "../useReferenceData";
import { Field, ErrorBox, Spinner, Flag } from "./ui";
import PhoneNote from "../../components/PhoneNote";
import { inputClass, btn } from "../styles";

const localPart = (phone, prefix) =>
  phone && prefix && phone.startsWith(prefix) ? phone.slice(prefix.length) : phone || "";

/**
 * kind      : "account" | "beneficiary"
 * initial   : entrée existante (édition) ou valeurs de départ
 * countryFilter : (country) => bool — limite les pays proposés
 * onSubmit  : async (payload) => void ; payload = { label|name, country_id, payment_method_id, phone, is_default|is_favorite }
 * submitLabel, extra : bouton et contenu additionnel (ex. case « enregistrer »)
 */
export default function BookEntryForm({ kind, initial = {}, countryFilter, onSubmit, submitLabel = "Enregistrer", extra }) {
  const { data, loading, error: refError } = useReferenceData();
  const isAccount = kind === "account";

  const [form, setForm] = useState(() => ({
    name: (isAccount ? initial.label : initial.name) || "",
    country_id: initial.country_id ? String(initial.country_id) : "",
    payment_method_id: initial.payment_method_id ? String(initial.payment_method_id) : "",
    phone: localPart(initial.phone, initial.phone_prefix),
    flag: !!(isAccount ? initial.is_default : initial.is_favorite),
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const countries = useMemo(
    () => (data?.countries || []).filter((c) => !countryFilter || countryFilter(c)),
    [data, countryFilter]
  );
  const country = data?.countryById[form.country_id];
  const methods = (data?.methodsByCountry[form.country_id] || []).filter((m) => m.is_active !== false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!isAccount && !form.name.trim()) return setError("Indiquez le nom du bénéficiaire");
    if (!form.country_id || !form.payment_method_id || !form.phone.trim()) {
      return setError("Pays, moyen de paiement et numéro sont requis");
    }
    setSaving(true);
    try {
      await onSubmit({
        [isAccount ? "label" : "name"]: form.name.trim() || null,
        country_id: Number(form.country_id),
        payment_method_id: Number(form.payment_method_id),
        phone: form.phone,
        [isAccount ? "is_default" : "is_favorite"]: form.flag,
      });
    } catch (err) {
      setError(err?.message || "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-8"><Spinner /></div>;
  if (refError) return <ErrorBox>{refError}</ErrorBox>;

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pb-2">
      <Field label={isAccount ? "Libellé (facultatif)" : "Nom du bénéficiaire"} htmlFor="be-name">
        <input
          id="be-name"
          className={inputClass}
          value={form.name}
          onChange={set("name")}
          placeholder={isAccount ? "Perso, Pro…" : "Moussa Diop"}
          maxLength={isAccount ? 50 : 100}
          autoComplete={isAccount ? "off" : "name"}
        />
      </Field>

      <Field label={isAccount ? "Pays d'envoi" : "Pays de réception"} htmlFor="be-country">
        <div className="relative">
          {country && <Flag country={country.name} className="pointer-events-none absolute left-4 top-1/2 h-4 w-6 -translate-y-1/2" />}
          <select
            id="be-country"
            className={`${inputClass} ${country ? "pl-12" : ""}`}
            value={form.country_id}
            onChange={(e) => setForm((f) => ({ ...f, country_id: e.target.value, payment_method_id: "" }))}
          >
            <option value="">Choisir un pays</option>
            {countries.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </Field>

      <Field label={isAccount ? "Moyen d'envoi" : "Moyen de réception"} htmlFor="be-method">
        <select
          id="be-method"
          className={inputClass}
          value={form.payment_method_id}
          onChange={set("payment_method_id")}
          disabled={!form.country_id}
        >
          <option value="">{form.country_id ? "Choisir un moyen" : "Choisissez d'abord un pays"}</option>
          {methods.map((m) => (
            <option key={m.id} value={m.id}>{m.method}</option>
          ))}
        </select>
      </Field>

      <Field label="Numéro" htmlFor="be-phone">
        <div className="flex">
          <span className="inline-flex items-center rounded-l-xl border border-r-0 border-gray-300 bg-gray-100 px-3 text-sm text-gray-600 dark:border-white/15 dark:bg-slate-800 dark:text-gray-300">
            {country?.phone_prefix || "+…"}
          </span>
          <input
            id="be-phone"
            className={`${inputClass} rounded-l-none`}
            value={form.phone}
            onChange={set("phone")}
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="07 12 34 56 78"
            aria-describedby="be-phone-note"
          />
        </div>
        <PhoneNote
          id="be-phone-note"
          prefix={country?.phone_prefix}
          value={form.phone}
          role={isAccount ? "account" : "beneficiary"}
          method={methods.find((m) => String(m.id) === form.payment_method_id)?.method}
          className="dark:[&_p]:text-gray-400"
        />
      </Field>

      <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-white px-4 py-3 ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-white/10">
        <input
          type="checkbox"
          className="h-5 w-5 accent-blue-700"
          checked={form.flag}
          onChange={(e) => setForm((f) => ({ ...f, flag: e.target.checked }))}
        />
        <Star className="h-5 w-5 text-amber-400" fill={form.flag ? "currentColor" : "none"} />
        <span className="text-sm font-medium">{isAccount ? "Numéro par défaut" : "Favori (raccourci sur l'accueil)"}</span>
      </label>

      {extra}
      <ErrorBox>{error}</ErrorBox>

      <button type="submit" className={btn.primary} disabled={saving}>
        {saving && <Spinner className="h-5 w-5 text-white" />}
        {submitLabel}
      </button>
    </form>
  );
}
