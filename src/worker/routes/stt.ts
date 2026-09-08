import { Hono } from "hono";
import { mintTemporaryKey } from "../services/soniox.ts";

export const stt = new Hono<{ Bindings: Env }>().post("/token", async (c) => {
  if (!c.env.SONIOX_API_KEY) {
    return c.json({ error: "SONIOX_API_KEY is not configured" }, 500);
  }
  try {
    return c.json(await mintTemporaryKey(c.env, "transcribe_websocket"));
  } catch (err) {
    console.error("stt/token failed", err instanceof Error ? err.message : err);
    return c.json({ error: "Could not start speech recognition" }, 502);
  }
});
