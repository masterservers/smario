/**
 * First slice of the state-aware catalog.
 *
 * These are NOT new moves: each entry describes a scene that already exists in
 * `scenes.ts` (same reel window, same rate, same impact) in the vocabulary of
 * `fightState.ts`. Everything not listed here stays unconstrained and keeps
 * playing exactly as before, so this is purely additive.
 */

import { FOLLOW_UPS, MOVES, type Move } from "@/lib/scenes";
import { defineMove, type FightState, type MoveDefinition } from "@/lib/fightState";

const BY_ID = new Map<string, Move>();
for (const move of [...MOVES, ...FOLLOW_UPS]) if (!BY_ID.has(move.id)) BY_ID.set(move.id, move);

type Spec = Parameters<typeof defineMove>[1];

/** Representative sample requested for step one of the migration. */
const SAMPLE: Array<[sceneId: string, spec: Spec]> = [
  [
    "jab-a",
    {
      family: "punch",
      startState: "standing_distance",
      endState: "close_range",
      allowedFromStates: ["neutral_standing", "standing_distance", "close_range", "corner", "ropes"],
      followUpStates: ["close_range", "clinch", "standing_distance"],
      tags: ["boxing", "light"],
    },
  ],
  [
    "clothesline",
    {
      family: "running_strike",
      startState: "standing_distance",
      endState: "opponent_grounded",
      allowedFromStates: ["neutral_standing", "standing_distance", "ropes"],
      followUpStates: ["opponent_grounded", "pin_position", "submission_position"],
      tags: ["running", "knockdown"],
    },
  ],
  [
    "grapple-b",
    {
      family: "grapple",
      startState: "close_range",
      endState: "opponent_grounded",
      allowedFromStates: ["close_range", "clinch", "attacker_behind", "corner"],
      followUpStates: ["opponent_grounded", "both_grounded", "submission_position"],
      tags: ["takedown"],
    },
  ],
  [
    "suplex",
    {
      family: "suplex",
      startState: "clinch",
      endState: "opponent_grounded",
      allowedFromStates: ["clinch", "close_range", "attacker_behind"],
      followUpStates: ["opponent_grounded", "pin_position"],
      tags: ["power"],
    },
  ],
  [
    "slam-a",
    {
      family: "slam",
      startState: "clinch",
      endState: "opponent_grounded",
      allowedFromStates: ["clinch", "close_range", "corner"],
      followUpStates: ["opponent_grounded", "pin_position"],
      tags: ["power"],
    },
  ],
  [
    "dropkick",
    {
      family: "kick",
      startState: "standing_distance",
      endState: "opponent_grounded",
      allowedFromStates: ["neutral_standing", "standing_distance", "ropes"],
      followUpStates: ["opponent_grounded", "attacker_grounded"],
      tags: ["knockdown"],
    },
  ],
  [
    "top-rope-splash",
    {
      family: "aerial",
      startState: "top_rope",
      endState: "opponent_grounded",
      allowedFromStates: ["top_rope", "corner", "ropes", "opponent_grounded"],
      followUpStates: ["opponent_grounded", "pin_position"],
      tags: ["high-risk"],
    },
  ],
  [
    "w-sharpshooter",
    {
      family: "submission",
      startState: "opponent_grounded",
      endState: "submission_position",
      allowedFromStates: ["opponent_grounded", "both_grounded"],
      followUpStates: ["submission_position", "opponent_grounded"],
      tags: ["ground"],
    },
  ],
  [
    "w-roll-up",
    {
      family: "pin",
      startState: "opponent_grounded",
      endState: "pin_position",
      allowedFromStates: ["opponent_grounded", "both_grounded", "submission_position"],
      followUpStates: ["pin_position", "neutral_standing"],
      tags: ["pin"],
    },
  ],
  [
    "vfu-back-up",
    {
      family: "recovery",
      startState: "opponent_grounded",
      endState: "neutral_standing",
      allowedFromStates: [
        "opponent_grounded",
        "attacker_grounded",
        "both_grounded",
        "pin_position",
        "submission_position",
      ],
      followUpStates: ["neutral_standing", "standing_distance"],
      tags: ["reset"],
    },
  ],
];

/** id → state description, only for the scenes migrated so far. */
export const STATE_AWARE_MOVES: Map<string, MoveDefinition> = new Map(
  SAMPLE.flatMap(([id, spec]) => {
    const scene = BY_ID.get(id);
    return scene ? ([[id, defineMove(scene, spec)]] as Array<[string, MoveDefinition]>) : [];
  }),
);

export function moveDefinitionOf(item: { id: string }): MoveDefinition | undefined {
  return STATE_AWARE_MOVES.get(item.id);
}

/** How much of the catalog already speaks the state vocabulary. */
export function stateAwareCoverage() {
  return {
    migrated: STATE_AWARE_MOVES.size,
    totalScenes: MOVES.length + FOLLOW_UPS.length,
  };
}

/** The state the fight is in after a scene, when that scene is described. */
export function stateAfterScene(item: { id: string }, current: FightState): FightState {
  return STATE_AWARE_MOVES.get(item.id)?.endState ?? current;
}
