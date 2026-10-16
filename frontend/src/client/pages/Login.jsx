// client/pages/Login.jsx — connexion / inscription par e-mail + code (maquette A)
import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, Mail } from "lucide-react";
import clientApi, { apiError } from "../api";
import { useClientSession } from "../session";
import useReferenceData from "../useReferenceData";
import { Spinner } from "../components/ui";
import PhoneNote from "../../components/PhoneNote";
import logo from "../../assets/logo.png";

const darkInput =
  "w-full rounded-xl border border-white/25 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-blue-200/70 focus:border-yellow-300 focus:ring-2 focus:ring-yellow-300/30";

function CodeBoxes({ value, onChange, disabled }) {
  const inputRef = useRef(null);
  useEffect(() => inputRef.current?.focus(), []);
  return (
    <div className="relative" onClick={() => inputRef.current?.focus()}>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
        inputMode="numeric"
        autoComplete="one-time-code"
        aria-label="Code à 6 chiffres"
        disabled={disabled}
        className="absolute inset-0 h-full w-full cursor-text opacity-0"
      />
      <div className="grid grid-cols-6 gap-2" aria-hidden="true">
        {Array.from({ length: 6 }).map((_, i) => {
          const active = i === Math.min(value.length, 5);
          return (
            <span
              key={i}
              className={`flex h-14 items-center justify-center rounded-xl border-2 text-2xl font-bold text-white transition ${
                active ? "border-yellow-300 bg-white/15" : "border-white/25 bg-white/10"
              }`}
            >
              {value[i] || ""}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { status, login } = useClientSession();
  const { data: ref } = useReferenceData();

  const [step, setStep] = useState("email");      // "email" | "code"
  const [email, setEmail] = useState("");
  const [info, setInfo] = useState(null);         // réponse de /email/request
  const [code, setCode] = useState("");
  const [reg, setReg] = useState({ first_name: "", last_name: "", country_id: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  if (status === "authed") return <Navigate to={location.state?.from || "/"} replace />;

  const requestCode = async (e) => {
    e?.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await clientApi.post("auth/email/request", { email });
      setInfo(res.data.data);
      setResendIn(res.data.data.resend_in);
      setCode("");
      setStep("code");
    } catch (err) {
      const retry = err?.response?.data?.retry_after;
      if (retry && step === "code") setResendIn(retry);
      setError(apiError(err, "Envoi du code impossible"));
    } finally {
      setLoading(false);
    }
  };

  const verify = async (e) => {
    e?.preventDefault();
    setError("");
    if (code.length !== 6) return setError("Saisissez les 6 chiffres reçus par e-mail");
    if (info?.is_new && (!reg.first_name.trim() || !reg.last_name.trim() || !reg.country_id)) {
      return setError("Prénom, nom et pays sont requis pour créer votre compte");
    }
    setLoading(true);
    try {
      const res = await clientApi.post("auth/email/verify", {
        email,
        code,
        ...(info?.is_new ? { ...reg, country_id: Number(reg.country_id) } : {}),
      });
      login(res.data.data);
      navigate(location.state?.from || "/", { replace: true });
    } catch (err) {
      const body = err?.response?.data;
      if (body?.code === "CODE_EXPIRED" || body?.code === "CODE_LOCKED") setCode("");
      setError(
        body?.code === "CODE_INVALID" && body.attempts_left !== undefined
          ? `Code incorrect. ${body.attempts_left} essai${body.attempts_left > 1 ? "s" : ""} restant${body.attempts_left > 1 ? "s" : ""}.`
          : apiError(err, "Vérification impossible")
      );
    } finally {
      setLoading(false);
    }
  };

  const country = ref?.countryById[reg.country_id];

  return (
    <div className="min-h-dvh bg-gradient-to-b from-blue-700 via-blue-800 to-blue-950 text-white">
      <div className="mx-auto flex min-h-dvh max-w-md flex-col px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
        {step === "code" && (
          <button
            type="button"
            onClick={() => { setStep("email"); setError(""); }}
            className="-ml-2 self-start rounded-full p-2 text-blue-100 hover:bg-white/10"
            aria-label="Modifier l'adresse e-mail"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        <div className="mt-8 flex flex-col items-center">
          <span className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-dotted border-yellow-300 bg-white/10 p-3">
            <img src={logo} alt="" className="h-full w-full object-contain" />
          </span>
          <p className="mt-4 text-3xl font-extrabold tracking-tight">
            Move<span className="text-yellow-300">Cash</span>
          </p>
        </div>

        {step === "email" ? (
          <form onSubmit={requestCode} className="mt-10 flex flex-1 flex-col">
            <h1 className="text-2xl font-bold">Connexion</h1>
            <p className="mt-1 text-sm text-blue-100">
              Pas de mot de passe : nous vous envoyons un code par e-mail.
            </p>
            <label htmlFor="login-email" className="mt-6 text-sm font-medium text-blue-100">Adresse e-mail</label>
            <div className="relative mt-1.5">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-blue-200" />
              <input
                id="login-email"
                type="email"
                className={`${darkInput} pl-12`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                inputMode="email"
                placeholder="vous@exemple.com"
                required
                autoFocus
              />
            </div>
            {!error && location.state?.message && (
              <p role="status" className="mt-3 rounded-xl bg-yellow-400/20 px-4 py-3 text-sm text-yellow-50">{location.state.message}</p>
            )}
            {error && <p role="alert" className="mt-3 rounded-xl bg-red-500/20 px-4 py-3 text-sm text-red-100">{error}</p>}

            <div className="mt-auto space-y-4 pt-10">
              <button
                type="submit"
                disabled={loading || !email}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-400 px-4 py-3.5 font-bold text-blue-950 transition hover:bg-yellow-300 disabled:opacity-60"
              >
                {loading && <Spinner className="h-5 w-5 text-blue-950" />}
                Recevoir mon code
              </button>
              <Link to="/" className="block text-center text-sm text-blue-100 underline underline-offset-4">
                Continuer sans compte
              </Link>
              <Link to="/login" className="block text-center text-xs text-blue-200/80 hover:text-white">
                Agent ou administrateur ? Espace professionnel
              </Link>
            </div>
          </form>
        ) : (
          <form onSubmit={verify} className="mt-10 flex flex-1 flex-col">
            <h1 className="text-2xl font-bold">{info?.is_new ? "Créer votre compte" : "Connexion"}</h1>
            <p className="mt-1 text-sm text-blue-100">
              Saisissez le code envoyé à <span className="font-semibold text-white">{info?.email_masked}</span>
            </p>

            <div className="mt-6">
              <CodeBoxes value={code} onChange={setCode} disabled={loading} />
            </div>

            <p className="mt-3 text-sm text-blue-100">
              {resendIn > 0 ? (
                <>Renvoyer le code dans {Math.floor(resendIn / 60)}:{String(resendIn % 60).padStart(2, "0")}</>
              ) : (
                <button type="button" onClick={requestCode} className="font-semibold text-yellow-300 underline underline-offset-4">
                  Renvoyer le code
                </button>
              )}
              <span className="block text-xs text-blue-200/80">Pensez à vérifier vos courriers indésirables.</span>
            </p>

            {info?.is_new && (
              <div className="mt-6 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input
                    className={darkInput}
                    placeholder="Prénom"
                    aria-label="Prénom"
                    autoComplete="given-name"
                    value={reg.first_name}
                    onChange={(e) => setReg((r) => ({ ...r, first_name: e.target.value }))}
                  />
                  <input
                    className={darkInput}
                    placeholder="Nom"
                    aria-label="Nom"
                    autoComplete="family-name"
                    value={reg.last_name}
                    onChange={(e) => setReg((r) => ({ ...r, last_name: e.target.value }))}
                  />
                </div>
                <select
                  className={`${darkInput} [&>option]:text-gray-900`}
                  aria-label="Pays de résidence"
                  value={reg.country_id}
                  onChange={(e) => setReg((r) => ({ ...r, country_id: e.target.value }))}
                >
                  <option value="">Pays de résidence</option>
                  {(ref?.countries || []).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <div className="flex">
                  <span className="inline-flex items-center rounded-l-xl border border-r-0 border-white/25 bg-white/5 px-3 text-sm text-blue-100">
                    {country?.phone_prefix || "+…"}
                  </span>
                  <input
                    className={`${darkInput} rounded-l-none`}
                    placeholder="Téléphone (facultatif)"
                    aria-label="Téléphone (facultatif)"
                    inputMode="tel"
                    autoComplete="tel-national"
                    value={reg.phone}
                    onChange={(e) => setReg((r) => ({ ...r, phone: e.target.value }))}
                  />
                </div>
                <PhoneNote prefix={country?.phone_prefix} value={reg.phone} role="self" variant="dark" />
              </div>
            )}

            {error && <p role="alert" className="mt-4 rounded-xl bg-red-500/20 px-4 py-3 text-sm text-red-100">{error}</p>}

            <div className="mt-auto space-y-4 pt-10">
              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-400 px-4 py-3.5 font-bold text-blue-950 transition hover:bg-yellow-300 disabled:opacity-60"
              >
                {loading && <Spinner className="h-5 w-5 text-blue-950" />}
                {info?.is_new ? "Créer mon compte" : "Valider"}
              </button>
              <Link to="/" className="block text-center text-sm text-blue-100 underline underline-offset-4">
                Continuer sans compte
              </Link>
              <Link to="/login" className="block text-center text-xs text-blue-200/80 hover:text-white">
                Agent ou administrateur ? Espace professionnel
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
