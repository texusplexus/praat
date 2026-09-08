import { useEffect, useRef } from "react";
import type { Turn } from "../hooks/useTutor.ts";

type Props = {
  turns: Turn[];
  /** What the learner is saying right now, before the utterance ends. */
  live: string;
};

export function Conversation({ turns, live }: Props) {
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [turns, live]);

  return (
    <section aria-live="polite" className="w-full max-w-xl flex-1 overflow-y-auto space-y-3 px-1">
      {turns.map((turn, i) => (
        <Bubble key={i} role={turn.role} pending={turn.pending && !turn.content}>
          {turn.content}
        </Bubble>
      ))}
      {live && (
        <Bubble role="user" muted>
          {live}
        </Bubble>
      )}
      <div ref={bottom} />
    </section>
  );
}

function Bubble({
  role,
  muted,
  pending,
  children,
}: {
  role: Turn["role"];
  muted?: boolean;
  pending?: boolean;
  children: React.ReactNode;
}) {
  const mine = role === "user";
  return (
    <div className={mine ? "flex justify-end" : "flex justify-start"}>
      <p
        className={[
          "max-w-[85%] rounded-2xl px-4 py-2.5 text-base leading-relaxed whitespace-pre-wrap",
          mine ? "bg-emerald-600/80 text-white rounded-br-sm" : "bg-slate-800 text-slate-100 rounded-bl-sm",
          muted ? "opacity-60" : "",
        ].join(" ")}
      >
        {pending ? <span className="animate-pulse">…</span> : children}
      </p>
    </div>
  );
}
