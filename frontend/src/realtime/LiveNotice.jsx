// realtime/LiveNotice.jsx — bandeau « nouvelle transaction » du back-office
import { createPortal } from "react-dom";
import { BellRing, X } from "lucide-react";

const fmt = (n) => Number(n).toLocaleString("fr-FR", { maximumFractionDigits: 2 });

export default function LiveNotice({ notice, onClose }) {
  if (!notice) return null;
  // Portail sur body : un ancêtre avec transform (layout du back-office) fausserait position:fixed
  return createPortal(
    // Mobile : au-dessus de la barre d'icônes du back-office
    <div className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-4 right-4 z-[70] flex items-start gap-3 rounded-2xl bg-slate-900 p-4 text-white shadow-2xl sm:left-auto sm:max-w-sm lg:bottom-4" role="status" aria-live="polite">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500">
        <BellRing className="h-5 w-5" />
      </span>
      <div className="min-w-0 text-sm">
        <p className="font-semibold">Nouvelle transaction</p>
        <p className="font-mono text-xs text-gray-300">{notice.tracking_code}</p>
        <p className="text-gray-300">
          {fmt(notice.send_amount)} {notice.from_currency_code} → {fmt(notice.receive_amount)} {notice.to_currency_code}
        </p>
        <p className="text-gray-400">{notice.sender_method} · {notice.from_country} → {notice.to_country}</p>
      </div>
      <button type="button" onClick={onClose} className="rounded-full p-1 text-gray-400 hover:text-white" aria-label="Fermer">
        <X className="h-4 w-4" />
      </button>
    </div>,
    document.body
  );
}
