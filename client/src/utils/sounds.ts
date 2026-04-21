function note(ctx: AudioContext, freq: number, start: number, duration: number, vol: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = freq;
  osc.type = 'sine';
  gain.gain.setValueAtTime(0, ctx.currentTime + start);
  gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
  osc.start(ctx.currentTime + start);
  osc.stop(ctx.currentTime + start + duration);
}

// Three ascending notes — C E G major chord, session complete
export function playWorkEnd() {
  try {
    const ctx = new AudioContext();
    note(ctx, 523, 0, 0.6, 0.28);
    note(ctx, 659, 0.2, 0.6, 0.28);
    note(ctx, 784, 0.4, 0.9, 0.32);
  } catch { /* AudioContext unavailable */ }
}

// Two soft notes — gentle break-over reminder
export function playBreakEnd() {
  try {
    const ctx = new AudioContext();
    note(ctx, 440, 0, 0.5, 0.22);
    note(ctx, 523, 0.28, 0.6, 0.22);
  } catch { /* AudioContext unavailable */ }
}

export type AmbientType = 'none' | 'white' | 'brown' | 'rain';

let ambientCtx: AudioContext | null = null;
let ambientGain: GainNode | null = null;

export function startAmbient(type: AmbientType): void {
  stopAmbient();
  if (type === 'none') return;

  try {
    const ctx = new AudioContext();
    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.12;
    masterGain.connect(ctx.destination);

    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    if (type === 'white') {
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    } else if (type === 'brown') {
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5;
      }
    } else if (type === 'rain') {
      // Brown noise base
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5;
      }
      // Add occasional rain drop clicks
      for (let i = 0; i < bufferSize; i++) {
        if (Math.random() < 0.0003) {
          const len = Math.floor(Math.random() * 80 + 20);
          for (let j = 0; j < len && i + j < bufferSize; j++) {
            data[i + j] += (Math.random() * 2 - 1) * (1 - j / len) * 0.6;
          }
        }
      }
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    if (type === 'white') {
      // Light low-pass to soften white noise
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 8000;
      source.connect(filter);
      filter.connect(masterGain);
    } else {
      source.connect(masterGain);
    }

    source.start();
    ambientCtx = ctx;
    ambientGain = masterGain;
  } catch { /* AudioContext unavailable */ }
}

export function stopAmbient(): void {
  if (ambientCtx) {
    try {
      ambientGain?.disconnect();
      void ambientCtx.close();
    } catch { /* ignore */ }
    ambientCtx = null;
    ambientGain = null;
  }
}

export function setAmbientVolume(vol: number): void {
  if (ambientGain) {
    ambientGain.gain.value = Math.max(0, Math.min(1, vol));
  }
}
