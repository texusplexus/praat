import { useCallback, useEffect, useRef } from "react";
import { getAnonId } from "../lib/anon.ts";

export type TurnSource = "voice" | "text" | "tutor" | "opening";
export type LoggedTurn = { role: "user" | "assistant"; source: TurnSource; content: string };

async function post(path: string, body: unknown): Promise<Response> {
  return fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    keepalive: true,
  });
}

/**
 * Logs one conversation to the Worker for pilot review. Logging is best
 * effort: failures are reported to the console and never surface to the
 * learner or interrupt the conversation.
 */
export function useSession(scenarioId: string) {
  const sessionIdRef = useRef<string | null>(null);
  const pendingRef = useRef<LoggedTurn[]>([]);
  const disabledRef = useRef(false);

  const flush = useCallback(async () => {
    const id = sessionIdRef.current;
    if (!id || disabledRef.current) return;
    const turns = pendingRef.current.splice(0);
    for (const turn of turns) {
      const res = await post(`/api/sessions/${id}/turns`, turn).catch(() => null);
      if (!res || !res.ok) console.warn("turn not saved", res?.status);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    sessionIdRef.current = null;
    pendingRef.current = [];
    disabledRef.current = false;

    post("/api/sessions", { anonId: getAnonId(), scenarioId })
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 503) {
          disabledRef.current = true; // persistence not configured; carry on
          return;
        }
        const body = (await res.json()) as { sessionId?: string };
        if (!res.ok || !body.sessionId) {
          console.warn("session not started", res.status);
          disabledRef.current = true;
          return;
        }
        sessionIdRef.current = body.sessionId;
        void flush();
      })
      .catch(() => {
        disabledRef.current = true;
      });

    return () => {
      cancelled = true;
      const id = sessionIdRef.current;
      if (id) void post(`/api/sessions/${id}/end`, {});
    };
  }, [scenarioId, flush]);

  const logTurn = useCallback(
    (turn: LoggedTurn) => {
      pendingRef.current.push(turn);
      void flush();
    },
    [flush],
  );

  return { logTurn };
}
