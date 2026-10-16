// realtime/useTrackingLive.js — suivi en direct d'une référence sans compte
// (cahier V2 · événement trx:subscribe → room trx:{ref})
import { useEffect, useRef } from "react";
import { createSocket } from "./socket";

export default function useTrackingLive(trackingCode, onStatus) {
  const handler = useRef(onStatus);
  useEffect(() => {
    handler.current = onStatus;
  });

  useEffect(() => {
    if (!trackingCode) return;
    const socket = createSocket();
    // À chaque (re)connexion, on se réabonne à la référence
    socket.on("connect", () => socket.emit("trx:subscribe", trackingCode));
    socket.on("transaction:status", (payload) => {
      if (payload.tracking_code === trackingCode) handler.current(payload);
    });
    return () => {
      socket.disconnect();
    };
  }, [trackingCode]);
}
