import { Navigate } from "react-router-dom";

/**
 * Récupère et décode le user stocké dans localStorage.
 * Retourne null si absent ou invalide.
 */
function getStoredUser() {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * ProtectedRoute — protège une route selon le rôle.
 *
 * Props :
 *   - roles   : string[] — rôles autorisés, ex. ["admin"] ou ["admin","semi-admin"]
 *   - children: ReactNode — la page à afficher si autorisé
 *
 * Comportement :
 *   - Pas de token           → redirige vers /login
 *   - Token présent, mauvais rôle → redirige vers /unauthorized
 *   - OK                     → affiche l'enfant
 *
 * Utilisation :
 *   <Route
 *     path="/admin"
 *     element={
 *       <ProtectedRoute roles={["admin"]}>
 *         <AdminDashboard />
 *       </ProtectedRoute>
 *     }
 *   />
 */
export default function ProtectedRoute({ roles = [], children }) {
  const token = localStorage.getItem("token");
  const user  = getStoredUser();

  // Pas authentifié
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  // Rôle non autorisé
  if (roles.length > 0 && !roles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}