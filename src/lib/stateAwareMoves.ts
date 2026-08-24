/**
 * Migrated slice of the catalog (compound model).
 *
 * These are NOT new moves: each entry describes a scene that already exists in
 * `scenes.ts` (same reel window, same rate, same impact) in the vocabulary of
 * `fightState.ts`. This phase keeps the 10 test moves only — the rest of the
 * catalog stays in place, unmigrated, and is excluded from state-aware
 * selection while STATE_ENGINE_STRICT is on.
 */

import { FOLLOW_UPS, MOVES, type Move } from "@/lib/scenes";
import { defineMove, type FightContext, type MoveDefinition } from "@/lib/fightState";

const BY_ID = new Map<string, Move>();
for (const move of [...MOVES, ...FOLLOW_UPS]) if (!BY_ID.has(move.id)) BY_ID.set(move.id, move);

type Spec = Parameters<typeof defineMove>[1];

const SAMPLE: Array<[sceneId: string, spec: Spec]> = [
  [
    "jab-a",
    {
      family: "punch",
      requires: {
        attacker: ["standing"],
        defender: ["standing", "kneeling"],
        relation: ["distance", "close_range"],
      },
      result: { attacker: "standing", defender: "standing", relation: "close_range" },
      tags: ["boxing", "light"],
    },
  ],
  [
    "clothesline",
    {
      family: "running_strike",
      requires: {
        attacker: ["standing", "running"],
        defender: ["standing"],
        relation: ["distance", "close_range"],
      },
      result: { attacker: "standing", defender: "grounded", relation: "close_range" },
      tags: ["running", "knockdown"],
    },
  ],
  [
    "grapple-b",
    {
      family: "grapple",
      requires: {
        attacker: ["standing"],
        defender: ["standing"],
        relation: ["close_range", "clinch"],
      },
      result: { attacker: "standing", defender: "standing", relation: "clinch" },
      tags: ["takedown"],
    },
  ],
  [
    "suplex",
    {
      family: "suplex",
      requires: { attacker: ["standing"], defender: ["standing"], relation: ["clinch"] },
      result: { attacker: "standing", defender: "grounded", relation: "close_range" },
      tags: ["power"],
    },
  ],
  [
    "slam-a",
    {
      family: "slam",
      requires: { attacker: ["standing"], defender: ["standing"], relation: ["clinch"] },
      result: { attacker: "standing", defender: "grounded", relation: "close_range" },
      tags: ["power"],
    },
  ],
  [
    "dropkick",
    {
      family: "kick",
      requires: {
        attacker: ["standing", "running"],
        defender: ["standing"],
        relation: ["distance", "close_range"],
      },
      result: { attacker: "grounded", defender: "grounded", relation: "close_range" },
      tags: ["knockdown"],
    },
  ],
  [
    "top-rope-splash",
    {
      family: "aerial",
      // Compound: attacker must be up top AND defender must already be down.
      requires: { attacker: ["top_rope"], defender: ["grounded"] },
      result: { attacker: "grounded", defender: "grounded", relation: "close_range" },
      tags: ["high-risk"],
    },
  ],
  [
    "w-sharpshooter",
    {
      family: "submission",
      requires: { attacker: ["standing"], defender: ["grounded"] },
      result: { attacker: "standing", defender: "grounded", relation: "submission" },
      tags: ["ground"],
    },
  ],
  [
    "w-roll-up",
    {
      family: "pin",
      requires: {
        attacker: ["standing", "kneeling"],
        defender: ["grounded", "kneeling"],
      },
      result: { attacker: "kneeling", defender: "grounded", relation: "pin" },
      tags: ["pin"],
    },
  ],
  [
    "vfu-back-up",
    {
      family: "recovery",
      // Anyone down (or a hold that just ended) can reset the fight to neutral.
      requires: { defender: ["grounded", "kneeling", "recovering"] },
      result: { attacker: "standing", defender: "standing", relation: "distance" },
      tags: ["reset"],
    },
  ],
];

/** id → compound description, only for the scenes migrated so far. */
export const STATE_AWARE_MOVES: Map<string, MoveDefinition> = new Map(
  SAMPLE.flatMap(([id, spec]) => {
    const scene = BY_ID.get(id);
    return scene ? ([[id, defineMove(scene, spec)]] as Array<[string, MoveDefinition]>) : [];
  }),
);

/** Scenes backing the migrated moves — used as the strict global fallback pool. */
export const STATE_AWARE_SCENES: Move[] = [...STATE_AWARE_MOVES.keys()].flatMap((id) => {
  const scene = BY_ID.get(id);
  return scene ? [scene] : [];
});

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

/** The context the fight is in after a scene, when that scene is described. */
export function contextAfterScene(item: { id: string }, current: FightContext): FightContext {
  const definition = STATE_AWARE_MOVES.get(item.id);
  if (!definition) return current;
  return {
    attacker: definition.result.attacker ?? current.attacker,
    defender: definition.result.defender ?? current.defender,
    relation: definition.result.relation ?? current.relation,
  };
}
