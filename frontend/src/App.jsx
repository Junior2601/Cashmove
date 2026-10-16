import { useEffect } from "react";
import AppRoutes from "./routes";
import { useClientSession } from "./client/session";
import UpdateBanner from "./pwa/UpdateBanner";

function App() {
  // Reprend la session client (cookie mc_refresh) au chargement
  const bootstrap = useClientSession((s) => s.bootstrap);
  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  return (
    <>
      <AppRoutes />
      <UpdateBanner />
    </>
  );
}

export default App;