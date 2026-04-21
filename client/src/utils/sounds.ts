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
