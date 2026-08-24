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
import {
  defineMove,
  type FightContext,
  type MoveDefinition,
  type MoveFamily,
} from "@/lib/fightState";

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

/* ------------------------------------------------------------------ *
 * Phase 2 — STRIKES + KICKS.
 *
 * Every entry below points at a scene that already exists in the catalog
 * (`w-*` ids built in `wrestlingMoves.ts`): no new video windows are invented,
 * the reel window / rate / impact of the scene are reused unchanged. Light
 * strikes keep the defender standing; running strikes, dropkicks and high
 * knees are the ones allowed to put him down.
 * ------------------------------------------------------------------ */

const CLOSE_LIGHT: Spec["requires"] = {
  attacker: ["standing"],
  defender: ["standing", "kneeling"],
  relation: ["close_range"],
};

const RUNNING: Spec["requires"] = {
  attacker: ["standing", "running"],
  defender: ["standing"],
  relation: ["distance", "close_range"],
};

/** Light strike: contact, no knockdown. */
const KEEP_STANDING: Spec["result"] = {
  attacker: "standing",
  defender: "standing",
  relation: "close_range",
};

/** Heavy strike: the defender goes down, the attacker stays on his feet. */
const KNOCKDOWN: Spec["result"] = {
  attacker: "standing",
  defender: "grounded",
  relation: "close_range",
};

const STRIKES: Array<[sceneId: string, spec: Spec]> = [
  // --- light hand strikes: contact only, both fighters stay up -------------
  ["w-european-uppercut", { family: "punch", requires: CLOSE_LIGHT, result: KEEP_STANDING, tags: ["boxing", "light"] }],
  ["w-forearm-smash", { family: "forearm", requires: CLOSE_LIGHT, result: KEEP_STANDING, tags: ["light"] }],
  ["w-elbow-smash", { family: "elbow", requires: CLOSE_LIGHT, result: KEEP_STANDING, tags: ["light"] }],
  ["w-back-elbow", { family: "elbow", requires: CLOSE_LIGHT, result: KEEP_STANDING, tags: ["light", "counter"] }],
  ["w-knife-edge-chop", { family: "chop", requires: CLOSE_LIGHT, result: KEEP_STANDING, tags: ["light", "chop"] }],
  ["w-chest-chop", { family: "chop", requires: CLOSE_LIGHT, result: KEEP_STANDING, tags: ["light", "chop"] }],
  ["w-mongolian-chop", { family: "chop", requires: CLOSE_LIGHT, result: KEEP_STANDING, tags: ["light", "chop"] }],
  ["w-open-hand-chop", { family: "chop", requires: CLOSE_LIGHT, result: KEEP_STANDING, tags: ["light", "chop"] }],
  ["w-headbutt", { family: "punch", requires: CLOSE_LIGHT, result: KEEP_STANDING, tags: ["light", "clinch"] }],

  // --- heavy hand strikes: knockdowns --------------------------------------
  ["w-rolling-elbow", { family: "elbow", requires: { attacker: ["standing"], defender: ["standing"], relation: ["close_range"] }, result: KNOCKDOWN, tags: ["heavy", "knockdown", "spinning"] }],
  ["w-discus-elbow", { family: "elbow", requires: { attacker: ["standing"], defender: ["standing"], relation: ["close_range"] }, result: KNOCKDOWN, tags: ["heavy", "knockdown", "spinning"] }],
  ["w-superman-punch", { family: "punch", requires: RUNNING, result: KNOCKDOWN, tags: ["boxing", "running", "knockdown"] }],

  // --- clotheslines / shoulder charges -------------------------------------
  ["w-clothesline", { family: "running_strike", requires: RUNNING, result: KNOCKDOWN, tags: ["running", "knockdown"] }],
  ["w-lariat", { family: "running_strike", requires: RUNNING, result: KNOCKDOWN, tags: ["running", "heavy", "knockdown"] }],
  ["w-running-clothesline", { family: "running_strike", requires: { attacker: ["running", "standing"], defender: ["standing"], relation: ["distance"] }, result: KNOCKDOWN, tags: ["running", "knockdown"] }],
  [
    "w-corner-clothesline",
    {
      family: "corner",
      requires: { attacker: ["standing", "running"], defender: ["corner"], relation: ["close_range"] },
      result: { attacker: "standing", defender: "corner", relation: "close_range" },
      tags: ["corner", "running"],
    },
  ],
  [
    "w-double-clothesline",
    {
      family: "running_strike",
      // Both men swing and both go down.
      requires: RUNNING,
      result: { attacker: "grounded", defender: "grounded", relation: "close_range" },
      tags: ["running", "knockdown", "double"],
    },
  ],
  ["w-flying-clothesline", { family: "running_strike", requires: { attacker: ["standing", "running", "airborne"], defender: ["standing"], relation: ["distance", "close_range"] }, result: KNOCKDOWN, tags: ["running", "airborne", "knockdown"] }],
  ["w-shoulder-block", { family: "running_strike", requires: { attacker: ["standing"], defender: ["standing"], relation: ["close_range"] }, result: KNOCKDOWN, tags: ["knockdown"] }],
  ["w-running-shoulder-block", { family: "running_strike", requires: RUNNING, result: KNOCKDOWN, tags: ["running", "knockdown"] }],
  [
    "w-spear",
    {
      family: "power_move",
      requires: { attacker: ["standing", "running"], defender: ["standing", "corner"], relation: ["distance", "close_range"] },
      result: { attacker: "kneeling", defender: "grounded", relation: "close_range" },
      tags: ["running", "heavy", "knockdown"],
    },
  ],
  [
    "w-gore",
    {
      family: "power_move",
      requires: { attacker: ["standing", "running"], defender: ["standing", "corner"], relation: ["distance", "close_range"] },
      result: { attacker: "kneeling", defender: "grounded", relation: "close_range" },
      tags: ["running", "heavy", "knockdown"],
    },
  ],

  // --- kicks ---------------------------------------------------------------
  ["w-savate-kick", { family: "kick", requires: CLOSE_LIGHT, result: KEEP_STANDING, tags: ["kickboxing", "light"] }],
  ["w-roundhouse-kick", { family: "kick", requires: CLOSE_LIGHT, result: KEEP_STANDING, tags: ["kickboxing", "karate"] }],
  ["w-big-boot", { family: "kick", requires: RUNNING, result: KNOCKDOWN, tags: ["running", "heavy", "knockdown"] }],
  ["w-bicycle-kick", { family: "kick", requires: RUNNING, result: KNOCKDOWN, tags: ["kickboxing", "knockdown"] }],
  ["w-superkick", { family: "kick", requires: { attacker: ["standing"], defender: ["standing"], relation: ["distance", "close_range"] }, result: KNOCKDOWN, tags: ["karate", "knockdown"] }],
  ["w-spinning-heel-kick", { family: "kick", requires: { attacker: ["standing"], defender: ["standing"], relation: ["distance", "close_range"] }, result: KNOCKDOWN, tags: ["karate", "spinning", "knockdown"] }],
  [
    "w-enzuigiri",
    {
      family: "kick",
      requires: { attacker: ["standing"], defender: ["standing", "kneeling"], relation: ["close_range", "attacker_behind"] },
      result: { attacker: "standing", defender: "kneeling", relation: "close_range" },
      tags: ["karate", "counter"],
    },
  ],
  [
    "w-dropkick",
    {
      family: "kick",
      requires: RUNNING,
      result: { attacker: "grounded", defender: "grounded", relation: "close_range" },
      tags: ["running", "knockdown"],
    },
  ],
  [
    "w-missile-dropkick",
    {
      family: "aerial",
      requires: { attacker: ["top_rope"], defender: ["standing"] },
      result: { attacker: "grounded", defender: "grounded", relation: "close_range" },
      tags: ["high-risk", "knockdown"],
    },
  ],
  [
    "w-basement-dropkick",
    {
      family: "kick",
      requires: { attacker: ["standing", "running"], defender: ["kneeling", "grounded"] },
      result: { attacker: "grounded", defender: "grounded", relation: "close_range" },
      tags: ["running", "ground"],
    },
  ],
  [
    "w-shotgun-dropkick",
    {
      family: "kick",
      requires: { attacker: ["standing", "running"], defender: ["standing", "corner"], relation: ["distance", "close_range"] },
      result: { attacker: "grounded", defender: "grounded", relation: "close_range" },
      tags: ["running", "corner", "knockdown"],
    },
  ],

  // --- knees ---------------------------------------------------------------
  ["w-knee-lift", { family: "knee", requires: { attacker: ["standing"], defender: ["standing"], relation: ["close_range", "clinch"] }, result: KEEP_STANDING, tags: ["clinch", "light"] }],
  ["w-running-knee-strike", { family: "knee", requires: { attacker: ["standing", "running"], defender: ["standing", "kneeling"], relation: ["distance", "close_range"] }, result: KNOCKDOWN, tags: ["running", "knockdown"] }],
  ["w-bicycle-knee-strike", { family: "knee", requires: RUNNING, result: KNOCKDOWN, tags: ["running", "heavy", "knockdown"] }],
  ["w-jumping-knee-strike", { family: "knee", requires: { attacker: ["standing", "running"], defender: ["standing"], relation: ["distance", "close_range"] }, result: KNOCKDOWN, tags: ["airborne", "knockdown"] }],
  [
    "w-shining-wizard",
    {
      family: "knee",
      requires: { attacker: ["standing", "running"], defender: ["kneeling"] },
      result: { attacker: "standing", defender: "grounded", relation: "close_range" },
      tags: ["running", "knockdown"],
    },
  ],

  // --- stomps on a downed opponent ----------------------------------------
  [
    "w-stomp",
    {
      family: "ground_attack",
      requires: { attacker: ["standing"], defender: ["grounded", "kneeling"] },
      result: { attacker: "standing", defender: "grounded", relation: "close_range" },
      tags: ["ground", "light"],
    },
  ],
  [
    "w-double-foot-stomp",
    {
      family: "ground_attack",
      requires: { attacker: ["standing", "airborne"], defender: ["grounded"] },
      result: { attacker: "standing", defender: "grounded", relation: "close_range" },
      tags: ["ground", "heavy"],
    },
  ],
];

/**
 * Names that read as the same technique as an already migrated move. They are
 * recorded as metadata only — no second MoveDefinition is created for them, so
 * one video window never gets several names ("fake variety").
 */
export const MOVE_ALIASES: Record<string, string[]> = {
  // Phase 2: every migrated strike/kick plays its own reel window, so there is
  // no alias to record yet. Add entries here instead of duplicating footage.
};

const MIGRATED: Array<[sceneId: string, spec: Spec]> = [...SAMPLE, ...STRIKES];


/** id → compound description, only for the scenes migrated so far. */
export const STATE_AWARE_MOVES: Map<string, MoveDefinition> = new Map(
  MIGRATED.flatMap(([id, spec]) => {
    const scene = BY_ID.get(id);
    return scene ? ([[id, defineMove(scene, spec)]] as Array<[string, MoveDefinition]>) : [];
  }),
);

/** Scenes backing the migrated moves — used as the strict global fallback pool. */
export const STATE_AWARE_SCENES: Move[] = [...STATE_AWARE_MOVES.keys()].flatMap((id) => {
  const scene = BY_ID.get(id);
  return scene ? [scene] : [];
});

/**
 * Dedicated safe reset scenes. Used as the last legal resort in strict mode
 * before the engine idles: they bring the fight back to a neutral stance.
 */
export const STATE_AWARE_RECOVERY_SCENES: Move[] = [...STATE_AWARE_MOVES.entries()].flatMap(
  ([id, definition]) => {
    if (definition.family !== "recovery") return [];
    const scene = BY_ID.get(id);
    return scene ? [scene] : [];
  },
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

/* ------------------------------------------------------------------ *
 * Fine-grained anti-repetition on the *move family* (punch / elbow / chop /
 * kick / knee …). The scene-level guard in `scenes.ts` only knows "punch" vs
 * "kick", so four different elbows in a row still slipped through. This is the
 * same rule (streak + share of the recent window), applied to the compound
 * families — no second scheduler: the arena runs it inside the existing draw.
 * ------------------------------------------------------------------ */

const recentMoveFamilies: MoveFamily[] = [];

/** The compound family of a scene, when it is migrated. */
export function moveFamilyOf(item: { id: string }): MoveFamily | undefined {
  return STATE_AWARE_MOVES.get(item.id)?.family;
}

/** True when playing this scene now would over-use its family. */
export function moveFamilyBlocked(item: { id: string }, maxStreak = 2, window = 6): boolean {
  if (maxStreak <= 0) return false;
  const family = moveFamilyOf(item);
  if (!family) return false;
  let streak = 0;
  for (let i = recentMoveFamilies.length - 1; i >= 0 && recentMoveFamilies[i] === family; i--) {
    streak++;
  }
  if (streak >= maxStreak) return true;
  const slice = recentMoveFamilies.slice(-window);
  const share = slice.filter((f) => f === family).length;
  return slice.length >= window && share > Math.ceil(window / 2);
}

/** Record the family that was just played. */
export function noteMoveFamily(item: { id: string }) {
  const family = moveFamilyOf(item);
  if (!family) return;
  recentMoveFamilies.push(family);
  if (recentMoveFamilies.length > 12) recentMoveFamilies.shift();
}

/** Family of the last state-aware pick, for the debug panel. */
export function currentMoveFamily(): MoveFamily | "—" {
  return recentMoveFamilies[recentMoveFamilies.length - 1] ?? "—";
}

/** Test hook: forget the recent families. */
export function resetMoveFamilyTrace() {
  recentMoveFamilies.length = 0;
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
