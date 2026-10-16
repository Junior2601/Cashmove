// client/components/LockScreen.jsx — déverrouillage de l'app par code PIN (CPT-03)
// Affiché à l'ouverture de l'app et au retour après une absence (session.js).
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Delete } from "lucide-react";
import clientApi, { apiError } from "../api";
import { useClientSession } from "../session";
import { isNetworkError } from "../offline";
import { savePinVerifier, verifyPinLocally, hasPinVerifier } from "../pinVerifier";
import { Avatar, Spinner } from "./ui";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

export default function LockScreen() {
  const navigate = useNavigate();
  const { client, offline, unlock, endSession, logout } = useClientSession();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [shake, setShake] = useState(false);
  const [confirmForgot, setConfirmForgot] = useState(false);

  const fullName = `${client?.first_name || ""} ${client?.last_name || ""}`.trim();

  // Session fermée (trop d'essais, PIN oublié) : retour à la connexion par e-mail
  const leave = useCallback(
    (message) => {
      endSession();
      navigate("/connexion", { replace: true, state: { message } });
    },
    [endSession, navigate]
  );

  const fail = (message) => {
    setError(message);
    setPin("");
    setShake(true);
    setTimeout(() => setShake(false), 400);
  };

  const check = useCallback(
    async (value) => {
      setChecking(true);
      setError("");
      try {
        let result;
        try {
          result = (await clientApi.post("me/pin/verify", { pin: value })).data.data;
          if (result.valid) savePinVerifier(client.id, value);
        } catch (err) {
          // Hors ligne : comparaison avec l'empreinte gardée sur l'appareil
          if (!isNetworkError(err)) throw err;
          if (!hasPinVerifier(client.id)) {
            return fail("Connexion internet nécessaire pour vérifier votre code PIN.");
          }
          result = await verifyPinLocally(client.id, value);
          if (!result.valid && result.attempts_left === 0) {
            return leave("Trop d'essais. Reconnectez-vous avec votre e-mail.");
          }
        }
        if (result.valid) return unlock();
        fail(`Code incorrect. ${result.attempts_left} essai${result.attempts_left > 1 ? "s" : ""} restant${result.attempts_left > 1 ? "s" : ""}.`);
      } catch (err) {
        if (err?.response?.status === 423) return leave(err.response.data.message);
        fail(apiError(err, "Vérification impossible"));
      } finally {
        setChecking(false);
      }
    },
    [client, unlock, leave]
  );

  const press = useCallback(
    (key) => {
      if (checking) return;
      if (key === "del") return setPin((p) => p.slice(0, -1));
      if (!/^\d$/.test(key) || pin.length >= 4) return;
      const next = pin + key;
      setPin(next);
      if (next.length === 4) check(next);
    },
    [checking, check, pin]
  );

  // Clavier physique (ordinateur)
  useEffect(() => {
    const onKey = (e) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") press("del");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press]);

  const forgot = async () => {
    try {
      await clientApi.post("me/pin/forgot");
    } catch {
      // même sans réponse, on ferme la session locale : la reconnexion par e-mail suit
    }
    leave("Code PIN supprimé. Reconnectez-vous avec votre e-mail, puis créez un nouveau code dans votre profil.");
  };

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-gradient-to-b from-blue-700 via-blue-800 to-blue-950 text-white" role="dialog" aria-modal="true" aria-label="Déverrouiller MoveCash">
      <div className="mx-auto flex min-h-dvh max-w-sm flex-col items-center px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(3rem,env(safe-area-inset-top))]">
        <Avatar name={fullName} size="lg" />
        <p className="mt-3 text-lg font-semibold">Bonjour {client?.first_name}</p>
        <p className="text-sm text-blue-100">Saisissez votre code PIN</p>

        <div className={`mt-8 flex gap-4 ${shake ? "animate-shake" : ""}`} aria-live="polite" aria-label={`${pin.length} chiffre${pin.length > 1 ? "s" : ""} saisi${pin.length > 1 ? "s" : ""} sur 4`}>
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={`h-4 w-4 rounded-full border-2 border-white transition ${i < pin.length ? "bg-white" : "bg-transparent"}`} />
          ))}
        </div>

        <div className="mt-4 flex min-h-12 items-center justify-center text-center">
          {checking ? (
            <Spinner className="h-5 w-5 text-white" />
          ) : error ? (
            <p role="alert" className="rounded-xl bg-red-500/25 px-4 py-2 text-sm text-red-50">{error}</p>
          ) : offline ? (
            <p className="text-xs text-blue-200">Hors ligne · vérification sur cet appareil</p>
          ) : null}
        </div>

        <div className="mt-2 grid w-full grid-cols-3 gap-4">
          {KEYS.map((key, i) =>
            key === "" ? (
              <span key={i} />
            ) : (
              <button
                key={i}
                type="button"
                onClick={() => press(key)}
                disabled={checking}
                aria-label={key === "del" ? "Effacer" : key}
                className="flex h-16 items-center justify-center rounded-full text-2xl font-semibold transition hover:bg-white/10 active:bg-white/20 disabled:opacity-50"
              >
                {key === "del" ? <Delete className="h-6 w-6" /> : key}
              </button>
            )
          )}
        </div>

        <div className="mt-auto pt-8 text-center">
          {confirmForgot ? (
            <div className="space-y-3 rounded-2xl bg-white/10 p-4 text-sm">
              <p>Votre code PIN sera supprimé et vous serez déconnecté de tous vos appareils. Vous vous reconnecterez avec votre e-mail.</p>
              <div className="flex justify-center gap-3">
                <button type="button" onClick={() => setConfirmForgot(false)} className="rounded-full px-4 py-2 font-semibold text-blue-100 hover:bg-white/10">
                  Annuler
                </button>
                <button type="button" onClick={forgot} className="rounded-full bg-yellow-400 px-4 py-2 font-bold text-blue-950 hover:bg-yellow-300">
                  Continuer
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <button type="button" onClick={() => setConfirmForgot(true)} className="text-sm font-semibold text-yellow-300 underline underline-offset-4">
                Code PIN oublié ?
              </button>
              <button
                type="button"
                onClick={async () => {
                  await logout();   // révoque aussi la session côté serveur
                  navigate("/connexion", { replace: true });
                }}
                className="text-sm text-blue-100 underline underline-offset-4"
              >
                Ce n'est pas mon compte · se déconnecter
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
