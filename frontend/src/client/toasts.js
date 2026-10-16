// client/toasts.js — bandeaux de notification en haut de l'écran (maquette D)
import { create } from "zustand";

let nextId = 1;

export const useToasts = create((set, get) => ({
  toasts: [],
  // tone : "success" | "info" | "error"
  push: ({ title, body, link, tone = "info", duration = 5000 }) => {
    const id = nextId++;
    set({ toasts: [...get().toasts.slice(-2), { id, title, body, link, tone }] });
    setTimeout(() => get().dismiss(id), duration);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));
