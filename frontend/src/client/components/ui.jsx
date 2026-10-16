// client/components/ui.jsx — petits composants partagés par l'espace client
import { useEffect } from "react";
import { X, Loader2, ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { statusInfo, initials, avatarColor, countryFlag, methodLogo } from "../format";

const TONES = {
  yellow: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  blue:   "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300",
  green:  "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  red:    "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
  gray:   "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300",
};

export const StatusBadge = ({ status }) => {
  const { label, tone } = statusInfo(status);
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONES[tone]}`}>
      {label}
    </span>
  );
};

export const Avatar = ({ name, size = "md" }) => {
  const sizes = { sm: "h-9 w-9 text-xs", md: "h-11 w-11 text-sm", lg: "h-14 w-14 text-base" };
  return (
    <span
      className={`${sizes[size]} ${avatarColor(name)} inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white`}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
};

// Image avec repli discret si le fichier n'existe pas
const SafeImg = ({ src, className, alt = "" }) => (
  <img
    src={src}
    alt={alt}
    className={className}
    onError={(e) => {
      e.currentTarget.style.visibility = "hidden";
    }}
  />
);

export const Flag = ({ country, className = "h-4 w-6" }) => (
  <SafeImg src={countryFlag(country)} className={`${className} rounded-sm object-cover`} />
);

export const MethodLogo = ({ method, className = "h-10 w-10" }) => (
  <span className={`${className} inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-100 dark:bg-white/10`}>
    <SafeImg src={methodLogo(method)} className="h-full w-full object-contain p-1" />
  </span>
);

// className remplace taille ET couleur (ex. "h-5 w-5 text-white" dans un bouton)
export const Spinner = ({ className = "h-6 w-6 text-blue-700 dark:text-blue-400" }) => (
  <Loader2 className={`${className} animate-spin`} aria-label="Chargement" />
);

export const FullPageSpinner = () => (
  <div className="flex min-h-[50vh] items-center justify-center">
    <Spinner className="h-8 w-8 text-blue-700 dark:text-blue-400" />
  </div>
);

export const EmptyState = ({ icon: Icon, title, text, action }) => (
  <div className="flex flex-col items-center px-6 py-12 text-center">
    {Icon && (
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
        <Icon className="h-7 w-7" />
      </span>
    )}
    <p className="font-semibold text-gray-900 dark:text-white">{title}</p>
    {text && <p className="mt-1 max-w-xs text-sm text-gray-500 dark:text-gray-400">{text}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

export const ErrorBox = ({ children }) =>
  children ? (
    <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
      {children}
    </p>
  ) : null;

export const Card = ({ className = "", children, ...props }) => (
  <div className={`rounded-2xl bg-white shadow-sm ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10 ${className}`} {...props}>
    {children}
  </div>
);

export const PageHeader = ({ title, back, action }) => {
  const navigate = useNavigate();
  return (
    <header className="flex items-center gap-2 px-4 pb-3 pt-4">
      {back && (
        <button
          type="button"
          onClick={() => (typeof back === "string" ? navigate(back) : navigate(-1))}
          className="-ml-2 rounded-full p-2 text-gray-700 hover:bg-black/5 dark:text-gray-200 dark:hover:bg-white/10"
          aria-label="Retour"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}
      <h1 className="flex-1 text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
      {action}
    </header>
  );
};

export const Field = ({ label, hint, error, children, htmlFor }) => (
  <div className="space-y-1.5">
    {label && (
      <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
    )}
    {children}
    {error ? (
      <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
    ) : hint ? (
      <p className="text-xs text-gray-500 dark:text-gray-400">{hint}</p>
    ) : null}
  </div>
);

// Panneau qui monte du bas de l'écran (mobile), centré sur grand écran
export const Sheet = ({ open, onClose, title, children }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="absolute inset-0 bg-black/40" onClick={onClose} aria-label="Fermer" />
      <div className="relative max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-gray-50 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl sm:rounded-3xl dark:bg-slate-950">
        <div className="sticky top-0 z-10 flex items-center justify-between bg-gray-50/95 px-5 pb-2 pt-4 backdrop-blur dark:bg-slate-950/95">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-gray-500 hover:bg-black/5 dark:hover:bg-white/10" aria-label="Fermer">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 pt-2">{children}</div>
      </div>
    </div>
  );
};

export const Toggle = ({ checked, onChange, label, description, disabled }) => (
  <label className="flex cursor-pointer items-center justify-between gap-4 py-3">
    <span>
      <span className="block font-medium text-gray-900 dark:text-white">{label}</span>
      {description && <span className="block text-sm text-gray-500 dark:text-gray-400">{description}</span>}
    </span>
    <span className="relative inline-flex shrink-0">
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="h-7 w-12 rounded-full bg-gray-300 transition peer-checked:bg-blue-700 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-600/40 peer-disabled:opacity-50 dark:bg-white/20" />
      <span className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
    </span>
  </label>
);
