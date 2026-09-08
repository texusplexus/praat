import { useCallback, useEffect, useRef, useState } from "react";
import { fetchScenario, streamReply, type ChatMessage, type ScenarioSummary } from "../lib/api.ts";

export type Turn = ChatMessage & { pending?: boolean };
export type TutorState = "loading" | "ready" | "replying" | "error";

/**
 * Holds the conversation for one scenario. The tutor's opening line is shown
 * as the first turn but is not sent to the model; the system prompt already
 * tells the model it said it.
 */
export function useTutor(scenarioId: string) {
  const [scenario, setScenario] = useState<ScenarioSummary | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [state, setState] = useState<TutorState>("loading");
  const [error, setError] = useState<string | null>(null);
  const historyRef = useRef<ChatMessage[]>([]);
  const queueRef = useRef<string[]>([]);
  const busyRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    fetchScenario(scenarioId)
      .then((s) => {
        if (cancelled) return;
        setScenario(s);
        setTurns([{ role: "assistant", content: s.opening }]);
        setState("ready");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [scenarioId]);

  const runReply = useCallback(
    async (userText: string) => {
      busyRef.current = true;
      setState("replying");
      setError(null);

      const history = [...historyRef.current, { role: "user" as const, content: userText }];
      historyRef.current = history;
      setTurns((t) => [...t, { role: "user", content: userText }, { role: "assistant", content: "", pending: true }]);

      let reply = "";
      try {
        await streamReply(scenarioId, history, (delta) => {
          reply += delta;
          setTurns((t) => {
            const next = t.slice();
            const last = next[next.length - 1];
            if (last?.role === "assistant" && last.pending) {
              next[next.length - 1] = { ...last, content: reply };
            }
            return next;
          });
        });
        historyRef.current = [...history, { role: "assistant", content: reply }];
        setTurns((t) => t.map((turn) => (turn.pending ? { ...turn, pending: false } : turn)));
        setState("ready");
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        // Drop the failed exchange so the learner can simply try again.
        historyRef.current = history.slice(0, -1);
        setTurns((t) => t.filter((turn) => !turn.pending));
        setState("error");
      } finally {
        busyRef.current = false;
        const queued = queueRef.current.splice(0).join(" ").trim();
        if (queued) void runReply(queued);
      }
    },
    [scenarioId],
  );

  /** Send what the learner said. Utterances that arrive mid-reply are queued. */
  const send = useCallback(
    (text: string) => {
      const clean = text.trim();
      if (!clean) return;
      if (busyRef.current) {
        queueRef.current.push(clean);
        return;
      }
      void runReply(clean);
    },
    [runReply],
  );

  return { scenario, turns, state, error, send };
}
