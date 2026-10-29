import { useEffect } from "react";
import AppRoutes from "./routes";
import { useClientSession } from "./client/session";
import UpdateBanner from "./pwa/UpdateBanner";
import HalloweenDecor from "./seasonal/HalloweenDecor";

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
      {/* Du 24 octobre au 1er novembre (seasonal/halloween.js) */}
      <HalloweenDecor />
    </>
  );
}

export default App;