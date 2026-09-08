/**
 * Pure reducer for Soniox real-time tokens.
 *
 * Soniox sends every non-final token again on each response (they are
 * provisional and may change), and final tokens exactly once. Endpoint
 * detection appends a literal "<end>" final token, which closes a segment.
 */
export type SonioxToken = {
  text: string;
  is_final: boolean;
  start_ms?: number;
  end_ms?: number;
  confidence?: number;
  language?: string;
};

export type TranscriptState = {
  /** Completed utterances, oldest first. */
  segments: string[];
  /** Final text of the utterance currently being spoken. */
  finalText: string;
  /** Provisional tail after finalText; replaced on every response. */
  partialText: string;
};

export const emptyTranscript: TranscriptState = { segments: [], finalText: "", partialText: "" };

export const END_TOKEN = "<end>";

export function applyTokens(state: TranscriptState, tokens: SonioxToken[]): TranscriptState {
  let { segments, finalText } = state;
  let partialText = "";

  for (const token of tokens) {
    if (!token.is_final) {
      partialText += token.text;
      continue;
    }
    if (token.text === END_TOKEN) {
      const utterance = finalText.trim();
      if (utterance) segments = [...segments, utterance];
      finalText = "";
      continue;
    }
    finalText += token.text;
  }

  return { segments, finalText, partialText };
}

/** Full text as the learner should see it right now. */
export function liveText(state: TranscriptState): string {
  return (state.finalText + state.partialText).trim();
}
