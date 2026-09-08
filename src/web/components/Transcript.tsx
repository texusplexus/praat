import { liveText, type TranscriptState } from "../lib/transcript.ts";

export function Transcript({ transcript }: { transcript: TranscriptState }) {
  const current = liveText(transcript);
  const empty = transcript.segments.length === 0 && !current;

  return (
    <section
      aria-live="polite"
      className="w-full max-w-xl flex-1 overflow-y-auto rounded-2xl bg-slate-800/60 p-5 text-lg leading-relaxed"
    >
      {empty && <p className="text-slate-500">Jou woorde verskyn hier…</p>}
      {transcript.segments.map((s, i) => (
        <p key={i} className="mb-3 text-slate-100">
          {s}
        </p>
      ))}
      {current && (
        <p className="text-slate-100">
          {transcript.finalText}
          <span className="text-slate-400">{transcript.partialText}</span>
        </p>
      )}
    </section>
  );
}
