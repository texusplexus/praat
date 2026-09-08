import { z } from "zod";

const SONIOX_API = "https://api.soniox.com/v1";

const temporaryKeyResponse = z.object({
  api_key: z.string().min(1),
  expires_at: z.string(),
});

export type TemporaryKey = {
  apiKey: string;
  expiresAt: string;
};

export type SonioxUsage = "transcribe_websocket" | "tts_rt";

/**
 * Mint a short-lived Soniox key so the browser can open a Soniox WebSocket
 * directly. The long-lived SONIOX_API_KEY never leaves the Worker.
 */
export async function mintTemporaryKey(
  env: Env,
  usage: SonioxUsage,
  expiresInSeconds = 60,
): Promise<TemporaryKey> {
  const res = await fetch(`${SONIOX_API}/auth/temporary-api-key`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.SONIOX_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      usage_type: usage,
      expires_in_seconds: expiresInSeconds,
      // A pilot conversation is at most a few minutes; cap the socket anyway.
      max_session_duration_seconds: 60 * 15,
    }),
  });

  if (!res.ok) {
    throw new Error(`Soniox temporary key request failed: HTTP ${res.status}`);
  }

  const parsed = temporaryKeyResponse.parse(await res.json());
  return { apiKey: parsed.api_key, expiresAt: parsed.expires_at };
}
