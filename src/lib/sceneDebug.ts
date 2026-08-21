import { useEffect, useState } from "react";

/**
 * Tiny event bus for the scheduler debug panel: the arena publishes what it is
 * playing and why a transition happened (or was refused by a rule), the panel
 * only reads.
 */
export type SceneDebugState = {
  /** Scene currently on screen. */
  id: string;
  label: string;
  group: "move" | "follow" | "idle" | "ko";
  /** performance.now() at the moment the scene started. */
  startedAt: number;
  /** Planned duration in ms at the current playback rate. */
  plannedMs: number;
  /** Why the previous scene ended. */
  endedReason: string;
  /** Last rule that refused a transition. */
  blockedBy: string;
  blockedAt: number;
  /** Round-plan read-out: beat on air, beat coming next, new-set marker. */
  beat: string;
  nextBeat: string;
  beatIndex: number;
  beatCount: number;
  newSetNext: boolean;
  /** What drives the ring right now and why. */
  mode: "gift action" | "sparring" | "feeling out" | "ko";
  modeReason: string;
  /** Crowd momentum 0..1 and the resulting sparring probability. */
  momentum: number;
  sparChance: number;
  /** Milliseconds since the last gift arrived. */
  quietMs: number;
};

const initial: SceneDebugState = {
  id: "—",
  label: "—",
  group: "idle",
  startedAt: 0,
  plannedMs: 0,
  endedReason: "—",
  blockedBy: "—",
  blockedAt: 0,
  beat: "—",
  nextBeat: "—",
  beatIndex: 0,
  beatCount: 0,
  newSetNext: false,
  mode: "feeling out",
  modeReason: "—",
  momentum: 0,
  sparChance: 0,
  quietMs: 0,
};

let state: SceneDebugState = initial;
const listeners = new Set<(value: SceneDebugState) => void>();

function emit() {
  for (const listener of listeners) listener(state);
}

export function sceneStarted(entry: {
  id: string;
  label: string;
  group: SceneDebugState["group"];
  plannedMs: number;
  reason: string;
}) {
  state = {
    ...state,
    id: entry.id,
    label: entry.label,
    group: entry.group,
    startedAt: performance.now(),
    plannedMs: Math.round(entry.plannedMs),
    endedReason: entry.reason,
  };
  emit();
}

/** Live scheduler telemetry: round beat, drive mode and crowd momentum. */
export function sceneTelemetry(entry: Partial<
  Pick<
    SceneDebugState,
    | "beat"
    | "nextBeat"
    | "beatIndex"
    | "beatCount"
    | "newSetNext"
    | "mode"
    | "modeReason"
    | "momentum"
    | "sparChance"
    | "quietMs"
  >
>) {
  state = { ...state, ...entry };
  emit();
}

/** A rule refused a transition (animation lock, minimum duration, tail). */
export function sceneBlocked(rule: string) {
  if (state.blockedBy === rule && performance.now() - state.blockedAt < 400) return;
  state = { ...state, blockedBy: rule, blockedAt: performance.now() };
  emit();
}

export function useSceneDebug(): SceneDebugState {
  const [value, setValue] = useState(state);
  useEffect(() => {
    listeners.add(setValue);
    return () => {
      listeners.delete(setValue);
    };
  }, []);
  return value;
}

/**
 * Impact marker for the end-to-end sync test: every landed frame is recorded
 * with a high-resolution timestamp so a browser test can compare it with the
 * moment the commentator actually starts speaking.
 */
export type ImpactMark = {
  at: number;
  side: string;
  label: string;
  kind: string;
  sparring: boolean;
};

declare global {
  interface Window {
    __fightImpacts?: ImpactMark[];
  }
}

export function sceneImpact(mark: Omit<ImpactMark, "at">) {
  if (typeof window === "undefined") return;
  const list = (window.__fightImpacts ??= []);
  list.push({ ...mark, at: performance.now() });
  if (list.length > 200) list.splice(0, list.length - 200);
}
