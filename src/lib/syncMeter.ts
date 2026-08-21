import { useEffect, useState } from "react";

/**
 * Broadcast sync meter: measures the delay between a ring event (punch, kick,
 * referee count, knockout) and the moment the announcer line actually starts
 * playing. Used by the arena overlay for live debugging of A/V sync and for
 * exporting a per-round log of every single line.
 */

export type CueKind = "hit" | "big" | "ko" | "count" | "idle";

export type SyncSample = {
  id: number;
  kind: CueKind;
  /** Delay in ms between the cue frame and the first audible word. */
  deltaMs: number;
  /** Which voice served the line. */
  source: "cache" | "neural" | "local" | "silent" | "dropped";
  /** The exact spoken line, so the log shows what was said and when. */
  text: string;
  lang: string;
  round: number;
  at: number;
};

export type KindStat = { kind: CueKind; count: number; averageMs: number; worstMs: number };

export type SyncState = {
  last: SyncSample | null;
  /** Rolling average over the recent samples, in ms. */
  averageMs: number;
  worstMs: number;
  samples: SyncSample[];
  /** Per-cue breakdown (punch / big blow / count / KO / ambient). */
  byKind: KindStat[];
  /** Lines that never went on air because a bigger call interrupted them. */
  dropped: number;
  round: number;
  /** Full log of the current round, ready for export. */
  roundLog: SyncSample[];
};

const MAX_SAMPLES = 24;
const MAX_LOG = 500;

const EMPTY: SyncState = {
  last: null,
  averageMs: 0,
  worstMs: 0,
  samples: [],
  byKind: [],
  dropped: 0,
  round: 1,
  roundLog: [],
};

let state: SyncState = EMPTY;
const listeners = new Set<(value: SyncState) => void>();

let seq = 0;
const pending = new Map<number, { kind: CueKind; at: number }>();

function emit() {
  for (const listener of listeners) listener(state);
}

function recompute(sample: SyncSample) {
  const roundLog = [...state.roundLog, sample].slice(-MAX_LOG);
  const onAir = roundLog.filter((item) => item.source !== "dropped");
  const samples = onAir.slice(-MAX_SAMPLES);
  const total = samples.reduce((sum, item) => sum + item.deltaMs, 0);
  const kinds = new Map<CueKind, { count: number; total: number; worst: number }>();
  for (const item of onAir) {
    const bucket = kinds.get(item.kind) ?? { count: 0, total: 0, worst: 0 };
    bucket.count += 1;
    bucket.total += item.deltaMs;
    bucket.worst = Math.max(bucket.worst, item.deltaMs);
    kinds.set(item.kind, bucket);
  }
  state = {
    last: sample.source === "dropped" ? state.last : sample,
    samples,
    averageMs: samples.length ? Math.round(total / samples.length) : 0,
    worstMs: samples.reduce((max, item) => Math.max(max, item.deltaMs), 0),
    byKind: [...kinds.entries()].map(([kind, bucket]) => ({
      kind,
      count: bucket.count,
      averageMs: Math.round(bucket.total / bucket.count),
      worstMs: bucket.worst,
    })),
    dropped: roundLog.filter((item) => item.source === "dropped").length,
    round: state.round,
    roundLog,
  };
  emit();
}

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
export function resolveCue(
  id: number | undefined,
  source: SyncSample["source"],
  line?: { text?: string | undefined; lang?: string | undefined },
) {
  if (!id) return;
  const cue = pending.get(id);
  if (!cue) return;
  pending.delete(id);
  recompute({
    id,
    kind: cue.kind,
    deltaMs: Math.round(performance.now() - cue.at),
    source,
    text: line?.text ?? "",
    lang: line?.lang ?? "",
    round: state.round,
    at: Date.now(),
  });
}

/** Drops a cue whose line never went on air (interrupted by a bigger call). */
export function dropCue(
  id: number | undefined,
  line?: { text?: string | undefined; lang?: string | undefined },
) {
  if (!id) return;
  const cue = pending.get(id);
  if (!cue) return;
  pending.delete(id);
  recompute({
    id,
    kind: cue.kind,
    deltaMs: Math.round(performance.now() - cue.at),
    source: "dropped",
    text: line?.text ?? "",
    lang: line?.lang ?? "",
    round: state.round,
    at: Date.now(),
  });
}

/** Starts a fresh log whenever the round changes. */
export function setSyncRound(round: number) {
  if (round === state.round) return;
  state = { ...EMPTY, round };
  emit();
}

export function resetSyncMeter() {
  pending.clear();
  state = { ...EMPTY, round: state.round };
  emit();
}

export function getSyncState(): SyncState {
  return state;
}

function stamp(at: number) {
  return new Date(at).toISOString();
}

/** CSV export of every line in the current round, with its own delay. */
export function syncLogCsv(): string {
  const rows = [
    ["time", "round", "cue", "delay_ms", "voice", "lang", "line"].join(","),
    ...state.roundLog.map((item) =>
      [
        stamp(item.at),
        item.round,
        item.kind,
        item.deltaMs,
        item.source,
        item.lang,
        `"${item.text.replace(/"/g, '""')}"`,
      ].join(","),
    ),
  ];
  return rows.join("\n");
}

export function syncLogJson(): string {
  return JSON.stringify(
    {
      round: state.round,
      exportedAt: stamp(Date.now()),
      averageMs: state.averageMs,
      worstMs: state.worstMs,
      dropped: state.dropped,
      byKind: state.byKind,
      lines: state.roundLog.map((item) => ({ ...item, time: stamp(item.at) })),
    },
    null,
    2,
  );
}

/** Downloads the current round log as CSV or JSON. */
export function downloadSyncLog(format: "csv" | "json" = "csv") {
  if (typeof window === "undefined" || state.roundLog.length === 0) return;
  const body = format === "csv" ? syncLogCsv() : syncLogJson();
  const blob = new Blob([body], {
    type: format === "csv" ? "text/csv;charset=utf-8" : "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `sync-round-${state.round}-${Date.now()}.${format}`;
  link.click();
  URL.revokeObjectURL(url);
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
