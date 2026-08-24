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
  /** Compound state trace: context before -> selected move -> context after. */
  fightAttacker: string;
  fightDefender: string;
  fightRelation: string;
  fightStateMove: string;
  fightNextAttacker: string;
  fightNextDefender: string;
  fightNextRelation: string;
  /** How the pick was obtained: state | state-global | legacy-fallback. */
  fightSource: string;
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
  fightAttacker: "—",
  fightDefender: "—",
  fightRelation: "—",
  fightStateMove: "—",
  fightNextAttacker: "—",
  fightNextDefender: "—",
  fightNextRelation: "—",
  fightSource: "—",
  fightStateFiltered: false,
};

/**
 * Publish one hop of the fight-state machine. Debug only: the panel is hidden
 * unless the existing scene-debug switch is on.
 */
export function fightStateTrace(entry: {
  from: { attacker: string; defender: string; relation: string };
  move: string;
  to: { attacker: string; defender: string; relation: string };
  source: string;
  filtered: boolean;
}) {
  state = {
    ...state,
    fightAttacker: entry.from.attacker,
    fightDefender: entry.from.defender,
    fightRelation: entry.from.relation,
    fightStateMove: entry.move,
    fightNextAttacker: entry.to.attacker,
    fightNextDefender: entry.to.defender,
    fightNextRelation: entry.to.relation,
    fightSource: entry.source,
    fightStateFiltered: entry.filtered,
  };
  emit();
  // Always visible in the browser console so the state engine can be verified live.
  if (entry.source === "state-idle" || entry.source === "state-recovery") {
    const action = entry.source === "state-idle" ? "IDLE" : "RECOVERY";
    console.log(
      `[FIGHT ENGINE] STATE ENGINE: STRICT ACTIVE | NO LEGAL MOVE | ACTION: ${action}` +
        ` (attacker=${entry.from.attacker} defender=${entry.from.defender} relation=${entry.from.relation})` +
        (action === "RECOVERY" ? ` -> ${entry.move}` : ""),
    );
    return;
  }
  console.log(
    `[FIGHT ENGINE] attacker=${entry.from.attacker} defender=${entry.from.defender} relation=${entry.from.relation}` +
      ` -> ${entry.move} [${entry.source}]` +
      ` -> attacker=${entry.to.attacker} defender=${entry.to.defender} relation=${entry.to.relation}`,
  );
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
