// client/components/Toaster.jsx — bandeaux en haut de l'écran (maquette D)
import { useNavigate } from "react-router-dom";
import { Check, Info, AlertTriangle, X } from "lucide-react";
import { useToasts } from "../toasts";

const ICONS = {
  success: { Icon: Check, cls: "bg-emerald-500" },
  info: { Icon: Info, cls: "bg-blue-600" },
  error: { Icon: AlertTriangle, cls: "bg-red-600" },
};

export default function Toaster() {
  const navigate = useNavigate();
  const { toasts, dismiss } = useToasts();

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] mx-auto flex max-w-md flex-col gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))]"
      aria-live="polite"
      role="status"
    >
      {toasts.map((t) => {
        const { Icon, cls } = ICONS[t.tone] || ICONS.info;
        return (
          <div key={t.id} className="pointer-events-auto flex items-start gap-3 rounded-2xl bg-slate-900 p-3 text-white shadow-xl ring-1 ring-white/10">
            <button
              type="button"
              className="flex min-w-0 flex-1 items-start gap-3 text-left"
              onClick={() => {
                dismiss(t.id);
                if (t.link) navigate(t.link);
              }}
            >
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${cls}`}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold">{t.title}</span>
                {t.body && <span className="block text-sm text-gray-300">{t.body}</span>}
              </span>
            </button>
            <button type="button" onClick={() => dismiss(t.id)} className="rounded-full p-1 text-gray-400 hover:text-white" aria-label="Fermer">
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
