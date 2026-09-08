import type Anthropic from "@anthropic-ai/sdk";
import { Hono } from "hono";
import { z } from "zod";
import { getScenario } from "../lib/scenarios.ts";
import { buildSystemPrompt } from "../lib/tutor-prompt.ts";
import { streamTutorReply } from "../services/anthropic.ts";

const replyRequest = z.object({
  scenarioId: z.string().min(1).max(64),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(2000),
      }),
    )
    .min(1)
    .max(60)
    .refine((m) => m[0]?.role === "user", { message: "First message must be from the learner" }),
});

export const tutor = new Hono<{ Bindings: Env }>().post("/reply", async (c) => {
  if (!c.env.ANTHROPIC_API_KEY) {
    return c.json({ error: "ANTHROPIC_API_KEY is not configured" }, 500);
  }

  const parsed = replyRequest.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: "Invalid request", issues: parsed.error.issues }, 400);
  }

  const scenario = getScenario(parsed.data.scenarioId);
  if (!scenario) return c.json({ error: "Unknown scenario" }, 404);

  const messages: Anthropic.MessageParam[] = parsed.data.messages;
  const body = streamTutorReply(c.env, buildSystemPrompt(scenario), messages);

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
});
