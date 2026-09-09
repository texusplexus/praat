/**
 * Shared playback path. Audio is routed through an <audio> element playing a
 * MediaStream from the AudioContext rather than straight to the destination:
 * on iPhone, plain Web Audio output is silenced by the ringer switch and can
 * be routed to the earpiece while the mic is open, whereas media playback
 * goes to the speaker regardless. Everything here must be created inside a
 * user gesture the first time.
 */
export type AudioOutput = {
  context: AudioContext;
  node: AudioNode;
  /** Resume the context and (re)start the element; safe to call repeatedly. */
  resume: () => Promise<void>;
};

let shared: AudioOutput | null = null;

export function getAudioOutput(): AudioOutput {
  if (shared) return shared;

  const context = new AudioContext();
  let node: AudioNode = context.destination;
  let element: HTMLAudioElement | null = null;

  try {
    const dest = context.createMediaStreamDestination();
    const audio = new Audio();
    audio.srcObject = dest.stream;
    audio.setAttribute("playsinline", "");
    node = dest;
    element = audio;
  } catch {
    // Fall back to direct output where MediaStream playback is unavailable.
  }

  const resume = async () => {
    if (context.state !== "running") await context.resume().catch(() => undefined);
    if (element && element.paused) await element.play().catch(() => undefined);
  };

  shared = { context, node, resume };
  return shared;
}
