import { useEffect, useState } from "react";

/**
 * Broadcast audio mix: announcer level vs. crowd ambience level.
 * The admin console owns the faders; every open arena/live tab applies them
 * instantly through the control bus, so the show stays balanced everywhere.
 */
export type AudioMix = {
  /** Commentator + referee voice level, 0..1 */
  voice: number;
  /** Arena crowd reactions level (cheers, groans, KO pops), 0..1 */
  crowd: number;
  /** Continuous ambience bed under the action, 0..1 */
  ambience: number;
};

export const DEFAULT_MIX: AudioMix = { voice: 1, crowd: 0.6, ambience: 0.6 };

const KEY = "pvt.audioMix";

function clamp(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(1, Math.max(0, n));
}

export function normalizeMix(raw: unknown): AudioMix {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_MIX };
  const parsed = raw as Partial<AudioMix>;
  return {
    voice: clamp(parsed.voice, DEFAULT_MIX.voice),
    crowd: clamp(parsed.crowd, DEFAULT_MIX.crowd),
    ambience: clamp(parsed.ambience, DEFAULT_MIX.ambience),
  };
}

let current: AudioMix | null = null;
const listeners = new Set<(value: AudioMix) => void>();

export function getMix(): AudioMix {
  if (current) return current;
  if (typeof window === "undefined") return { ...DEFAULT_MIX };
  try {
    const raw = window.localStorage.getItem(KEY);
    current = normalizeMix(raw ? JSON.parse(raw) : null);
  } catch {
    current = { ...DEFAULT_MIX };
  }
  return current;
}

/** Applies a mix locally (persist + notify listeners). No bus publishing here. */
export function applyMix(value: AudioMix) {
  current = normalizeMix(value);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(current));
    } catch {
      /* storage unavailable — keep the in-memory mix */
    }
  }
  for (const listener of listeners) listener(current);
}

export function subscribeMix(listener: (value: AudioMix) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useMix(): AudioMix {
  const [value, setValue] = useState<AudioMix>(DEFAULT_MIX);
  useEffect(() => {
    setValue(getMix());
    return subscribeMix(setValue);
  }, []);
  return value;
}
