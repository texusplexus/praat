/**
 * AudioWorklet that converts the microphone stream to 16 kHz mono 16-bit PCM,
 * the raw format Soniox expects (`pcm_s16le`). Written as a source string and
 * loaded from a Blob URL so it needs no bundler configuration.
 */
const workletSource = `
class PcmDownsampler extends AudioWorkletProcessor {
  constructor() {
    super();
    this.targetRate = 16000;
    this.ratio = sampleRate / this.targetRate;
    this.carry = 0;          // fractional read position carried between blocks
    this.buffer = [];        // pending output samples
    this.flushEvery = 1600;  // 100 ms at 16 kHz
  }

  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (!channel) return true;

    // Linear-interpolation downsample from the context rate to 16 kHz.
    let pos = this.carry;
    while (pos < channel.length - 1) {
      const i = Math.floor(pos);
      const frac = pos - i;
      const sample = channel[i] * (1 - frac) + channel[i + 1] * frac;
      this.buffer.push(sample);
      pos += this.ratio;
    }
    this.carry = pos - channel.length;

    if (this.buffer.length >= this.flushEvery) {
      const out = new Int16Array(this.buffer.length);
      for (let j = 0; j < out.length; j++) {
        const s = Math.max(-1, Math.min(1, this.buffer[j]));
        out[j] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      this.buffer = [];
      this.port.postMessage(out.buffer, [out.buffer]);
    }
    return true;
  }
}
registerProcessor("pcm-downsampler", PcmDownsampler);
`;

export const PCM_SAMPLE_RATE = 16000;
export const PCM_WORKLET_NAME = "pcm-downsampler";

let cachedUrl: string | null = null;

export function pcmWorkletUrl(): string {
  if (!cachedUrl) {
    cachedUrl = URL.createObjectURL(new Blob([workletSource], { type: "application/javascript" }));
  }
  return cachedUrl;
}
