// client/components/TransactionRow.jsx — une ligne d'historique
import { Link } from "react-router-dom";
import { formatAmount, formatDateTime } from "../format";
import { Avatar, StatusBadge } from "./ui";

export default function TransactionRow({ tx }) {
  const name = tx.beneficiary_name || tx.receiver_phone;
  return (
    <Link
      to={`/transactions/${tx.tracking_code}`}
      className="flex items-center gap-3 px-4 py-3 transition hover:bg-gray-50 dark:hover:bg-white/5"
    >
      <Avatar name={tx.beneficiary_name || "?"} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-gray-900 dark:text-white">{name}</p>
        <p className="truncate text-xs text-gray-500 dark:text-gray-400">
          {tx.receiver_method} · {tx.to_country} · {formatDateTime(tx.created_at)}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="font-bold text-gray-900 dark:text-white">
          {formatAmount(tx.send_amount, tx.from_currency_symbol || tx.from_currency_code)}
        </span>
        <StatusBadge status={tx.status} />
      </div>
    </Link>
  );
}
