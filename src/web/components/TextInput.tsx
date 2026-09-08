import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";

export function TextInput({ onSend, disabled }: { onSend: (text: string) => void; disabled?: boolean }) {
  const [value, setValue] = useState("");
  const form = useRef<HTMLFormElement>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const text = value.trim();
    if (!text) return;
    onSend(text);
    setValue("");
  };

  // Explicit Enter handling so on-screen keyboards and automation both submit.
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      form.current?.requestSubmit();
    }
  };

  return (
    <form ref={form} onSubmit={submit} className="flex w-full max-w-xl gap-2">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        enterKeyHint="send"
        disabled={disabled}
        placeholder="Of tik hier…"
        aria-label="Tik jou antwoord"
        className="flex-1 rounded-xl bg-slate-800 px-4 py-2.5 text-slate-100 placeholder:text-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 disabled:opacity-60"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="rounded-xl bg-slate-700 px-4 py-2.5 font-medium text-slate-100 hover:bg-slate-600 disabled:opacity-50"
      >
        Stuur
      </button>
    </form>
  );
}
