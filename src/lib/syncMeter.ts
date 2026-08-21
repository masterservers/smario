import { useEffect, useState } from "react";

/**
 * Broadcast sync meter: measures the delay between a ring event (punch, kick,
 * referee count, knockout) and the moment the announcer line actually starts
 * playing. Used by the arena overlay for live debugging of A/V sync.
 */

export type CueKind = "hit" | "big" | "ko" | "count" | "idle";

export type SyncSample = {
  id: number;
  kind: CueKind;
  /** Delay in ms between the cue frame and the first audible word. */
  deltaMs: number;
  /** Which voice served the line. */
  source: "cache" | "neural" | "local" | "silent";
  at: number;
};

export type SyncState = {
  last: SyncSample | null;
  /** Rolling average over the recent samples, in ms. */
  averageMs: number;
  worstMs: number;
  samples: SyncSample[];
};

const MAX_SAMPLES = 24;

let state: SyncState = { last: null, averageMs: 0, worstMs: 0, samples: [] };
const listeners = new Set<(value: SyncState) => void>();

let seq = 0;
const pending = new Map<number, { kind: CueKind; at: number }>();

/** Called on the frame the event happens. Returns a cue id to resolve later. */
export function markCue(kind: CueKind): number {
  if (typeof window === "undefined") return 0;
  const id = ++seq;
  pending.set(id, { kind, at: performance.now() });
  // Never let abandoned cues (dropped lines) pile up.
  if (pending.size > 32) pending.delete(pending.keys().next().value as number);
  return id;
}

/** Called when the voice line for a cue actually starts. */
export function resolveCue(id: number | undefined, source: SyncSample["source"]) {
  if (!id) return;
  const cue = pending.get(id);
  if (!cue) return;
  pending.delete(id);
  const sample: SyncSample = {
    id,
    kind: cue.kind,
    deltaMs: Math.round(performance.now() - cue.at),
    source,
    at: Date.now(),
  };
  const samples = [...state.samples, sample].slice(-MAX_SAMPLES);
  const total = samples.reduce((sum, item) => sum + item.deltaMs, 0);
  state = {
    last: sample,
    samples,
    averageMs: Math.round(total / samples.length),
    worstMs: samples.reduce((max, item) => Math.max(max, item.deltaMs), 0),
  };
  for (const listener of listeners) listener(state);
}

/** Drops a cue whose line never went on air (interrupted by a bigger call). */
export function dropCue(id: number | undefined) {
  if (id) pending.delete(id);
}

export function resetSyncMeter() {
  pending.clear();
  state = { last: null, averageMs: 0, worstMs: 0, samples: [] };
  for (const listener of listeners) listener(state);
}

export function getSyncState(): SyncState {
  return state;
}

export function useSyncMeter(): SyncState {
  const [value, setValue] = useState<SyncState>(state);
  useEffect(() => {
    setValue(state);
    listeners.add(setValue);
    return () => {
      listeners.delete(setValue);
    };
  }, []);
  return value;
}
