/**
 * Compound fight-state layer.
 *
 * A single enum could not express situations that involve BOTH fighters at the
 * same time ("attacker on the top rope AND defender already down"), so the
 * position of each fighter and the relation between them are now tracked
 * separately:
 *
 *   FightContext { attacker, defender, relation }
 *
 * A move declares `requires` (AND across the three axes, OR inside each axis)
 * and `result` (the partial context it leaves behind). Nothing here plays
 * video; the scheduler in the arena keeps its LRU / anti-repetition draw and
 * only runs it on the subset this module says is legal.
 */

import type { Move } from "@/lib/scenes";

export type FighterPosition =
  | "standing"
  | "running"
  | "grounded"
  | "kneeling"
  | "corner"
  | "ropes"
  | "top_rope"
  | "airborne"
  | "recovering";

export type FightRelation =
  | "distance"
  | "close_range"
  | "clinch"
  | "attacker_behind"
  | "defender_behind"
  | "pin"
  | "submission";

export type FightContext = {
  attacker: FighterPosition;
  defender: FighterPosition;
  relation: FightRelation;
};

export type MoveRequirements = {
  attacker?: FighterPosition[];
  defender?: FighterPosition[];
  relation?: FightRelation[];
};

export type MoveResult = {
  attacker?: FighterPosition;
  defender?: FighterPosition;
  relation?: FightRelation;
};

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

  /** Compound pre-conditions (all provided axes must match). */
  requires: MoveRequirements;
  /** Context changes applied once the move has played out. */
  result: MoveResult;

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

/**
 * Strict mode: only moves that have been migrated to the compound model take
 * part in state-aware selection. Legacy moves stay in the catalog (nothing is
 * deleted) but they no longer bypass the state filter.
 */
export const STATE_ENGINE_STRICT = true;

export const INITIAL_FIGHT_CONTEXT: FightContext = {
  attacker: "standing",
  defender: "standing",
  relation: "distance",
};

export function formatContext(context: FightContext): string {
  return `attacker=${context.attacker} defender=${context.defender} relation=${context.relation}`;
}

export function isDefenderGrounded(context: FightContext): boolean {
  return context.defender === "grounded" || context.defender === "kneeling";
}

/**
 * Compound check: every axis present in `requires` must contain the current
 * value (AND across axes, OR inside one axis). Missing axes are wildcards.
 */
export function canPlayMove(move: MoveDefinition, context: FightContext): boolean {
  const { attacker, defender, relation } = move.requires;
  if (attacker && !attacker.includes(context.attacker)) return false;
  if (defender && !defender.includes(context.defender)) return false;
  if (relation && !relation.includes(context.relation)) return false;
  return true;
}

/** Context after the move: the result overrides only the axes it declares. */
export function applyMoveResult(context: FightContext, move: MoveDefinition): FightContext {
  return {
    attacker: move.result.attacker ?? context.attacker,
    defender: move.result.defender ?? context.defender,
    relation: move.result.relation ?? context.relation,
  };
}

/** Every move in a pool that is legal right now. */
export function getEligibleMoves(
  context: FightContext,
  pool: MoveDefinition[],
): MoveDefinition[] {
  return pool.filter((move) => canPlayMove(move, context));
}

export type StateAwareSource =
  | "state"
  | "state-global"
  | "state-recovery"
  | "state-idle"
  | "legacy-fallback";

export type StateAwareChoice<T> = {
  /** Undefined only for `state-idle`: the engine deliberately plays nothing. */
  pick?: T;
  definition?: MoveDefinition;
  /** How the pick was obtained, for the debug panel / console trace. */
  source: StateAwareSource;
  filtered: boolean;
};

/**
 * State-aware pick.
 *
 * Strict mode (STATE_ENGINE_STRICT = true):
 * 1. legal migrated moves in the caller's pool           → "state"
 * 2. legal migrated moves in the global catalog          → "state-global"
 * 3. a legal dedicated recovery/reset move               → "state-recovery"
 * 4. nothing legal at all: no-op, the scheduler waits    → "state-idle"
 * There is NO legacy fallback in strict mode: an unmigrated move can never be
 * selected. Legacy fallback only exists with strict mode off.
 */
export function chooseStateAwareMove<T extends { id: string }>(args: {
  context: FightContext;
  pool: T[];
  definitionOf: (item: T) => MoveDefinition | undefined;
  draw: (pool: T[]) => T;
  /** Global migrated catalog used when the caller's pool has no legal move. */
  globalPool?: T[];
  /** Dedicated recovery/reset scenes used as the last legal resort. */
  recoveryPool?: T[];
  strict?: boolean;
}): StateAwareChoice<T> {
  const {
    context,
    pool,
    definitionOf,
    draw,
    globalPool,
    recoveryPool,
    strict = STATE_ENGINE_STRICT,
  } = args;

  const legal = (items: T[]) =>
    items.filter((item) => {
      const definition = definitionOf(item);
      if (!definition) return !strict; // unmigrated: blocked in strict mode
      return canPlayMove(definition, context);
    });

  const build = (items: T[], source: StateAwareSource, filtered: boolean): StateAwareChoice<T> => {
    const pick = draw(items);
    const definition = definitionOf(pick);
    const choice: StateAwareChoice<T> = { pick, source, filtered };
    if (definition) choice.definition = definition;
    return choice;
  };

  const inPool = legal(pool);
  if (inPool.length > 0) return build(inPool, "state", inPool.length !== pool.length);

  if (globalPool && globalPool.length > 0) {
    const inGlobal = legal(globalPool);
    if (inGlobal.length > 0) return build(inGlobal, "state-global", true);
  }

  if (recoveryPool && recoveryPool.length > 0) {
    const inRecovery = legal(recoveryPool);
    if (inRecovery.length > 0) return build(inRecovery, "state-recovery", true);
  }

  if (strict) {
    // No legal migrated move anywhere: wait instead of breaking physics.
    return { source: "state-idle", filtered: true };
  }

  return build(pool, "legacy-fallback", true);
}


/** Bridge helper: turn a legacy scene + compound spec into a MoveDefinition. */
export function defineMove(
  move: Move,
  spec: {
    family: MoveFamily;
    requires: MoveRequirements;
    result: MoveResult;
    tags?: string[];
  },
): MoveDefinition {
  const definition: MoveDefinition = {
    id: move.id,
    label: move.label,
    family: spec.family,
    tier: move.tier,
    requires: spec.requires,
    result: spec.result,
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
