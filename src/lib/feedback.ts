import { triggerHaptic } from "@/hooks/use-haptic";

export type SoundType = "tap" | "success" | "confirm";
export type HapticType = "light" | "medium" | "heavy" | "success" | "warning" | "error" | "selection";

let audioCtx: AudioContext | null = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined;
  if (!Ctx) return null;
  if (!audioCtx) audioCtx = new Ctx();
  if (audioCtx.state === "suspended") {
    // resume is only allowed on user gesture; if it fails we just stay silent
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function triggerSound(type: SoundType = "tap") {
  const ctx = getAudioContext();
  if (!ctx) return false;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Very subtle, Apple-like click
    const now = ctx.currentTime;
    const freq = type === "tap" ? 520 : type === "success" ? 660 : 440;
    const dur = type === "tap" ? 0.035 : 0.06;

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.02, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + dur);
    return true;
  } catch {
    return false;
  }
}

export function triggerFeedback(opts?: { haptic?: HapticType; sound?: SoundType }) {
  const haptic = opts?.haptic;
  const sound = opts?.sound;

  if (haptic) triggerHaptic(haptic);
  if (sound) triggerSound(sound);
}
