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

/* ------------------------------------------------------------------ *
 * Phase 3 — GRAPPLES + THROWS + SLAMS + SUPLEXES (incl. backbreakers,
 * neckbreakers and the DDT family).
 *
 * Same rule as phase 2: every id below is a scene that already exists in the
 * catalog, reused with its own reel window. Nothing is invented. Power moves
 * are never legal from neutral distance — the fight has to pass through a
 * close-range / clinch beat first, which is exactly what the tie-ups and
 * control holds produce.
 * ------------------------------------------------------------------ */

/** Tie-ups / control holds: reachable from close range, they build the clinch. */
const TIE_UP: Spec["requires"] = {
  attacker: ["standing"],
  defender: ["standing"],
  relation: ["close_range", "clinch"],
};

/** Behind-the-back control (waist lock, hammerlock, rear chokes). */
const BEHIND_OR_CLINCH: Spec["requires"] = {
  attacker: ["standing"],
  defender: ["standing"],
  relation: ["close_range", "clinch", "attacker_behind"],
};

/** Power move setup: strictly from the clinch, never from distance. */
const FROM_CLINCH: Spec["requires"] = {
  attacker: ["standing"],
  defender: ["standing"],
  relation: ["clinch"],
};

/** Rear waist-lock setup (German / belly-to-back family). */
const FROM_BEHIND: Spec["requires"] = {
  attacker: ["standing"],
  defender: ["standing"],
  relation: ["clinch", "attacker_behind"],
};

/** Control hold: both men stay up, the clinch is established. */
const CONTROL: Spec["result"] = {
  attacker: "standing",
  defender: "standing",
  relation: "clinch",
};

/** Classic slam: defender down, attacker on his feet. */
const DROP_DEFENDER: Spec["result"] = {
  attacker: "standing",
  defender: "grounded",
  relation: "close_range",
};

/** The impact takes both men to the mat. */
const BOTH_DOWN: Spec["result"] = {
  attacker: "grounded",
  defender: "grounded",
  relation: "close_range",
};

/** The attacker lands on a knee over the downed opponent. */
const ATTACKER_KNEELING: Spec["result"] = {
  attacker: "kneeling",
  defender: "grounded",
  relation: "close_range",
};

const GRAPPLES: Array<[sceneId: string, spec: Spec]> = [
  // --- grapple / control: no knockdown, the clinch is the point -------------
  ["w-collar-and-elbow-tie-up", { family: "clinch", requires: TIE_UP, result: CONTROL, tags: ["tie-up", "setup"] }],
  ["w-side-headlock", { family: "clinch", requires: TIE_UP, result: CONTROL, tags: ["hold", "setup"] }],
  ["w-front-facelock", { family: "clinch", requires: TIE_UP, result: CONTROL, tags: ["hold", "setup"] }],
  ["w-bear-hug", { family: "clinch", requires: TIE_UP, result: CONTROL, tags: ["hold", "power"] }],
  ["w-wrist-lock", { family: "grapple", requires: TIE_UP, result: CONTROL, tags: ["hold", "setup"] }],
  ["w-half-nelson", { family: "grapple", requires: BEHIND_OR_CLINCH, result: CONTROL, tags: ["hold"] }],
  ["w-full-nelson", { family: "grapple", requires: BEHIND_OR_CLINCH, result: CONTROL, tags: ["hold"] }],
  [
    "w-waist-lock",
    {
      family: "grapple",
      requires: BEHIND_OR_CLINCH,
      result: { attacker: "standing", defender: "standing", relation: "attacker_behind" },
      tags: ["hold", "setup"],
    },
  ],
  [
    "w-hammerlock",
    {
      family: "grapple",
      requires: BEHIND_OR_CLINCH,
      result: { attacker: "standing", defender: "standing", relation: "attacker_behind" },
      tags: ["hold", "setup"],
    },
  ],
  [
    "w-cobra-clutch",
    {
      family: "grapple",
      requires: BEHIND_OR_CLINCH,
      result: { attacker: "standing", defender: "standing", relation: "attacker_behind" },
      tags: ["hold", "choke"],
    },
  ],

  // --- takedowns / basic throws --------------------------------------------
  ["w-arm-drag", { family: "throw", requires: TIE_UP, result: DROP_DEFENDER, tags: ["takedown", "light"] }],
  ["w-hip-toss", { family: "throw", requires: FROM_CLINCH, result: DROP_DEFENDER, tags: ["takedown"] }],
  ["w-snapmare", { family: "throw", requires: FROM_CLINCH, result: { attacker: "standing", defender: "kneeling", relation: "close_range" }, tags: ["takedown", "light"] }],
  ["w-biel-throw", { family: "throw", requires: FROM_CLINCH, result: DROP_DEFENDER, tags: ["takedown", "power"] }],
  ["w-monkey-flip", { family: "throw", requires: FROM_CLINCH, result: BOTH_DOWN, tags: ["takedown", "lucha"] }],
  ["w-headscissors-takedown", { family: "throw", requires: FROM_CLINCH, result: BOTH_DOWN, tags: ["takedown", "lucha"] }],
  ["w-hurricanrana", { family: "throw", requires: FROM_CLINCH, result: BOTH_DOWN, tags: ["lucha", "knockdown"] }],
  ["w-frankensteiner", { family: "throw", requires: FROM_CLINCH, result: BOTH_DOWN, tags: ["lucha", "knockdown"] }],

  // --- slams ---------------------------------------------------------------
  ["w-body-slam", { family: "slam", requires: FROM_CLINCH, result: DROP_DEFENDER, tags: ["power"] }],
  ["w-scoop-slam", { family: "slam", requires: FROM_CLINCH, result: DROP_DEFENDER, tags: ["power"] }],
  ["w-scoop-powerslam", { family: "slam", requires: FROM_CLINCH, result: ATTACKER_KNEELING, tags: ["power", "heavy"] }],
  ["w-powerslam", { family: "slam", requires: FROM_CLINCH, result: BOTH_DOWN, tags: ["power", "heavy"] }],
  [
    "w-running-powerslam",
    {
      family: "slam",
      // The only slam allowed to start from a charge — the runner catches him.
      requires: { attacker: ["standing", "running"], defender: ["standing"], relation: ["close_range", "clinch"] },
      result: BOTH_DOWN,
      tags: ["running", "power", "heavy"],
    },
  ],
  ["w-side-slam", { family: "slam", requires: FROM_CLINCH, result: DROP_DEFENDER, tags: ["power"] }],
  ["w-sidewalk-slam", { family: "slam", requires: FROM_CLINCH, result: DROP_DEFENDER, tags: ["power"] }],
  ["w-spinebuster", { family: "slam", requires: FROM_CLINCH, result: ATTACKER_KNEELING, tags: ["power", "heavy"] }],
  ["w-double-a-spinebuster", { family: "slam", requires: FROM_CLINCH, result: ATTACKER_KNEELING, tags: ["power", "heavy"] }],
  ["w-military-press-slam", { family: "slam", requires: FROM_CLINCH, result: DROP_DEFENDER, tags: ["power", "press"] }],
  ["w-gorilla-press-slam", { family: "slam", requires: FROM_CLINCH, result: DROP_DEFENDER, tags: ["power", "press"] }],
  ["w-chokeslam", { family: "slam", requires: FROM_CLINCH, result: DROP_DEFENDER, tags: ["power", "finisher"] }],
  ["w-uranage", { family: "slam", requires: FROM_CLINCH, result: DROP_DEFENDER, tags: ["power"] }],
  ["w-rock-bottom", { family: "slam", requires: FROM_CLINCH, result: DROP_DEFENDER, tags: ["power", "finisher"] }],
  ["w-samoan-drop", { family: "slam", requires: FROM_CLINCH, result: BOTH_DOWN, tags: ["power"] }],
  ["w-fireman-s-carry-slam", { family: "slam", requires: FROM_CLINCH, result: DROP_DEFENDER, tags: ["power", "carry"] }],
  ["w-death-valley-driver", { family: "slam", requires: FROM_CLINCH, result: BOTH_DOWN, tags: ["power", "finisher"] }],
  ["w-olympic-slam", { family: "slam", requires: FROM_CLINCH, result: DROP_DEFENDER, tags: ["power", "finisher"] }],
  ["w-angle-slam", { family: "slam", requires: FROM_CLINCH, result: DROP_DEFENDER, tags: ["power", "finisher"] }],
  ["w-cobra-clutch-slam", { family: "slam", requires: FROM_BEHIND, result: DROP_DEFENDER, tags: ["power"] }],
  ["w-full-nelson-slam", { family: "slam", requires: FROM_BEHIND, result: DROP_DEFENDER, tags: ["power"] }],

  // --- backbreakers / neckbreakers -----------------------------------------
  ["w-argentine-backbreaker", { family: "slam", requires: FROM_CLINCH, result: DROP_DEFENDER, tags: ["power", "rack"] }],
  ["w-neckbreaker", { family: "slam", requires: FROM_CLINCH, result: BOTH_DOWN, tags: ["neck"] }],
  ["w-swinging-neckbreaker", { family: "slam", requires: FROM_CLINCH, result: BOTH_DOWN, tags: ["neck"] }],
  ["w-snap-neckbreaker", { family: "slam", requires: FROM_BEHIND, result: BOTH_DOWN, tags: ["neck"] }],
  [
    "w-hangman-s-neckbreaker",
    {
      family: "slam",
      requires: { attacker: ["standing"], defender: ["standing", "ropes"], relation: ["close_range", "clinch"] },
      result: DROP_DEFENDER,
      tags: ["neck", "ropes"],
    },
  ],
  ["w-reverse-neckbreaker", { family: "slam", requires: FROM_BEHIND, result: BOTH_DOWN, tags: ["neck"] }],

  // --- DDT family: front facelock spots, usually both men end on the mat ----
  ["w-ddt", { family: "slam", requires: FROM_CLINCH, result: BOTH_DOWN, tags: ["ddt"] }],
  ["w-snap-ddt", { family: "slam", requires: FROM_CLINCH, result: BOTH_DOWN, tags: ["ddt"] }],
  ["w-jumping-ddt", { family: "slam", requires: FROM_CLINCH, result: BOTH_DOWN, tags: ["ddt", "airborne"] }],
  ["w-double-arm-ddt", { family: "slam", requires: FROM_CLINCH, result: ATTACKER_KNEELING, tags: ["ddt"] }],
  ["w-hammerlock-ddt", { family: "slam", requires: FROM_BEHIND, result: ATTACKER_KNEELING, tags: ["ddt"] }],
  ["w-reverse-ddt", { family: "slam", requires: FROM_BEHIND, result: BOTH_DOWN, tags: ["ddt"] }],
  ["w-even-flow-ddt", { family: "slam", requires: FROM_CLINCH, result: BOTH_DOWN, tags: ["ddt", "finisher"] }],

  // --- suplex family --------------------------------------------------------
  ["w-suplex", { family: "suplex", requires: FROM_CLINCH, result: BOTH_DOWN, tags: ["suplex"] }],
  ["w-belly-to-belly-suplex", { family: "suplex", requires: FROM_CLINCH, result: BOTH_DOWN, tags: ["suplex"] }],
  ["w-overhead-belly-to-belly-suplex", { family: "suplex", requires: FROM_CLINCH, result: BOTH_DOWN, tags: ["suplex", "throw"] }],
  ["w-belly-to-back-suplex", { family: "suplex", requires: FROM_BEHIND, result: BOTH_DOWN, tags: ["suplex"] }],
  ["w-german-suplex", { family: "suplex", requires: FROM_BEHIND, result: BOTH_DOWN, tags: ["suplex", "rear"] }],
  ["w-release-german-suplex", { family: "suplex", requires: FROM_BEHIND, result: BOTH_DOWN, tags: ["suplex", "rear"] }],
  ["w-exploder-suplex", { family: "suplex", requires: FROM_CLINCH, result: BOTH_DOWN, tags: ["suplex"] }],
  ["w-saito-suplex", { family: "suplex", requires: FROM_BEHIND, result: BOTH_DOWN, tags: ["suplex"] }],
  ["w-half-nelson-suplex", { family: "suplex", requires: FROM_BEHIND, result: BOTH_DOWN, tags: ["suplex"] }],
  ["w-dragon-suplex", { family: "suplex", requires: FROM_BEHIND, result: BOTH_DOWN, tags: ["suplex", "rear"] }],
  ["w-tiger-suplex", { family: "suplex", requires: FROM_BEHIND, result: ATTACKER_KNEELING, tags: ["suplex", "bridge"] }],
  ["w-butterfly-suplex", { family: "suplex", requires: FROM_CLINCH, result: BOTH_DOWN, tags: ["suplex"] }],
  ["w-gutwrench-suplex", { family: "suplex", requires: FROM_CLINCH, result: BOTH_DOWN, tags: ["suplex"] }],
  ["w-deadlift-suplex", { family: "suplex", requires: FROM_BEHIND, result: BOTH_DOWN, tags: ["suplex", "power"] }],
  [
    "w-northern-lights-suplex",
    {
      family: "suplex",
      requires: FROM_CLINCH,
      result: { attacker: "kneeling", defender: "grounded", relation: "pin" },
      tags: ["suplex", "bridge", "pin"],
    },
  ],
  [
    "w-fisherman-suplex",
    {
      family: "suplex",
      requires: FROM_CLINCH,
      result: { attacker: "kneeling", defender: "grounded", relation: "pin" },
      tags: ["suplex", "bridge", "pin"],
    },
  ],
  ["w-brainbuster", { family: "suplex", requires: FROM_CLINCH, result: ATTACKER_KNEELING, tags: ["suplex", "heavy"] }],
  ["w-falcon-arrow", { family: "suplex", requires: FROM_CLINCH, result: ATTACKER_KNEELING, tags: ["suplex", "heavy"] }],
  ["w-jackhammer", { family: "suplex", requires: FROM_CLINCH, result: ATTACKER_KNEELING, tags: ["suplex", "finisher"] }],
  [
    "w-superplex",
    {
      // Not an ordinary clinch spot: both men must already be up in the corner.
      family: "suplex",
      requires: {
        attacker: ["corner", "top_rope"],
        defender: ["corner", "top_rope"],
        relation: ["close_range", "clinch"],
      },
      result: BOTH_DOWN,
      tags: ["suplex", "high-risk", "corner"],
    },
  ],
];

/**
 * Names that read as the same technique as an already migrated move. They are
 * recorded as metadata only — no second MoveDefinition is created for them, so
 * one video window never gets several names ("fake variety").
 *
 * Phase 3: the reel builder handed these ids the exact same src + start + end
 * as the canonical move on the left, so they are aliases, not extra visual
 * sequences. They stay unmigrated and can never be selected in strict mode.
 */
export const MOVE_ALIASES: Record<string, string[]> = {
  "w-snapmare": ["w-alabama-slam", "w-pendulum-backbreaker", "w-implant-ddt", "w-snap-suplex"],
  "w-biel-throw": [
    "w-fallaway-slam",
    "w-tilt-a-whirl-backbreaker",
    "w-tornado-ddt",
    "w-delayed-vertical-suplex",
  ],
  "w-double-a-spinebuster": ["w-backbreaker", "w-vertical-suplex"],
  "w-fireman-s-carry-slam": ["w-dragon-suplex"],
};

/** Every alias id, i.e. a name that shares footage with a canonical move. */
export const ALIAS_IDS: Set<string> = new Set(Object.values(MOVE_ALIASES).flat());

const MIGRATED: Array<[sceneId: string, spec: Spec]> = [...SAMPLE, ...STRIKES, ...GRAPPLES].filter(
  ([id]) => !ALIAS_IDS.has(id),
);



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
