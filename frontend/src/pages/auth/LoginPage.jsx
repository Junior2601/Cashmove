import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn, Eye, EyeOff } from "lucide-react";
import api from "../../api/axios"; // adaptez le chemin

const ROLE_CONFIG = {
  admin: {
    endpoint: "/auth/login/admin",
    redirect: "/admin",
    label: "Administrateur",
  },
  "semi-admin": {
    endpoint: "/auth/login/semi-admin",
    redirect: "/semi-admin",
    label: "Semi-administrateur",
  },
  agent: {
    endpoint: "/auth/login/agent",
    redirect: "/agent",
    label: "Agent",
  },
};

export default function LoginPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      const msg =
        err.response?.data?.message || "Erreur de connexion. Réessayez.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-slate-50 to-white">
      <div className="w-[420px] p-8 bg-white rounded-2xl shadow-lg">
        {/* En-tête avec icône */}
        <div className="flex items-center gap-3 mb-6">
          <LogIn className="w-8 h-8 text-indigo-600" />
          <h1 className="text-2xl font-semibold">Connexion</h1>
        </div>

        {/* Sélecteur de rôle */}
        <div className="flex gap-2 mb-6">
          {Object.entries(ROLE_CONFIG).map(([key, { label }]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setRole(key);
                setError("");
              }}
              className={`
                flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all
                ${
                  role === key
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }
              `}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              autoComplete="username"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              disabled={loading}
            />
          </div>

          {/* Champ mot de passe avec toggle */}
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mot de passe"
              required
              autoComplete="current-password"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent pr-12"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-indigo-600 focus:outline-none"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>

          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}