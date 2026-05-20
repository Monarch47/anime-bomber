/* Tiny WebAudio sound effects — no audio assets required. */

let ctx: AudioContext | null = null;
let muted = false;

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  let c = ctx;
  if (!c) {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    c = new AC();
    ctx = c;
  }
  if (c.state === "suspended") void c.resume();
  return c;
}

function blip(
  freq: number,
  dur: number,
  type: OscillatorType = "sine",
  vol = 0.2,
  delay = 0,
): void {
  const ac = context();
  if (!ac || muted) return;
  const t0 = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

export const sound = {
  setMuted(value: boolean): void {
    muted = value;
  },
  isMuted(): boolean {
    return muted;
  },
  /** Resume the AudioContext from within a user gesture. */
  unlock(): void {
    context();
  },
  correct(): void {
    blip(660, 0.12, "triangle", 0.22);
    blip(990, 0.16, "triangle", 0.2, 0.08);
  },
  turn(): void {
    blip(523, 0.1, "sine", 0.16);
    blip(784, 0.12, "sine", 0.13, 0.06);
  },
  bonus(): void {
    [523, 659, 784, 1046].forEach((f, i) =>
      blip(f, 0.2, "triangle", 0.2, i * 0.07),
    );
  },
  explode(): void {
    const ac = context();
    if (!ac || muted) return;
    const dur = 0.5;
    const buffer = ac.createBuffer(1, Math.floor(ac.sampleRate * dur), ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }
    const src = ac.createBufferSource();
    src.buffer = buffer;
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.5, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
    const lp = ac.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(1400, ac.currentTime);
    lp.frequency.exponentialRampToValueAtTime(120, ac.currentTime + dur);
    src.connect(lp);
    lp.connect(gain);
    gain.connect(ac.destination);
    src.start();
    blip(70, 0.42, "square", 0.28);
  },
  win(): void {
    [523, 659, 784, 1046, 1318].forEach((f, i) =>
      blip(f, 0.28, "triangle", 0.22, i * 0.1),
    );
  },
};
