type Props = {
  active: boolean;
  busy: boolean;
  onClick: () => void;
};

export function MicButton({ active, busy, onClick }: Props) {
  const label = busy ? "Wag…" : active ? "Stop" : "Praat";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-pressed={active}
      className={[
        "h-20 w-20 rounded-full text-base font-semibold transition-colors",
        "focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300/60",
        "disabled:opacity-60",
        active
          ? "bg-rose-500 text-white animate-pulse"
          : "bg-emerald-500 text-slate-900 hover:bg-emerald-400",
      ].join(" ")}
    >
      {label}
    </button>
  );
}
