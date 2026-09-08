/**
 * Gapless playback of streamed 16-bit PCM. Each chunk becomes an AudioBuffer
 * scheduled right after the previous one, so audio starts as soon as the first
 * chunk lands and never waits for the whole utterance.
 */
export class PcmPlayer {
  private nextStart = 0;
  private leftover = new Uint8Array(0);
  private pending = 0;
  private ended = false;
  private sources = new Set<AudioBufferSourceNode>();

  constructor(
    private readonly context: AudioContext,
    private readonly sampleRate: number,
    private readonly onFinished: () => void,
  ) {}

  /** Queue raw little-endian 16-bit mono samples. */
  enqueue(bytes: Uint8Array): void {
    let data = bytes;
    if (this.leftover.length) {
      data = new Uint8Array(this.leftover.length + bytes.length);
      data.set(this.leftover);
      data.set(bytes, this.leftover.length);
    }
    const usable = data.length - (data.length % 2);
    this.leftover = data.slice(usable);
    if (usable === 0) return;

    const view = new DataView(data.buffer, data.byteOffset, usable);
    const frames = usable / 2;
    const buffer = this.context.createBuffer(1, frames, this.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) channel[i] = view.getInt16(i * 2, true) / 0x8000;

    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.context.destination);
    const startAt = Math.max(this.nextStart, this.context.currentTime + 0.02);
    source.start(startAt);
    this.nextStart = startAt + buffer.duration;

    this.pending++;
    this.sources.add(source);
    source.onended = () => {
      this.sources.delete(source);
      this.pending--;
      this.maybeFinish();
    };
  }

  /** No more chunks will arrive; fire onFinished once playback drains. */
  end(): void {
    this.ended = true;
    this.maybeFinish();
  }

  /** Cut playback immediately. */
  stop(): void {
    this.ended = true;
    for (const s of this.sources) {
      s.onended = null;
      try {
        s.stop();
      } catch {
        /* already stopped */
      }
    }
    this.sources.clear();
    this.pending = 0;
  }

  private maybeFinish() {
    if (this.ended && this.pending === 0) this.onFinished();
  }
}
