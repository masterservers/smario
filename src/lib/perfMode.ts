/**
 * Shared "low power" detection for the arena overlays.
 *
 * Two layers:
 *  1. static heuristics (reduced motion, few cores, little RAM, small phone)
 *  2. a live frame-rate sampler that downgrades to lite mode when the page
 *     really drops frames (weak GPU, thermal throttling, battery saver).
 *
 * The result is mirrored on <html data-perf="lite"> so CSS can drop the
 * expensive effects (backdrop blur, colour grading, big shadows) without any
 * component re-render.
 */
import { useEffect, useState } from "react";

let current = false;
let started = false;
const listeners = new Set<(lite: boolean) => void>();

function apply(next: boolean) {
  if (next === current) return;
  current = next;
  if (typeof document !== "undefined") {
    document.documentElement.dataset["perf"] = next ? "lite" : "full";
  }
  for (const listener of listeners) listener(next);
}

function staticHeuristic(): boolean {
  if (typeof window === "undefined") return false;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const cores = navigator.hardwareConcurrency ?? 8;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  return reduced || cores <= 4 || memory <= 4 || (coarse && window.innerWidth < 480);
}

/** Samples real frame times and flips to lite mode when the page stutters. */
function startSampler() {
  if (started || typeof window === "undefined") return;
  started = true;
  apply(staticHeuristic());

  let frames = 0;
  let slow = 0;
  let last = performance.now();
  let windowStart = last;
  let raf = 0;

  const tick = (now: number) => {
    const delta = now - last;
    last = now;
    frames += 1;
    if (delta > 34) slow += 1; // below ~30fps for that frame

    if (now - windowStart >= 2000) {
      const fps = (frames * 1000) / (now - windowStart);
      // Downgrade on a sustained bad window; never upgrade a device that the
      // static heuristic already marked as weak.
      if (fps < 42 || slow / Math.max(frames, 1) > 0.25) apply(true);
      frames = 0;
      slow = 0;
      windowStart = now;
    }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
    } else {
      last = performance.now();
      windowStart = last;
      frames = 0;
      slow = 0;
      raf = requestAnimationFrame(tick);
    }
  });
}

/** True when the device should run the cheap version of the overlays. */
export function usePerfMode(): boolean {
  const [lite, setLite] = useState(current);
  useEffect(() => {
    startSampler();
    setLite(current);
    listeners.add(setLite);
    return () => {
      listeners.delete(setLite);
    };
  }, []);
  return lite;
}

export function isLiteMode(): boolean {
  return current;
}
