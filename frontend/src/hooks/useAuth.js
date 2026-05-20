import { useNavigate } from "react-router-dom";

/**
 * useAuth — hook utilitaire pour lire la session et se déconnecter.
 *
 * Retourne :
 *   - user  : { id, name, email, role, ... } | null
 *   - token : string | null
 *   - logout: () => void  (vide le localStorage et redirige vers /login)
 *
 * Exemple :
 *   const { user, logout } = useAuth();
 *   <span>{user?.name}</span>
 *   <button onClick={logout}>Déconnexion</button>
 */
function useAuth() {
  const navigate = useNavigate();
 
  const token = localStorage.getItem("token");
 
  let user = null;
  try {
    const raw = localStorage.getItem("user");
    if (raw) user = JSON.parse(raw);
  } catch {
    // JSON corrompu — on ignore
  }
 
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };
 
  return { user, token, logout };
}
 
export default useAuth;