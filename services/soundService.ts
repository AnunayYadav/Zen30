// synthesized audio context to avoid external asset dependencies
const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
let audioCtx: AudioContext | null = null;
let isMuted = false;

const getCtx = () => {
  if (!audioCtx) audioCtx = new AudioContextClass();
  return audioCtx;
};

const playTone = (freq: number, type: OscillatorType, duration: number, vol = 0.1) => {
  if (isMuted) return;
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  
  gain.gain.setValueAtTime(vol, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + duration);
};

export const SoundService = {
  setMuted: (muted: boolean) => { isMuted = muted; },
  isMuted: () => isMuted,
  playTick: () => playTone(800, 'sine', 0.1, 0.05),
  playCountdown: () => playTone(600, 'square', 0.15, 0.05),
  playStart: () => {
    if (isMuted) return;
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  },
  playSuccess: () => {
    if (isMuted) return;
    // Victory arpeggio
    setTimeout(() => playTone(523.25, 'sine', 0.2, 0.1), 0);
    setTimeout(() => playTone(659.25, 'sine', 0.2, 0.1), 100);
    setTimeout(() => playTone(783.99, 'sine', 0.4, 0.1), 200);
    setTimeout(() => playTone(1046.50, 'square', 0.6, 0.1), 300);
  },
  playClick: () => playTone(1200, 'sine', 0.05, 0.02)
};