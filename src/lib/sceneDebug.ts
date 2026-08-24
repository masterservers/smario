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
  /** State machine trace: currentFightState -> selectedMove -> nextFightState */
  fightStateFrom: string;
  fightStateMove: string;
  fightStateTo: string;
  /** Whether the state layer actually narrowed the pool for this pick. */
  fightStateFiltered: boolean;
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
  fightStateFrom: "—",
  fightStateMove: "—",
  fightStateTo: "—",
  fightStateFiltered: false,
};

/**
 * Publish one hop of the fight-state machine. Debug only: the panel is hidden
 * unless the existing scene-debug switch is on.
 */
export function fightStateTrace(entry: {
  from: string;
  move: string;
  to: string;
  filtered: boolean;
}) {
  state = {
    ...state,
    fightStateFrom: entry.from,
    fightStateMove: entry.move,
    fightStateTo: entry.to,
    fightStateFiltered: entry.filtered,
  };
  emit();
  if (typeof window !== "undefined" && (window as { __fightStateTrace?: boolean }).__fightStateTrace)
    console.debug(`[fight-state] ${entry.from} -> ${entry.move} -> ${entry.to}`);
}

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
