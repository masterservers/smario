/**
 * First slice of the state-aware catalog.
 *
 * These are NOT new moves: each entry describes a scene that already exists in
 * `scenes.ts` (same reel window, same rate, same impact) in the vocabulary of
 * `fightState.ts`. Everything not listed here stays unconstrained and keeps
 * playing exactly as before, so this is purely additive.
 */

import { FOLLOW_UPS, MOVES, type Move } from "@/lib/scenes";
import { WRESTLING_FOLLOW_UPS, WRESTLING_MOVES } from "@/lib/wrestlingMoves";
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
      startState: "neutral_standing",
      endState: "neutral_standing",
      allowedFromStates: ["neutral_standing", "close_range"],
      followUpStates: ["neutral_standing", "close_range", "clinch"],
      tags: ["boxing", "light"],
    },
  ],
  [
    "clothesline",
    {
      family: "running_strike",
      startState: "standing_distance",
      endState: "opponent_grounded",
      // neutral_standing is treated as distance so the engine can start a match.
      allowedFromStates: ["standing_distance", "neutral_standing"],
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
      allowedFromStates: ["close_range", "clinch"],
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
      allowedFromStates: ["clinch", "close_range"],
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
      allowedFromStates: ["clinch", "close_range"],
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
      allowedFromStates: ["standing_distance", "neutral_standing"],
      followUpStates: ["opponent_grounded", "pin_position"],
      tags: ["knockdown"],
    },
  ],
  [
    "top-rope-splash",
    {
      family: "aerial",
      startState: "top_rope",
      endState: "opponent_grounded",
      // Only from the top rope, and only onto a downed opponent.
      allowedFromStates: ["top_rope", "opponent_grounded"],
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
      allowedFromStates: ["opponent_grounded"],
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
      allowedFromStates: ["close_range", "opponent_grounded"],
      followUpStates: ["pin_position", "recovery"],
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
        "both_grounded",
        "pin_position",
        "submission_position",
        "recovery",
      ],
      followUpStates: ["neutral_standing", "standing_distance"],
      tags: ["reset"],
    },
  ],
];

/**
 * Automatic migration of the wrestling catalog.
 *
 * Every remaining `w-*` scene is classified from its name into a family and a
 * pair of positions, so the scheduler can constrain it exactly like the hand
 * written sample above. Explicit entries in SAMPLE always win.
 */
function classify(label: string): Spec {
  const l = label.toUpperCase();

  // Pins — only on a downed opponent (or as a quick roll-up from close range).
  if (/PIN|CRADLE|PACKAGE|BACKSLIDE|SUNSET FLIP|VICTORY ROLL|ROLL-UP|LA MAGISTRAL|CRUCIFIX PIN|SCHOOLBOY/.test(l)) {
    return {
      family: "pin",
      startState: "opponent_grounded",
      endState: "pin_position",
      allowedFromStates: ["opponent_grounded", "both_grounded", "close_range"],
      followUpStates: ["pin_position", "recovery"],
      tags: ["pin"],
    };
  }

  // Submissions / holds.
  if (
    /SHARPSHOOTER|LEGLOCK|CRAB|CLOVERLEAF|WALLS OF|ANKLE LOCK|HEEL HOOK|KNEE BAR|ARMBAR|KIMURA|HAMMERLOCK|WRIST LOCK|CHICKENWING|CROSSFACE|STF|STS|SLEEPER|CHOKE|COBRA CLUTCH|MILLION DOLLAR DREAM|BEAR HUG|NELSON$|FULL NELSON|HALF NELSON|ABDOMINAL STRETCH|OCTOPUS|CAMEL CLUTCH|CLAW|HEADLOCK|FACELOCK|WAIST LOCK|TIE-UP|TEST OF STRENGTH/.test(
      l,
    )
  ) {
    return {
      family: "submission",
      startState: "opponent_grounded",
      endState: "submission_position",
      allowedFromStates: ["opponent_grounded", "both_grounded", "clinch", "close_range"],
      followUpStates: ["submission_position", "opponent_grounded", "recovery"],
      tags: ["ground"],
    };
  }

  // Mat attacks: only make sense on someone already down.
  if (/STOMP|LEG DROP|ELBOW DROP|FIST DROP|KNEE DROP|CURB STOMP/.test(l)) {
    return {
      family: "ground_attack",
      startState: "opponent_grounded",
      endState: "opponent_grounded",
      allowedFromStates: ["opponent_grounded", "both_grounded"],
      followUpStates: ["opponent_grounded", "pin_position", "submission_position"],
      tags: ["mat"],
    };
  }

  // Aerials and rope spots.
  if (
    /DIVING|SPRINGBOARD|MISSILE|FLYING|SPLASH|MOONSAULT|SENTON|SWANTON|PLANCHA|TOPE|SUICIDE DIVE|CROSSBODY|PRESS$|SHOOTING STAR|450|SUPERPLEX|COUP DE GRACE|PHENOMENAL FOREARM|BUCKSHOT|DOOMSDAY/.test(
      l,
    )
  ) {
    return {
      family: "aerial",
      startState: "top_rope",
      endState: "opponent_grounded",
      allowedFromStates: ["top_rope", "standing_distance", "opponent_grounded", "ropes"],
      followUpStates: ["opponent_grounded", "pin_position"],
      tags: ["high-risk"],
    };
  }

  // Corner spots.
  if (/CORNER|BUCKLE/.test(l)) {
    return {
      family: "corner",
      startState: "corner",
      endState: "opponent_grounded",
      allowedFromStates: ["corner", "standing_distance", "close_range", "neutral_standing"],
      followUpStates: ["opponent_grounded", "close_range", "corner"],
      tags: ["corner"],
    };
  }

  // Running attacks from distance.
  if (/RUNNING|SPEAR|GORE|CLOTHESLINE|LARIAT|SHOULDER BLOCK|DROPKICK|BIG BOOT|BICYCLE KICK/.test(l)) {
    return {
      family: "running_strike",
      startState: "standing_distance",
      endState: "opponent_grounded",
      allowedFromStates: ["standing_distance", "neutral_standing"],
      followUpStates: ["opponent_grounded", "pin_position"],
      tags: ["running", "knockdown"],
    };
  }

  // Suplexes, drivers, powerbombs, slams, DDTs — all need a grip first.
  if (
    /SUPLEX|DRIVER|POWERBOMB|PILEDRIVER|SLAM|BOMB|DDT|BRAINBUSTER|BUSTER|BREAKER|CUTTER|STUNNER|RKO|PEDIGREE|CLASH|DESTROYER|ANGEL|GTS|BURNING HAMMER|F-5|ATTITUDE ADJUSTMENT|TWIST OF FATE|SISTER ABIGAIL|END OF DAYS|CROSS RHODES|FALCON ARROW|JACKHAMMER|HURRICANRANA|FRANKENSTEINER|HEADSCISSORS|ARM DRAG|HIP TOSS|MONKEY FLIP|SNAPMARE|BIEL|THROW|FLATLINER|COMPLETE SHOT|ZIG ZAG|SKULL CRUSHING|3D|SHATTER MACHINE|MAGIC KILLER|HART ATTACK|ELECTRIC CHAIR|X-FACTOR|VERTEBREAKER|CHOKESLAM|URANAGE|ROCK BOTTOM|BOOK END/.test(
      l,
    )
  ) {
    return {
      family: "slam",
      startState: "clinch",
      endState: "opponent_grounded",
      allowedFromStates: ["clinch", "close_range"],
      followUpStates: ["opponent_grounded", "pin_position", "submission_position"],
      tags: ["power"],
    };
  }

  // Kicks and knees at range.
  if (/KICK|KNEE|ENZUIGIRI|WIZARD|KINSHASA|SWEET CHIN MUSIC/.test(l)) {
    return {
      family: "kick",
      startState: "standing_distance",
      endState: "close_range",
      allowedFromStates: ["standing_distance", "neutral_standing", "close_range"],
      followUpStates: ["close_range", "clinch", "standing_distance"],
      tags: ["strike"],
    };
  }

  // Everything else reads as a standing strike.
  return {
    family: "punch",
    startState: "close_range",
    endState: "close_range",
    allowedFromStates: ["neutral_standing", "close_range", "standing_distance", "clinch"],
    followUpStates: ["close_range", "clinch", "neutral_standing"],
    tags: ["strike"],
  };
}

/** id → state description for every migrated scene. */
export const STATE_AWARE_MOVES: Map<string, MoveDefinition> = new Map(
  SAMPLE.flatMap(([id, spec]) => {
    const scene = BY_ID.get(id);
    return scene ? ([[id, defineMove(scene, spec)]] as Array<[string, MoveDefinition]>) : [];
  }),
);

// Auto-classified wrestling catalog (explicit SAMPLE entries are kept as-is).
for (const scene of [...WRESTLING_MOVES, ...WRESTLING_FOLLOW_UPS]) {
  if (STATE_AWARE_MOVES.has(scene.id)) continue;
  STATE_AWARE_MOVES.set(scene.id, defineMove(scene, classify(scene.label)));
}

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
