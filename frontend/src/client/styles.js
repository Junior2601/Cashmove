// client/styles.js — classes Tailwind partagées (boutons, champs)

export const btn = {
  primary:
    "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3.5 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50",
  secondary:
    "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3.5 font-semibold text-blue-700 ring-1 ring-gray-200 transition hover:bg-gray-50 disabled:opacity-50 dark:bg-slate-900 dark:text-blue-300 dark:ring-white/10 dark:hover:bg-slate-800",
  danger:
    "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3.5 font-semibold text-white transition hover:bg-red-700 disabled:opacity-50",
  link: "font-semibold text-blue-700 hover:underline dark:text-blue-300",
};

export const inputClass =
  "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 disabled:bg-gray-100 dark:border-white/15 dark:bg-slate-900 dark:text-white dark:disabled:bg-slate-800";
