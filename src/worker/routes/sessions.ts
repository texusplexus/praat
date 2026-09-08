import { Hono } from "hono";
import { z } from "zod";
import { getScenario } from "../lib/scenarios.ts";
import { insertRow, supabaseConfigured, updateRow } from "../services/supabase.ts";

const startRequest = z.object({
  anonId: z.string().min(8).max(64),
  scenarioId: z.string().min(1).max(64),
});

const turnRequest = z.object({
  role: z.enum(["user", "assistant"]),
  source: z.enum(["voice", "text", "tutor", "opening"]),
  content: z.string().trim().min(1).max(4000),
});

const sessionId = z.string().uuid();

/**
 * Pilot transcript logging. Every handler fails soft with a JSON error so a
 * logging problem never blocks the conversation itself.
 */
export const sessions = new Hono<{ Bindings: Env }>()
  .use("*", async (c, next) => {
    if (!supabaseConfigured(c.env)) return c.json({ error: "Persistence is not configured" }, 503);
    await next();
  })
  .post("/", async (c) => {
    const parsed = startRequest.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "Invalid request", issues: parsed.error.issues }, 400);

    const scenario = getScenario(parsed.data.scenarioId);
    if (!scenario) return c.json({ error: "Unknown scenario" }, 404);

    try {
      const { id } = await insertRow(c.env, "sessions", {
        anon_id: parsed.data.anonId,
        scenario_id: scenario.id,
        mode: scenario.mode,
        user_agent: c.req.header("user-agent")?.slice(0, 300) ?? null,
      });
      return c.json({ sessionId: id }, 201);
    } catch (err) {
      console.error("session start failed", err instanceof Error ? err.message : err);
      return c.json({ error: "Could not start session" }, 502);
    }
  })
  .post("/:id/turns", async (c) => {
    const id = sessionId.safeParse(c.req.param("id"));
    const parsed = turnRequest.safeParse(await c.req.json().catch(() => null));
    if (!id.success || !parsed.success) return c.json({ error: "Invalid request" }, 400);

    try {
      await insertRow(c.env, "turns", { session_id: id.data, ...parsed.data });
      return c.body(null, 204);
    } catch (err) {
      console.error("turn log failed", err instanceof Error ? err.message : err);
      return c.json({ error: "Could not save turn" }, 502);
    }
  })
  .post("/:id/end", async (c) => {
    const id = sessionId.safeParse(c.req.param("id"));
    if (!id.success) return c.json({ error: "Invalid request" }, 400);

    try {
      await updateRow(c.env, "sessions", id.data, { ended_at: new Date().toISOString() });
      return c.body(null, 204);
    } catch (err) {
      console.error("session end failed", err instanceof Error ? err.message : err);
      return c.json({ error: "Could not end session" }, 502);
    }
  });
