import Anthropic from "@anthropic-ai/sdk";

export const TUTOR_MODEL = "claude-sonnet-5";

/**
 * Stream the tutor's reply as plain UTF-8 text chunks. The system prompt is
 * stable per scenario, so it is marked cacheable.
 */
export function streamTutorReply(
  env: Env,
  system: string,
  messages: Anthropic.MessageParam[],
): ReadableStream<Uint8Array> {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const stream = client.messages.stream({
          model: TUTOR_MODEL,
          max_tokens: 1024,
          // Conversational turns are short; favour latency over deliberation.
          output_config: { effort: "low" },
          system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
          messages,
        });
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") {
          controller.enqueue(encoder.encode(" Jammer, kom ons praat oor iets anders."));
        }
        controller.close();
      } catch (err) {
        console.error("tutor stream failed", err instanceof Error ? err.message : err);
        controller.error(err);
      }
    },
  });
}
