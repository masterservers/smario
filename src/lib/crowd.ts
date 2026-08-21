import loopAsset from "@/assets/crowd-loop.webm.asset.json";
import cheerAsset from "@/assets/crowd-cheer.webm.asset.json";
import ohAsset from "@/assets/crowd-oh.webm.asset.json";
import { getMix, subscribeMix } from "@/lib/mix";

/**
 * Arena ambience: a continuous crowd bed under the broadcast plus short
 * reactions fired on impacts, big blows and knockouts. Everything is muted
 * together with the announcer, so one sound switch controls the whole show.
 */

let bed: HTMLAudioElement | null = null;
let enabled = false;
let ducked = false;

const BED_BASE = 0.32;

/** Crowd level asked for by the admin faders (0..1). */
function crowdLevel() {
  return getMix().crowd;
}

function bedTarget() {
  return BED_BASE * crowdLevel() * (ducked ? 0.45 : 1);
}

if (typeof window !== "undefined") {
  subscribeMix(() => {
    if (enabled) ramp(bedTarget());
  });
}

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
    ramp(bedTarget());
  } else {
    ramp(0);
  }
}

/** Duck the crowd while the announcer is speaking so the voice stays clear. */
export function duckCrowd(down: boolean) {
  ducked = down;
  if (!enabled || !bed) return;
  ramp(bedTarget());
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
  const base = kind === "ko" ? 0.85 : kind === "big" ? 0.6 : 0.4;
  audio.volume = Math.min(1, base * crowdLevel());
  void audio.play().catch(() => {});
}
