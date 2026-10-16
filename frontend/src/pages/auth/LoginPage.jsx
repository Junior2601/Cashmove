// pages/auth/LoginPage.jsx — connexion du personnel (admin, semi-admin, agent)
// Accessible depuis l'app (lien « Espace professionnel ») : l'app installée
// n'a pas de barre d'adresse pour taper /login.
import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, Briefcase } from "lucide-react";
import api from "../../api/axios";
import logo from "../../assets/logo.png";

const ROLE_CONFIG = {
  admin: {
    endpoint: "/auth/login/admin",
    redirect: "/admin",
    label: "Administrateur",
  },
  "semi-admin": {
    endpoint: "/auth/login/semi-admin",
    redirect: "/semi-admin",
    label: "Semi-admin",
  },
  agent: {
    endpoint: "/auth/login/agent",
    redirect: "/agent",
    label: "Agent",
  },
};

// Session déjà ouverte sur cet appareil → directement dans son espace
const currentSpace = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    return localStorage.getItem("token") && user?.role ? ROLE_CONFIG[user.role]?.redirect : null;
  } catch {
    return null;
  }
};

export default function LoginPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const space = currentSpace();
  if (space) return <Navigate to={space} replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { endpoint, redirect } = ROLE_CONFIG[role];

    try {
      const res = await api.post(endpoint, { email, password });
      const { token, user } = res.data;

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      navigate(redirect, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Erreur de connexion. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  const input =
    "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 disabled:bg-gray-100";

  return (
    <div className="flex min-h-dvh items-center justify-center bg-gray-50 px-4 py-[max(1.5rem,env(safe-area-inset-top))]">
      <div className="w-full max-w-[420px]">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dotted border-yellow-400 bg-blue-700 p-2">
            <img src={logo} alt="" className="h-full w-full object-contain" />
          </span>
          <p className="mt-3 text-2xl font-extrabold tracking-tight text-gray-900">
            Move<span className="text-yellow-500">Cash</span>
          </p>
          <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-gray-500">
            <Briefcase className="h-4 w-4" /> Espace professionnel
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          {/* Sélecteur de rôle */}
          <div className="mb-5 grid grid-cols-3 gap-1 rounded-xl bg-gray-100 p-1" role="group" aria-label="Type de compte">
            {Object.entries(ROLE_CONFIG).map(([key, { label }]) => (
              <button
                key={key}
                type="button"
                aria-pressed={role === key}
                onClick={() => {
                  setRole(key);
                  setError("");
                }}
                className={`rounded-lg px-2 py-2 text-sm font-semibold transition ${
                  role === key ? "bg-white text-blue-700 shadow-sm" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-mail"
              aria-label="E-mail"
              required
              autoComplete="username"
              inputMode="email"
              className={input}
              disabled={loading}
            />

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mot de passe"
                aria-label="Mot de passe"
                required
                autoComplete="current-password"
                className={`${input} pr-12`}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-blue-700"
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            {error && (
              <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && <Loader2 className="h-5 w-5 animate-spin" />}
              {loading ? "Connexion…" : "Se connecter"}
            </button>
          </form>
        </div>

        <div className="mt-5 space-y-2 text-center text-sm">
          <p className="text-gray-500">
            Vous êtes client ?{" "}
            <Link to="/connexion" className="font-semibold text-blue-700 hover:underline">
              Connexion client
            </Link>
          </p>
          <Link to="/" className="text-gray-500 underline underline-offset-4 hover:text-gray-700">
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
