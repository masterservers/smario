import loopAsset from "@/assets/crowd-loop.webm.asset.json";
import cheerAsset from "@/assets/crowd-cheer.webm.asset.json";
import ohAsset from "@/assets/crowd-oh.webm.asset.json";

/**
 * Arena ambience: a continuous crowd bed under the broadcast plus short
 * reactions fired on impacts, big blows and knockouts. Everything is muted
 * together with the announcer, so one sound switch controls the whole show.
 */

let bed: HTMLAudioElement | null = null;
let enabled = false;

const BED_VOLUME = 0.32;

function ensureBed() {
  if (bed || typeof window === "undefined") return bed;
  const audio = new Audio(loopAsset.url);
  audio.loop = true;
  audio.preload = "auto";
  audio.volume = 0;
  bed = audio;
  return bed;
}

function ramp(target: number) {
  const audio = bed;
  if (!audio) return;
  const start = audio.volume;
  const t0 = performance.now();
  const step = () => {
    if (!bed || bed !== audio) return;
    const p = Math.min(1, (performance.now() - t0) / 600);
    audio.volume = start + (target - start) * p;
    if (p < 1) requestAnimationFrame(step);
    else if (target === 0) audio.pause();
  };
  requestAnimationFrame(step);
}

export function setCrowdEnabled(on: boolean) {
  enabled = on;
  const audio = ensureBed();
  if (!audio) return;
  if (on) {
    void audio.play().catch(() => {});
    ramp(BED_VOLUME);
  } else {
    ramp(0);
  }
}

/** Duck the crowd while the announcer is speaking so the voice stays clear. */
export function duckCrowd(down: boolean) {
  if (!enabled || !bed) return;
  ramp(down ? BED_VOLUME * 0.45 : BED_VOLUME);
}

const REACTION_COOLDOWN_MS = 900;
let lastReactionAt = 0;

export type CrowdReaction = "hit" | "big" | "ko";

export function crowdReact(kind: CrowdReaction) {
  if (!enabled || typeof window === "undefined") return;
  const now = Date.now();
  if (kind !== "ko" && now - lastReactionAt < REACTION_COOLDOWN_MS) return;
  lastReactionAt = now;
  const src = kind === "hit" ? ohAsset.url : cheerAsset.url;
  const audio = new Audio(src);
  audio.volume = kind === "ko" ? 0.85 : kind === "big" ? 0.6 : 0.4;
  void audio.play().catch(() => {});
}
