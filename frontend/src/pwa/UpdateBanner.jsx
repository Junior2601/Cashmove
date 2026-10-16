// pwa/UpdateBanner.jsx — « Nouvelle version disponible · Mettre à jour » (§10)
import { RefreshCw } from "lucide-react";
import { useAppUpdate, applyUpdate } from "./register";

export default function UpdateBanner() {
  const waiting = useAppUpdate((s) => s.waiting);
  if (!waiting) return null;
  return (
    <div className="fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[65] mx-auto w-[calc(100%-1.5rem)] max-w-md sm:bottom-6" role="status">
      <div className="flex items-center gap-3 rounded-2xl bg-blue-700 px-4 py-3 text-white shadow-xl">
        <RefreshCw className="h-5 w-5 shrink-0" />
        <p className="flex-1 text-sm font-medium">Une nouvelle version de MoveCash est disponible.</p>
        <button
          type="button"
          onClick={applyUpdate}
          className="shrink-0 rounded-full bg-yellow-400 px-3 py-1.5 text-sm font-bold text-blue-950 hover:bg-yellow-300"
        >
          Mettre à jour
        </button>
      </div>
    </div>
  );
}
