// realtime/useStaffLive.js — back-office en direct (cahier V2 · NOT-05)
// Les agents reçoivent leurs transactions, admins et semi-admins toutes.
import { useEffect, useRef, useState } from "react";
import { createSocket } from "./socket";

/**
 * onChange  : () => void — appelé (regroupé sur 400 ms) quand la liste doit être rechargée
 * onCreated : (tx) => void — chaque nouvelle transaction (ex. pastille du menu)
 * Retourne { notice, dismiss } : dernière nouvelle transaction, pour <LiveNotice />
 */
export default function useStaffLive(onChange, { onCreated } = {}) {
  const handler = useRef(onChange);
  const createdHandler = useRef(onCreated);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    handler.current = onChange;
    createdHandler.current = onCreated;
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const socket = createSocket(() => localStorage.getItem("token"));
    let debounce = null;
    let hideNotice = null;
    const refresh = () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => handler.current?.(), 400);
    };

    socket.on("transaction:created", (tx) => {
      createdHandler.current?.(tx);
      setNotice(tx);
      clearTimeout(hideNotice);
      hideNotice = setTimeout(() => setNotice(null), 8000);
      refresh();
    });
    socket.on("transaction:status", refresh);
    socket.on("transaction:assigned", refresh);
    // Reconnexion après une coupure : on recharge pour ne rien manquer
    socket.io.on("reconnect", refresh);

    return () => {
      clearTimeout(debounce);
      clearTimeout(hideNotice);
      socket.disconnect();
    };
  }, []);

  return { notice, dismiss: () => setNotice(null) };
}
