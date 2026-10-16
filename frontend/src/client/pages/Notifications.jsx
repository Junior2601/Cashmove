// client/pages/Notifications.jsx — centre de notifications (maquette E · NOT-03)
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check, Send, AlertTriangle, Star } from "lucide-react";
import clientApi, { apiError } from "../api";
import { useLiveEvent } from "../realtime";
import { fetchWithOffline } from "../offline";
import { useClientSession } from "../session";
import { dayGroup, formatTime } from "../format";
import { Card, EmptyState, ErrorBox, FullPageSpinner, PageHeader } from "../components/ui";
import { btn } from "../styles";

// Icône et couleur selon le contenu de la notification
const visual = (n) => {
  const status = n.data?.to_status;
  if (n.type === "announcement") return { Icon: Star, cls: "bg-amber-400 text-amber-950" };
  if (status === "effectuee") return { Icon: Check, cls: "bg-emerald-500 text-white" };
  if (["echouee", "annulee", "expiree"].includes(status)) return { Icon: AlertTriangle, cls: "bg-red-600 text-white" };
  return { Icon: Send, cls: "bg-blue-700 text-white" };
};

export default function Notifications() {
  const navigate = useNavigate();
  const setUnreadCount = useClientSession((s) => s.setUnreadCount);
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchWithOffline("notifications", async () => (await clientApi.get("me/notifications")).data.data)
      .then((res) => {
        setItems(res.data.items);
        setUnreadCount(res.data.unread_count);
      })
      .catch((err) => setError(apiError(err)));
  }, [setUnreadCount]);

  // Nouvelle alerte pendant que l'écran est ouvert
  useLiveEvent("mc:notification", ({ notification }) => {
    setItems((list) => (list && !list.some((n) => n.id === notification.id) ? [notification, ...list] : list));
  });
  useLiveEvent("mc:resync", () => {
    clientApi
      .get("me/notifications")
      .then((res) => {
        setItems(res.data.data.items);
        setUnreadCount(res.data.data.unread_count);
      })
      .catch(() => {});
  });

  const markAll = async () => {
    try {
      const res = await clientApi.patch("me/notifications/read");
      setUnreadCount(res.data.data.unread_count);
      setItems((list) => list.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
    } catch (err) {
      setError(apiError(err));
    }
  };

  const open = async (n) => {
    if (!n.read_at) {
      clientApi
        .patch(`me/notifications/${n.id}/read`)
        .then((res) => setUnreadCount(res.data.data.unread_count))
        .catch(() => {});
    }
    if (n.link) navigate(n.link);
    else setItems((list) => list.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)));
  };

  if (items === null && !error) return <FullPageSpinner />;

  const hasUnread = items?.some((n) => !n.read_at);
  const groups = [];
  for (const n of items || []) {
    const label = dayGroup(n.created_at);
    if (!groups.length || groups[groups.length - 1].label !== label) groups.push({ label, items: [] });
    groups[groups.length - 1].items.push(n);
  }

  return (
    <div>
      <PageHeader
        title="Alertes"
        action={hasUnread && (
          <button type="button" onClick={markAll} className={`text-sm ${btn.link}`}>Tout marquer lu</button>
        )}
      />
      <div className="space-y-2 px-4">
        <ErrorBox>{error}</ErrorBox>
        {items?.length === 0 ? (
          <Card>
            <EmptyState
              icon={Bell}
              title="Aucune alerte"
              text="Chaque changement de statut de vos transferts s'affichera ici."
            />
          </Card>
        ) : (
          groups.map((g) => (
            <section key={g.label}>
              <h2 className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{g.label}</h2>
              <Card className="divide-y divide-gray-100 dark:divide-white/5">
                {g.items.map((n) => {
                  const { Icon, cls } = visual(n);
                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => open(n)}
                      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-gray-50 dark:hover:bg-white/5 ${n.read_at ? "opacity-70" : ""}`}
                    >
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${cls}`}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 dark:text-white">{n.title}</span>
                          {!n.read_at && <span className="h-2 w-2 rounded-full bg-blue-600" aria-label="Non lue" />}
                        </span>
                        {n.body && <span className="block text-sm text-gray-500 dark:text-gray-400">{n.body}</span>}
                      </span>
                      <span className="shrink-0 text-xs text-gray-400">{formatTime(n.created_at)}</span>
                    </button>
                  );
                })}
              </Card>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
