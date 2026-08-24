/**
 * Typed fight-state layer (additive).
 *
 * The arena historically picked scenes purely by tier / family / LRU, so a
 * pin could follow a jab and a submission could appear out of neutral. This
 * module introduces the vocabulary needed to make selection *positional*:
 * where the two fighters physically are, which moves may legally start from
 * there, and which state a move leaves behind.
 *
 * Nothing here plays video and nothing here replaces the existing scheduler.
 * Moves that are not described yet are simply "unconstrained" and keep
 * behaving exactly as before, so the migration can proceed a few moves at a
 * time without ever starving the arena.
 */

import type { Move } from "@/lib/scenes";

export type FightState =
  | "neutral_standing"
  | "standing_distance"
  | "close_range"
  | "clinch"
  | "attacker_behind"
  | "defender_behind"
  | "ropes"
  | "corner"
  | "opponent_grounded"
  | "attacker_grounded"
  | "both_grounded"
  | "top_rope"
  | "airborne"
  | "pin_position"
  | "submission_position"
  | "recovery";

export type MoveFamily =
  | "punch"
  | "elbow"
  | "forearm"
  | "chop"
  | "kick"
  | "knee"
  | "running_strike"
  | "clinch"
  | "grapple"
  | "throw"
  | "slam"
  | "suplex"
  | "power_move"
  | "aerial"
  | "rope"
  | "corner"
  | "ground_attack"
  | "submission"
  | "pin"
  | "counter"
  | "dodge"
  | "recovery"
  | "taunt";

/**
 * A move as the state machine sees it. The playback fields (src/start/end/…)
 * mirror the legacy `Move` shape on purpose: a MoveDefinition can be handed to
 * the existing player unchanged.
 */
export type MoveDefinition = {
  id: string;
  label: string;
  family: MoveFamily;
  tier: number;

  /** Position the move is performed from and the one it leaves behind. */
  startState: FightState;
  endState: FightState;
  /** Every state the move may legally be launched from. */
  allowedFromStates: FightState[];
  /** States the engine may reasonably move into after this move. */
  followUpStates: FightState[];

  /** Playback (seconds), kept identical to the legacy reel window. */
  src?: string;
  start: number;
  end: number;
  duration: number;
  impactTime: number;
  rate: number;

  visualSequenceId?: string;
  tags: string[];
};

export const INITIAL_FIGHT_STATE: FightState = "neutral_standing";

/** Positions in which the defender is down on the mat. */
export const GROUNDED_FIGHT_STATES: FightState[] = [
  "opponent_grounded",
  "both_grounded",
  "pin_position",
  "submission_position",
];

export function isOpponentGrounded(state: FightState): boolean {
  return GROUNDED_FIGHT_STATES.includes(state);
}

/** Can this move legally start from the current position? */
export function canPlayMove(move: MoveDefinition, currentState: FightState): boolean {
  return move.allowedFromStates.includes(currentState);
}

/** Position the fight is in once the move has played out. */
export function nextFightState(move: MoveDefinition): FightState {
  return move.endState;
}

/** Every move in a pool that is legal right now. */
export function getEligibleMoves(
  currentState: FightState,
  pool: MoveDefinition[],
): MoveDefinition[] {
  return pool.filter((move) => canPlayMove(move, currentState));
}

/**
 * State-aware pick. `draw` is the caller's existing anti-repetition/LRU
 * chooser: state filtering happens FIRST, the LRU cycle then runs on the legal
 * subset, exactly as required. When nothing is legal the caller's untouched
 * pool is used, so the scheduler can never starve.
 */
export function chooseStateAwareMove<T extends { id: string }>(args: {
  currentState: FightState;
  pool: T[];
  /** State description for a pool entry, or undefined when not migrated yet. */
  definitionOf: (item: T) => MoveDefinition | undefined;
  draw: (pool: T[]) => T;
}): { pick: T; definition?: MoveDefinition; filtered: boolean } {
  const { currentState, pool, definitionOf, draw } = args;
  const legal = pool.filter((item) => {
    const definition = definitionOf(item);
    // Not migrated yet → unconstrained, keeps the legacy behaviour.
    return !definition || canPlayMove(definition, currentState);
  });
  const usable = legal.length > 0 ? legal : pool;
  const pick = draw(usable);
  const definition = definitionOf(pick);
  return definition
    ? { pick, definition, filtered: legal.length !== pool.length }
    : { pick, filtered: legal.length !== pool.length };
}

/** Bridge helper: turn a legacy scene + state data into a MoveDefinition. */
export function defineMove(
  move: Move,
  spec: Pick<
    MoveDefinition,
    "family" | "startState" | "endState" | "allowedFromStates" | "followUpStates"
  > & { tags?: string[] },
): MoveDefinition {
  const definition: MoveDefinition = {
    id: move.id,
    label: move.label,
    family: spec.family,
    tier: move.tier,
    startState: spec.startState,
    endState: spec.endState,
    allowedFromStates: spec.allowedFromStates,
    followUpStates: spec.followUpStates,
    start: move.start,
    end: move.end,
    duration: Number((move.end - move.start).toFixed(2)),
    impactTime: move.impact,
    rate: move.rate,
    tags: spec.tags ?? [],
  };
  if (move.src) definition.src = move.src;
  if (move.visualSequenceId) definition.visualSequenceId = move.visualSequenceId;
  return definition;
}
