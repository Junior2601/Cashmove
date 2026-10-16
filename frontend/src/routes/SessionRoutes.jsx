// routes/SessionRoutes.jsx — aiguillage invité / client sur les mêmes adresses
//   SessionShell : coquille client (connecté) ou coquille invité (sans compte)
//   BySession    : écran différent selon la session (ex. « / », « /envoyer »)
//   ClientOnly   : écran réservé aux clients connectés (sinon → /connexion)
import { Navigate, useLocation } from "react-router-dom";
import { useClientSession } from "../client/session";
import ClientLayout from "../client/components/ClientLayout";
import GuestLayout from "../guest/GuestLayout";
import { FullPageSpinner } from "../client/components/ui";

export function SessionShell() {
  const status = useClientSession((s) => s.status);
  if (status === "loading") return <FullPageSpinner />;
  return status === "authed" ? <ClientLayout /> : <GuestLayout />;
}

export function BySession({ client, guest }) {
  const status = useClientSession((s) => s.status);
  return status === "authed" ? client : guest;
}

export function ClientOnly({ children }) {
  const status = useClientSession((s) => s.status);
  const location = useLocation();
  if (status !== "authed") {
    return <Navigate to="/connexion" replace state={{ from: location.pathname + location.search }} />;
  }
  return children;
}
