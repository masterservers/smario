/**
 * Production manifest for the FIRST real combat footage pack.
 *
 * Nothing in this file is playable. It describes footage the project still has
 * to obtain, so that generation, review and registration follow one shared
 * contract. A planned asset only becomes runtime footage when its status is
 * "registered" AND a real CombatClip has been added to the registry by hand.
 *
 *   planned  → generated → review → approved → registered
 *                                └→ rejected
 *
 * The arena never reads this module.
 */

import type { CombatClipRole } from "@/lib/combatClips";
import type { CombatLocation, CombatState } from "@/lib/combatState";
import type { HitKind } from "@/lib/hitConfig";
import type { SceneFamily } from "@/lib/scenes";

export type PlannedAssetStatus =
  | "planned"
  | "generated"
  | "review"
  | "approved"
  | "registered"
  | "rejected";

export type ProductionMode = "dedicated-clip" | "expanded-reel" | "either";

export type ProductionBatch =
  | "batch-1-core-standup"
  | "batch-2-power"
  | "batch-3-aerial-ground"
  | "batch-4-continuity";

export type PlannedCombatAsset = {
  id: string;
  /** Path the finished file must land on (nothing is created yet). */
  filename: string;
  role: CombatClipRole;
  sourceType: "dedicated-clip" | "expanded-reel";
  /** Recommended production route; sourceType is the fallback decision. */
  preferredProductionMode: ProductionMode;

  family: SceneFamily;
  kind: HitKind;
  tier: 1 | 2 | 3 | 4 | 5;

  /** Real scene ids from src/lib/scenes.ts this footage may represent. */
  mappedMoveIds: string[];

  attackerStartState: CombatState;
  attackerEndState: CombatState;
  defenderStartState: CombatState;
  defenderEndState: CombatState;

  locationStart: CombatLocation;
  locationEnd: CombatLocation;

  targetDurationSeconds: [number, number];
  impactTargetSeconds?: number;

  requiresGroundedOpponent?: boolean;
  requiresCorner?: boolean;
  requiresRopes?: boolean;

  /** 1–10, how different this looks from everything else in the pack. */
  diversityScore: number;
  priority: "P0" | "P1" | "P2";
  batch: ProductionBatch;
  status: PlannedAssetStatus;
  notes: string[];
};

/**
 * Camera / continuity contract every single clip in the pack must satisfy.
 * Written once here instead of repeated in 36 note arrays.
 */
export const ASSET_CONTINUITY_RULES = [
  "Same ring, same ropes, same turnbuckle colours, same crowd and lighting as arena-wide.webm.",
  "Same two fighters, same costumes, same hair, no wardrobe or identity drift between clips.",
  "Trump is the taller fighter; Putin stays ~90% of his height in every frame.",
  "Televised wrestling WIDE shot: both fighters fully visible, head to feet, ring geometry readable.",
  "No face close-ups, no waist-up framing, no cinematic angle changes mid-clip.",
  "One fixed camera direction (hard camera side); no left/right mirroring between clips.",
  "Same aspect ratio and resolution as the existing reels; no letterboxing.",
  "Clip starts on the declared start pose and ends holding the declared end pose for ~4 frames.",
  "One readable impact per attack clip, with a measurable impact timestamp.",
] as const;

/** Per-role duration envelopes used when authoring targetDurationSeconds. */
export const DURATION_GUIDELINES: Record<string, [number, number]> = {
  strike: [1.2, 2.2],
  kick: [1.4, 2.5],
  throw: [2.5, 4.5],
  aerial: [2.5, 4.5],
  ground: [1.8, 3.2],
  transition: [1.0, 2.5],
  reaction: [0.8, 2.0],
  recovery: [1.5, 3.0],
};

/** Reasons a delivered animation must be rejected during review. */
export const ASSET_REJECTION_CRITERIA = [
  "wrong fighter proportions",
  "identity inconsistency between clips",
  "clothing or costume change",
  "different ring / lighting / crowd",
  "camera incompatible with the existing match footage",
  "action unclear or ambiguous",
  "impact visually weak or missing",
  "start pose cannot be entered cleanly from the declared state",
  "end pose creates an impossible next state",
  "major encoding artifacts",
  "obviously broken motion (foot sliding, limb snapping, teleporting)",
] as const;

/** Structured checklist replacing manual checkbox UI. */
export const PRODUCTION_CHECKLIST = [
  "footage generated/imported",
  "visual quality checked",
  "correct fighters",
  "correct costumes",
  "correct ring",
  "correct camera",
  "start pose usable",
  "end pose usable",
  "impact timestamp measured",
  "encoded to web format (webm/vp9)",
  "registered as CombatClip",
  "preview tested",
  "approved",
] as const;

/** Which checklist steps a given status implies are done. */
export function checklistProgress(status: PlannedAssetStatus): {
  done: number;
  total: number;
  next: string | null;
} {
  const total = PRODUCTION_CHECKLIST.length;
  const doneByStatus: Record<PlannedAssetStatus, number> = {
    planned: 0,
    generated: 1,
    review: 2,
    approved: 9,
    registered: total,
    rejected: 0,
  };
  const done = doneByStatus[status];
  return { done, total, next: done >= total ? null : (PRODUCTION_CHECKLIST[done] ?? null) };
}

// ---------------------------------------------------------------------------
// Pack #1 — 36 planned assets
// ---------------------------------------------------------------------------

const A = (asset: PlannedCombatAsset): PlannedCombatAsset => asset;

export const PLANNED_COMBAT_ASSETS: PlannedCombatAsset[] = [
  // ---------------- Pack A — strikes & kicks (8) ----------------
  A({
    id: "strike-boxing-combo-01",
    filename: "/combat/strikes/strike-boxing-combo-01.webm",
    role: "attack",
    sourceType: "expanded-reel",
    preferredProductionMode: "expanded-reel",
    family: "punch",
    kind: "punch",
    tier: 2,
    mappedMoveIds: ["combo-a", "jab-a", "jab-b", "cross", "hook-a", "body-shot"],
    attackerStartState: "close-standing",
    attackerEndState: "close-standing",
    defenderStartState: "close-standing",
    defenderEndState: "staggered",
    locationStart: "center",
    locationEnd: "center",
    targetDurationSeconds: [1.6, 2.2],
    impactTargetSeconds: 1.3,
    diversityScore: 6,
    priority: "P0",
    batch: "batch-1-core-standup",
    status: "planned",
    notes: [
      "Three-punch flurry ending on the last landed hook, not on a single jab.",
      "Feet must travel: attacker walks the defender back half a ring width.",
    ],
  }),
  A({
    id: "strike-clothesline-01",
    filename: "/combat/strikes/strike-clothesline-01.webm",
    role: "attack",
    sourceType: "dedicated-clip",
    preferredProductionMode: "dedicated-clip",
    family: "punch",
    kind: "grapple",
    tier: 3,
    mappedMoveIds: ["clothesline", "w-clothesline", "w-running-clothesline"],
    attackerStartState: "neutral-standing",
    attackerEndState: "neutral-standing",
    defenderStartState: "neutral-standing",
    defenderEndState: "grounded-face-up",
    locationStart: "left-side",
    locationEnd: "center",
    targetDurationSeconds: [1.8, 2.4],
    impactTargetSeconds: 1.2,
    diversityScore: 8,
    priority: "P0",
    batch: "batch-1-core-standup",
    status: "planned",
    notes: ["Long run-up across the ring, defender flips over backwards and lands flat."],
  }),
  A({
    id: "strike-running-knee-01",
    filename: "/combat/strikes/strike-running-knee-01.webm",
    role: "attack",
    sourceType: "dedicated-clip",
    preferredProductionMode: "dedicated-clip",
    family: "kick",
    kind: "kick",
    tier: 4,
    mappedMoveIds: ["w-running-knee", "w-knee-strike", "w-jumping-knee"],
    attackerStartState: "neutral-standing",
    attackerEndState: "close-standing",
    defenderStartState: "kneeling",
    defenderEndState: "grounded-face-down",
    locationStart: "right-side",
    locationEnd: "center",
    targetDurationSeconds: [1.6, 2.3],
    impactTargetSeconds: 1.1,
    diversityScore: 8,
    priority: "P0",
    batch: "batch-1-core-standup",
    status: "planned",
    notes: ["Sprint + airborne knee onto a rising opponent; strong vertical spike at impact."],
  }),
  A({
    id: "kick-superkick-01",
    filename: "/combat/kicks/kick-superkick-01.webm",
    role: "attack",
    sourceType: "dedicated-clip",
    preferredProductionMode: "dedicated-clip",
    family: "kick",
    kind: "kick",
    tier: 4,
    mappedMoveIds: ["w-superkick", "w-high-kick"],
    attackerStartState: "close-standing",
    attackerEndState: "neutral-standing",
    defenderStartState: "close-standing",
    defenderEndState: "grounded-face-up",
    locationStart: "center",
    locationEnd: "center",
    targetDurationSeconds: [1.4, 2.0],
    impactTargetSeconds: 0.9,
    diversityScore: 7,
    priority: "P0",
    batch: "batch-1-core-standup",
    status: "planned",
    notes: ["Snap kick with a beat of stillness before it; do not map generic kicks here."],
  }),
  A({
    id: "kick-roundhouse-01",
    filename: "/combat/kicks/kick-roundhouse-01.webm",
    role: "attack",
    sourceType: "expanded-reel",
    preferredProductionMode: "expanded-reel",
    family: "kick",
    kind: "kick",
    tier: 3,
    mappedMoveIds: ["w-roundhouse-kick", "w-spinning-heel-kick", "high-kick"],
    attackerStartState: "close-standing",
    attackerEndState: "close-standing",
    defenderStartState: "close-standing",
    defenderEndState: "staggered",
    locationStart: "center",
    locationEnd: "left-side",
    targetDurationSeconds: [1.5, 2.2],
    impactTargetSeconds: 1.0,
    diversityScore: 6,
    priority: "P1",
    batch: "batch-1-core-standup",
    status: "planned",
    notes: ["Full 360 rotation silhouette — must read as rotation, not as a straight kick."],
  }),
  A({
    id: "kick-dropkick-01",
    filename: "/combat/kicks/kick-dropkick-01.webm",
    role: "attack",
    sourceType: "dedicated-clip",
    preferredProductionMode: "dedicated-clip",
    family: "kick",
    kind: "kick",
    tier: 3,
    mappedMoveIds: ["dropkick", "w-dropkick", "w-shotgun-dropkick"],
    attackerStartState: "neutral-standing",
    attackerEndState: "grounded-face-up",
    defenderStartState: "neutral-standing",
    defenderEndState: "grounded-face-down",
    locationStart: "center",
    locationEnd: "mat",
    targetDurationSeconds: [1.6, 2.3],
    impactTargetSeconds: 1.0,
    diversityScore: 9,
    priority: "P0",
    batch: "batch-1-core-standup",
    status: "planned",
    notes: ["Both fighters end on the mat — rare silhouette, pairs with recovery-stand-up-01."],
  }),
  A({
    id: "strike-spear-01",
    filename: "/combat/strikes/strike-spear-01.webm",
    role: "attack",
    sourceType: "dedicated-clip",
    preferredProductionMode: "dedicated-clip",
    family: "throw",
    kind: "grapple",
    tier: 5,
    mappedMoveIds: ["w-spear", "w-gore"],
    attackerStartState: "neutral-standing",
    attackerEndState: "kneeling",
    defenderStartState: "neutral-standing",
    defenderEndState: "grounded-face-up",
    locationStart: "right-side",
    locationEnd: "mat",
    targetDurationSeconds: [2.0, 2.8],
    impactTargetSeconds: 1.4,
    diversityScore: 9,
    priority: "P0",
    batch: "batch-2-power",
    status: "planned",
    notes: ["Maximum horizontal travel in the pack; finisher-grade camera shake at impact."],
  }),
  A({
    id: "strike-corner-combo-01",
    filename: "/combat/strikes/strike-corner-combo-01.webm",
    role: "attack",
    sourceType: "expanded-reel",
    preferredProductionMode: "expanded-reel",
    family: "punch",
    kind: "punch",
    tier: 3,
    mappedMoveIds: ["v-corner-combo", "w-corner-clothesline", "w-mounted-punches"],
    attackerStartState: "close-standing",
    attackerEndState: "close-standing",
    defenderStartState: "cornered",
    defenderEndState: "cornered",
    locationStart: "corner-ne",
    locationEnd: "corner-ne",
    targetDurationSeconds: [1.8, 2.4],
    impactTargetSeconds: 1.4,
    requiresCorner: true,
    diversityScore: 7,
    priority: "P1",
    batch: "batch-1-core-standup",
    status: "planned",
    notes: ["Trapped-in-corner framing; turnbuckle visible top-left of frame."],
  }),

  // ---------------- Pack B — throws & slams (10) ----------------
  A({
    id: "throw-body-slam-01",
    filename: "/combat/throws/throw-body-slam-01.webm",
    role: "attack",
    sourceType: "expanded-reel",
    preferredProductionMode: "expanded-reel",
    family: "throw",
    kind: "throw",
    tier: 3,
    mappedMoveIds: ["slam-a", "w-body-slam", "w-scoop-slam"],
    attackerStartState: "clinched",
    attackerEndState: "neutral-standing",
    defenderStartState: "clinched",
    defenderEndState: "grounded-face-up",
    locationStart: "center",
    locationEnd: "mat",
    targetDurationSeconds: [2.6, 3.4],
    impactTargetSeconds: 2.0,
    diversityScore: 6,
    priority: "P0",
    batch: "batch-2-power",
    status: "planned",
    notes: ["Baseline slam: lift to shoulder height, drop flat, attacker stays standing."],
  }),
  A({
    id: "throw-german-suplex-01",
    filename: "/combat/throws/throw-german-suplex-01.webm",
    role: "attack",
    sourceType: "dedicated-clip",
    preferredProductionMode: "dedicated-clip",
    family: "throw",
    kind: "throw",
    tier: 4,
    mappedMoveIds: ["v-german-suplex", "w-german-suplex", "w-release-german-suplex"],
    attackerStartState: "clinched",
    attackerEndState: "kneeling",
    defenderStartState: "clinched",
    defenderEndState: "grounded-face-up",
    locationStart: "center",
    locationEnd: "mat",
    targetDurationSeconds: [2.8, 3.8],
    impactTargetSeconds: 2.2,
    diversityScore: 9,
    priority: "P0",
    batch: "batch-2-power",
    status: "planned",
    notes: ["Backwards arc over the head — the signature rotation nothing else in the pack has."],
  }),
  A({
    id: "throw-belly-to-belly-01",
    filename: "/combat/throws/throw-belly-to-belly-01.webm",
    role: "attack",
    sourceType: "expanded-reel",
    preferredProductionMode: "expanded-reel",
    family: "throw",
    kind: "throw",
    tier: 3,
    mappedMoveIds: ["w-belly-to-belly-suplex", "w-overhead-belly-to-belly"],
    attackerStartState: "clinched",
    attackerEndState: "neutral-standing",
    defenderStartState: "clinched",
    defenderEndState: "grounded-face-up",
    locationStart: "center",
    locationEnd: "left-side",
    targetDurationSeconds: [2.6, 3.4],
    impactTargetSeconds: 2.0,
    diversityScore: 7,
    priority: "P1",
    batch: "batch-2-power",
    status: "planned",
    notes: ["Sideways throw with lateral travel — distinct from the German's backward arc."],
  }),
  A({
    id: "throw-spinebuster-01",
    filename: "/combat/throws/throw-spinebuster-01.webm",
    role: "attack",
    sourceType: "dedicated-clip",
    preferredProductionMode: "dedicated-clip",
    family: "throw",
    kind: "throw",
    tier: 4,
    mappedMoveIds: ["x-spinebuster", "w-spinebuster"],
    attackerStartState: "close-standing",
    attackerEndState: "kneeling",
    defenderStartState: "close-standing",
    defenderEndState: "grounded-face-up",
    locationStart: "center",
    locationEnd: "mat",
    targetDurationSeconds: [2.6, 3.4],
    impactTargetSeconds: 2.1,
    diversityScore: 8,
    priority: "P0",
    batch: "batch-2-power",
    status: "planned",
    notes: ["Catch on the run, spin 180, drive down; attacker finishes low over the opponent."],
  }),
  A({
    id: "throw-powerslam-01",
    filename: "/combat/throws/throw-powerslam-01.webm",
    role: "attack",
    sourceType: "expanded-reel",
    preferredProductionMode: "expanded-reel",
    family: "throw",
    kind: "throw",
    tier: 4,
    mappedMoveIds: ["w-powerslam", "w-running-powerslam", "w-scoop-powerslam"],
    attackerStartState: "neutral-standing",
    attackerEndState: "kneeling",
    defenderStartState: "neutral-standing",
    defenderEndState: "grounded-face-up",
    locationStart: "left-side",
    locationEnd: "mat",
    targetDurationSeconds: [2.8, 3.6],
    impactTargetSeconds: 2.2,
    diversityScore: 7,
    priority: "P1",
    batch: "batch-2-power",
    status: "planned",
    notes: ["Running catch mid-charge; both bodies travel forward before the drop."],
  }),
  A({
    id: "throw-chokeslam-01",
    filename: "/combat/throws/throw-chokeslam-01.webm",
    role: "attack",
    sourceType: "dedicated-clip",
    preferredProductionMode: "dedicated-clip",
    family: "throw",
    kind: "throw",
    tier: 5,
    mappedMoveIds: ["w-chokeslam"],
    attackerStartState: "close-standing",
    attackerEndState: "neutral-standing",
    defenderStartState: "close-standing",
    defenderEndState: "grounded-face-up",
    locationStart: "center",
    locationEnd: "mat",
    targetDurationSeconds: [3.0, 4.0],
    impactTargetSeconds: 2.4,
    diversityScore: 8,
    priority: "P0",
    batch: "batch-2-power",
    status: "planned",
    notes: ["Single-hand lift, hold at the top for ~0.4s, vertical drop. Max lift height."],
  }),
  A({
    id: "throw-powerbomb-01",
    filename: "/combat/throws/throw-powerbomb-01.webm",
    role: "attack",
    sourceType: "dedicated-clip",
    preferredProductionMode: "dedicated-clip",
    family: "throw",
    kind: "throw",
    tier: 5,
    mappedMoveIds: ["powerbomb-a", "w-powerbomb", "w-sit-out-powerbomb"],
    attackerStartState: "clinched",
    attackerEndState: "kneeling",
    defenderStartState: "clinched",
    defenderEndState: "grounded-face-up",
    locationStart: "center",
    locationEnd: "mat",
    targetDurationSeconds: [3.2, 4.2],
    impactTargetSeconds: 2.6,
    diversityScore: 9,
    priority: "P0",
    batch: "batch-2-power",
    status: "planned",
    notes: ["Shoulder lift with the opponent facing the camera; sit-out finish."],
  }),
  A({
    id: "throw-ddt-01",
    filename: "/combat/throws/throw-ddt-01.webm",
    role: "attack",
    sourceType: "dedicated-clip",
    preferredProductionMode: "dedicated-clip",
    family: "throw",
    kind: "throw",
    tier: 4,
    mappedMoveIds: ["w-ddt", "w-snap-ddt"],
    attackerStartState: "clinched",
    attackerEndState: "grounded-face-down",
    defenderStartState: "clinched",
    defenderEndState: "grounded-face-down",
    locationStart: "center",
    locationEnd: "mat",
    targetDurationSeconds: [2.4, 3.2],
    impactTargetSeconds: 1.9,
    diversityScore: 8,
    priority: "P0",
    batch: "batch-2-power",
    status: "planned",
    notes: ["Both fighters end face-down — unique exit pose; short and snappy, no lift."],
  }),
  A({
    id: "throw-firemans-carry-01",
    filename: "/combat/throws/throw-firemans-carry-01.webm",
    role: "attack",
    sourceType: "expanded-reel",
    preferredProductionMode: "expanded-reel",
    family: "throw",
    kind: "throw",
    tier: 4,
    mappedMoveIds: ["w-fireman-carry", "w-fallaway-slam", "w-death-valley-driver"],
    attackerStartState: "clinched",
    attackerEndState: "neutral-standing",
    defenderStartState: "clinched",
    defenderEndState: "grounded-face-up",
    locationStart: "center",
    locationEnd: "right-side",
    targetDurationSeconds: [3.0, 4.0],
    impactTargetSeconds: 2.6,
    diversityScore: 8,
    priority: "P1",
    batch: "batch-2-power",
    status: "planned",
    notes: ["Carry across the shoulders and walk 2-3 steps before the throw — travel sells it."],
  }),
  A({
    id: "throw-finisher-heavy-01",
    filename: "/combat/throws/throw-finisher-heavy-01.webm",
    role: "attack",
    sourceType: "dedicated-clip",
    preferredProductionMode: "dedicated-clip",
    family: "throw",
    kind: "throw",
    tier: 5,
    mappedMoveIds: ["w-piledriver", "w-burning-hammer", "w-jackhammer"],
    attackerStartState: "clinched",
    attackerEndState: "kneeling",
    defenderStartState: "clinched",
    defenderEndState: "ko",
    locationStart: "center",
    locationEnd: "mat",
    targetDurationSeconds: [3.4, 4.5],
    impactTargetSeconds: 2.9,
    diversityScore: 10,
    priority: "P0",
    batch: "batch-2-power",
    status: "planned",
    notes: [
      "Match-ending grade. Reserved for tier-5 gifts and KO moments.",
      "Defender exits in 'ko' pose so the 10-count can start on the last frame.",
    ],
  }),

  // ---------------- Pack C — aerial / rope (6) ----------------
  A({
    id: "aerial-top-rope-splash-01",
    filename: "/combat/aerial/aerial-top-rope-splash-01.webm",
    role: "attack",
    sourceType: "dedicated-clip",
    preferredProductionMode: "dedicated-clip",
    family: "rope",
    kind: "aerial",
    tier: 5,
    mappedMoveIds: ["w-frog-splash", "w-diving-splash", "w-five-star-frog-splash"],
    attackerStartState: "ropes",
    attackerEndState: "grounded-face-down",
    defenderStartState: "grounded-face-up",
    defenderEndState: "grounded-face-up",
    locationStart: "corner-nw",
    locationEnd: "mat",
    targetDurationSeconds: [3.0, 4.0],
    impactTargetSeconds: 2.4,
    requiresGroundedOpponent: true,
    requiresRopes: true,
    diversityScore: 9,
    priority: "P0",
    batch: "batch-3-aerial-ground",
    status: "planned",
    notes: ["Climb is part of the clip; long vertical fall, flat landing."],
  }),
  A({
    id: "aerial-moonsault-01",
    filename: "/combat/aerial/aerial-moonsault-01.webm",
    role: "attack",
    sourceType: "dedicated-clip",
    preferredProductionMode: "dedicated-clip",
    family: "rope",
    kind: "aerial",
    tier: 5,
    mappedMoveIds: ["moonsault", "w-moonsault", "w-standing-moonsault"],
    attackerStartState: "ropes",
    attackerEndState: "kneeling",
    defenderStartState: "grounded-face-up",
    defenderEndState: "grounded-face-up",
    locationStart: "corner-ne",
    locationEnd: "mat",
    targetDurationSeconds: [3.0, 4.2],
    impactTargetSeconds: 2.5,
    requiresGroundedOpponent: true,
    requiresRopes: true,
    diversityScore: 10,
    priority: "P0",
    batch: "batch-3-aerial-ground",
    status: "planned",
    notes: ["Backward somersault rotation — must read clearly as a back flip in wide shot."],
  }),
  A({
    id: "aerial-crossbody-01",
    filename: "/combat/aerial/aerial-crossbody-01.webm",
    role: "attack",
    sourceType: "expanded-reel",
    preferredProductionMode: "expanded-reel",
    family: "rope",
    kind: "aerial",
    tier: 4,
    mappedMoveIds: ["w-crossbody", "w-flying-crossbody", "w-flying-clothesline"],
    attackerStartState: "ropes",
    attackerEndState: "grounded-face-down",
    defenderStartState: "neutral-standing",
    defenderEndState: "grounded-face-up",
    locationStart: "corner-nw",
    locationEnd: "mat",
    targetDurationSeconds: [2.6, 3.4],
    impactTargetSeconds: 1.9,
    requiresRopes: true,
    diversityScore: 8,
    priority: "P1",
    batch: "batch-3-aerial-ground",
    status: "planned",
    notes: ["Hits a STANDING opponent — the only aerial in the pack that does."],
  }),
  A({
    id: "aerial-diving-elbow-01",
    filename: "/combat/aerial/aerial-diving-elbow-01.webm",
    role: "attack",
    sourceType: "expanded-reel",
    preferredProductionMode: "expanded-reel",
    family: "rope",
    kind: "aerial",
    tier: 4,
    mappedMoveIds: ["w-diving-elbow-drop", "w-diving-headbutt"],
    attackerStartState: "ropes",
    attackerEndState: "kneeling",
    defenderStartState: "grounded-face-up",
    defenderEndState: "grounded-face-up",
    locationStart: "corner-se",
    locationEnd: "mat",
    targetDurationSeconds: [2.8, 3.6],
    impactTargetSeconds: 2.3,
    requiresGroundedOpponent: true,
    requiresRopes: true,
    diversityScore: 7,
    priority: "P2",
    batch: "batch-3-aerial-ground",
    status: "planned",
    notes: ["Point-of-impact is a single elbow; steeper, shorter arc than the splash."],
  }),
  A({
    id: "aerial-springboard-attack-01",
    filename: "/combat/aerial/aerial-springboard-attack-01.webm",
    role: "attack",
    sourceType: "dedicated-clip",
    preferredProductionMode: "dedicated-clip",
    family: "rope",
    kind: "aerial",
    tier: 4,
    mappedMoveIds: ["w-springboard-moonsault", "w-springboard-dropkick", "w-springboard-clothesline"],
    attackerStartState: "neutral-standing",
    attackerEndState: "kneeling",
    defenderStartState: "neutral-standing",
    defenderEndState: "grounded-face-up",
    locationStart: "ropes-left",
    locationEnd: "center",
    targetDurationSeconds: [2.6, 3.6],
    impactTargetSeconds: 2.0,
    requiresRopes: true,
    diversityScore: 9,
    priority: "P1",
    batch: "batch-3-aerial-ground",
    status: "planned",
    notes: ["Rope-assisted bounce off the middle rope back into the ring; horizontal launch."],
  }),
  A({
    id: "aerial-suicide-dive-01",
    filename: "/combat/aerial/aerial-suicide-dive-01.webm",
    role: "attack",
    sourceType: "dedicated-clip",
    preferredProductionMode: "dedicated-clip",
    family: "rope",
    kind: "aerial",
    tier: 5,
    mappedMoveIds: ["w-suicide-dive", "w-tope-suicida"],
    attackerStartState: "neutral-standing",
    attackerEndState: "grounded-face-down",
    defenderStartState: "neutral-standing",
    defenderEndState: "grounded-face-up",
    locationStart: "center",
    locationEnd: "outside",
    targetDurationSeconds: [3.0, 4.0],
    impactTargetSeconds: 2.3,
    requiresRopes: true,
    diversityScore: 10,
    priority: "P1",
    batch: "batch-3-aerial-ground",
    status: "planned",
    notes: [
      "Only clip that leaves the ring. Camera must stay wide and keep the ring apron in frame.",
      "Must be followed by a return-to-ring transition before any mat action.",
    ],
  }),

  // ---------------- Pack D — ground attacks (4) ----------------
  A({
    id: "ground-stomp-01",
    filename: "/combat/ground/ground-stomp-01.webm",
    role: "attack",
    sourceType: "expanded-reel",
    preferredProductionMode: "expanded-reel",
    family: "mat",
    kind: "kick",
    tier: 2,
    mappedMoveIds: ["w-stomp", "w-curb-stomp"],
    attackerStartState: "neutral-standing",
    attackerEndState: "neutral-standing",
    defenderStartState: "grounded-face-down",
    defenderEndState: "grounded-face-down",
    locationStart: "mat",
    locationEnd: "mat",
    targetDurationSeconds: [1.8, 2.4],
    impactTargetSeconds: 1.2,
    requiresGroundedOpponent: true,
    diversityScore: 5,
    priority: "P0",
    batch: "batch-3-aerial-ground",
    status: "planned",
    notes: ["Attacker stays upright — cheap, fast filler while the opponent is down."],
  }),
  A({
    id: "ground-elbow-drop-01",
    filename: "/combat/ground/ground-elbow-drop-01.webm",
    role: "attack",
    sourceType: "expanded-reel",
    preferredProductionMode: "expanded-reel",
    family: "mat",
    kind: "grapple",
    tier: 3,
    mappedMoveIds: ["w-elbow-drop", "w-running-elbow-drop"],
    attackerStartState: "neutral-standing",
    attackerEndState: "kneeling",
    defenderStartState: "grounded-face-up",
    defenderEndState: "grounded-face-up",
    locationStart: "mat",
    locationEnd: "mat",
    targetDurationSeconds: [2.0, 2.8],
    impactTargetSeconds: 1.5,
    requiresGroundedOpponent: true,
    diversityScore: 6,
    priority: "P1",
    batch: "batch-3-aerial-ground",
    status: "planned",
    notes: ["Attacker drops to the mat — ends low, chains into a pin or recovery."],
  }),
  A({
    id: "ground-knee-drop-01",
    filename: "/combat/ground/ground-knee-drop-01.webm",
    role: "attack",
    sourceType: "expanded-reel",
    preferredProductionMode: "expanded-reel",
    family: "mat",
    kind: "kick",
    tier: 3,
    mappedMoveIds: ["w-knee-drop", "w-leg-drop"],
    attackerStartState: "neutral-standing",
    attackerEndState: "kneeling",
    defenderStartState: "grounded-face-up",
    defenderEndState: "grounded-face-up",
    locationStart: "mat",
    locationEnd: "mat",
    targetDurationSeconds: [1.8, 2.6],
    impactTargetSeconds: 1.4,
    requiresGroundedOpponent: true,
    diversityScore: 5,
    priority: "P2",
    batch: "batch-3-aerial-ground",
    status: "planned",
    notes: ["Jump + single-knee landing; different rhythm from the elbow drop."],
  }),
  A({
    id: "ground-double-foot-stomp-01",
    filename: "/combat/ground/ground-double-foot-stomp-01.webm",
    role: "attack",
    sourceType: "dedicated-clip",
    preferredProductionMode: "dedicated-clip",
    family: "mat",
    kind: "aerial",
    tier: 4,
    mappedMoveIds: ["w-double-foot-stomp", "w-diving-double-foot-stomp", "fu-double-stomp"],
    attackerStartState: "airborne",
    attackerEndState: "neutral-standing",
    defenderStartState: "grounded-face-up",
    defenderEndState: "grounded-face-up",
    locationStart: "mat",
    locationEnd: "mat",
    targetDurationSeconds: [2.2, 3.0],
    impactTargetSeconds: 1.7,
    requiresGroundedOpponent: true,
    diversityScore: 8,
    priority: "P1",
    batch: "batch-3-aerial-ground",
    status: "planned",
    notes: ["High jump, both feet land together, attacker rebounds back to standing."],
  }),

  // ---------------- Pack E — transitions (4) ----------------
  A({
    id: "transition-approach-01",
    filename: "/combat/transitions/transition-approach-01.webm",
    role: "transition",
    sourceType: "dedicated-clip",
    preferredProductionMode: "dedicated-clip",
    family: "other",
    kind: "grapple",
    tier: 1,
    mappedMoveIds: [],
    attackerStartState: "neutral-standing",
    attackerEndState: "close-standing",
    defenderStartState: "neutral-standing",
    defenderEndState: "close-standing",
    locationStart: "center",
    locationEnd: "center",
    targetDurationSeconds: [1.0, 2.0],
    diversityScore: 4,
    priority: "P0",
    batch: "batch-4-continuity",
    status: "planned",
    notes: ["Circling / closing distance. NO damage. The most reused clip of the whole pack."],
  }),
  A({
    id: "transition-clinch-entry-01",
    filename: "/combat/transitions/transition-clinch-entry-01.webm",
    role: "transition",
    sourceType: "dedicated-clip",
    preferredProductionMode: "dedicated-clip",
    family: "clinch",
    kind: "grapple",
    tier: 1,
    mappedMoveIds: [],
    attackerStartState: "close-standing",
    attackerEndState: "clinched",
    defenderStartState: "close-standing",
    defenderEndState: "clinched",
    locationStart: "center",
    locationEnd: "center",
    targetDurationSeconds: [1.2, 2.2],
    diversityScore: 5,
    priority: "P0",
    batch: "batch-4-continuity",
    status: "planned",
    notes: ["Collar-and-elbow tie-up. Mandatory entry for every suplex/powerbomb clip."],
  }),
  A({
    id: "transition-corner-drive-01",
    filename: "/combat/transitions/transition-corner-drive-01.webm",
    role: "transition",
    sourceType: "dedicated-clip",
    preferredProductionMode: "dedicated-clip",
    family: "clinch",
    kind: "grapple",
    tier: 1,
    mappedMoveIds: [],
    attackerStartState: "close-standing",
    attackerEndState: "close-standing",
    defenderStartState: "close-standing",
    defenderEndState: "cornered",
    locationStart: "center",
    locationEnd: "corner-ne",
    targetDurationSeconds: [1.4, 2.5],
    requiresCorner: true,
    diversityScore: 6,
    priority: "P1",
    batch: "batch-4-continuity",
    status: "planned",
    notes: ["Walks the opponent from the middle into the turnbuckle; unlocks corner attacks."],
  }),
  A({
    id: "transition-ground-to-standing-01",
    filename: "/combat/transitions/transition-ground-to-standing-01.webm",
    role: "transition",
    sourceType: "dedicated-clip",
    preferredProductionMode: "dedicated-clip",
    family: "other",
    kind: "grapple",
    tier: 1,
    mappedMoveIds: [],
    attackerStartState: "kneeling",
    attackerEndState: "neutral-standing",
    defenderStartState: "grounded-face-up",
    defenderEndState: "kneeling",
    locationStart: "mat",
    locationEnd: "center",
    targetDurationSeconds: [1.6, 2.5],
    diversityScore: 5,
    priority: "P0",
    batch: "batch-4-continuity",
    status: "planned",
    notes: ["Gets the match off the mat without a cut; both fighters rise at different speeds."],
  }),

  // ---------------- Pack F — reaction / recovery (4) ----------------
  A({
    id: "reaction-light-stagger-01",
    filename: "/combat/reactions/reaction-light-stagger-01.webm",
    role: "reaction",
    sourceType: "dedicated-clip",
    preferredProductionMode: "dedicated-clip",
    family: "other",
    kind: "punch",
    tier: 1,
    mappedMoveIds: [],
    attackerStartState: "close-standing",
    attackerEndState: "close-standing",
    defenderStartState: "staggered",
    defenderEndState: "neutral-standing",
    locationStart: "center",
    locationEnd: "center",
    targetDurationSeconds: [0.8, 1.4],
    diversityScore: 3,
    priority: "P0",
    batch: "batch-4-continuity",
    status: "planned",
    notes: ["NEVER damaging. Absorbs the beat after a strike so the next hit is not a jump cut."],
  }),
  A({
    id: "reaction-heavy-fall-01",
    filename: "/combat/reactions/reaction-heavy-fall-01.webm",
    role: "reaction",
    sourceType: "dedicated-clip",
    preferredProductionMode: "dedicated-clip",
    family: "other",
    kind: "grapple",
    tier: 1,
    mappedMoveIds: [],
    attackerStartState: "neutral-standing",
    attackerEndState: "neutral-standing",
    defenderStartState: "staggered",
    defenderEndState: "grounded-face-up",
    locationStart: "center",
    locationEnd: "mat",
    targetDurationSeconds: [1.2, 2.0],
    diversityScore: 5,
    priority: "P0",
    batch: "batch-4-continuity",
    status: "planned",
    notes: ["Collapse to the mat after a heavy blow; the bridge into any KO count."],
  }),
  A({
    id: "recovery-grounded-01",
    filename: "/combat/recovery/recovery-grounded-01.webm",
    role: "recovery",
    sourceType: "dedicated-clip",
    preferredProductionMode: "dedicated-clip",
    family: "mat",
    kind: "grapple",
    tier: 1,
    mappedMoveIds: [],
    attackerStartState: "neutral-standing",
    attackerEndState: "neutral-standing",
    defenderStartState: "grounded-face-up",
    defenderEndState: "grounded-face-up",
    locationStart: "mat",
    locationEnd: "mat",
    targetDurationSeconds: [1.5, 3.0],
    diversityScore: 4,
    priority: "P0",
    batch: "batch-4-continuity",
    status: "planned",
    notes: [
      "Loopable: opponent breathing/rolling on the mat while the referee counts.",
      "Feeds the existing 20s KO window without freezing the picture.",
    ],
  }),
  A({
    id: "recovery-stand-up-01",
    filename: "/combat/recovery/recovery-stand-up-01.webm",
    role: "recovery",
    sourceType: "dedicated-clip",
    preferredProductionMode: "dedicated-clip",
    family: "other",
    kind: "grapple",
    tier: 1,
    mappedMoveIds: [],
    attackerStartState: "neutral-standing",
    attackerEndState: "neutral-standing",
    defenderStartState: "grounded-face-up",
    defenderEndState: "neutral-standing",
    locationStart: "mat",
    locationEnd: "center",
    targetDurationSeconds: [1.8, 3.0],
    diversityScore: 5,
    priority: "P0",
    batch: "batch-4-continuity",
    status: "planned",
    notes: ["Beaten fighter gets back to his feet; required exit from every grounded state."],
  }),
];

// ---------------------------------------------------------------------------
// Structured expanded-reel plans (for the assets marked "expanded-reel")
// ---------------------------------------------------------------------------

export type PlannedReel = {
  id: string;
  filename: string;
  /** Ordered asset ids, each gets its own clean 4s slot. */
  slots: Array<{ assetId: string; startSeconds: number; endSeconds: number }>;
  notes: string[];
};

const reel = (id: string, filename: string, assetIds: string[], notes: string[]): PlannedReel => ({
  id,
  filename,
  slots: assetIds.map((assetId, index) => ({
    assetId,
    startSeconds: index * 4,
    endSeconds: index * 4 + 4,
  })),
  notes,
});

export const PLANNED_REELS: PlannedReel[] = [
  reel(
    "combat-reel-standup-01",
    "/combat/reels/combat-reel-standup-01.webm",
    ["strike-boxing-combo-01", "kick-roundhouse-01", "strike-corner-combo-01"],
    ["4s per action: entry ~1s, impact ~2s, exit ~3s, held pose to 4s. No overlap between actions."],
  ),
  reel(
    "combat-reel-power-01",
    "/combat/reels/combat-reel-power-01.webm",
    ["throw-body-slam-01", "throw-belly-to-belly-01", "throw-powerslam-01", "throw-firemans-carry-01"],
    ["Reset to a neutral centre-ring stance between every slot so windows stay isolatable."],
  ),
  reel(
    "combat-reel-ground-01",
    "/combat/reels/combat-reel-ground-01.webm",
    ["ground-stomp-01", "ground-elbow-drop-01", "ground-knee-drop-01"],
    ["Opponent stays down for the whole reel; attacker resets to standing between slots."],
  ),
  reel(
    "combat-reel-aerial-01",
    "/combat/reels/combat-reel-aerial-01.webm",
    ["aerial-crossbody-01", "aerial-diving-elbow-01"],
    ["Climb included inside each slot; do not cut mid-climb."],
  ),
];

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

export function assetsByBatch(): Record<ProductionBatch, PlannedCombatAsset[]> {
  const out: Record<ProductionBatch, PlannedCombatAsset[]> = {
    "batch-1-core-standup": [],
    "batch-2-power": [],
    "batch-3-aerial-ground": [],
    "batch-4-continuity": [],
  };
  for (const asset of PLANNED_COMBAT_ASSETS) out[asset.batch].push(asset);
  return out;
}

export function plannedAsset(id: string): PlannedCombatAsset | undefined {
  return PLANNED_COMBAT_ASSETS.find((asset) => asset.id === id);
}

/** Only these may ever be handed to the runtime registry. */
export function registerableAssets(): PlannedCombatAsset[] {
  return PLANNED_COMBAT_ASSETS.filter((asset) => asset.status === "registered");
}

export type PlannedCoverageReport = {
  totalMoveDefinitions: number;
  plannedAssets: number;
  plannedAttackClips: number;
  plannedTransitionClips: number;
  plannedReactionRecoveryClips: number;
  byPriority: Record<"P0" | "P1" | "P2", number>;
  byBatch: Record<ProductionBatch, number>;
  byProductionMode: Record<ProductionMode, number>;
  byStatus: Record<PlannedAssetStatus, number>;
  movesCoveredByPlanned: number;
  movesStillLegacyOnly: number;
  /** Ratio counting ONLY assets already registered as real footage. */
  currentDedicatedCoverageRatio: number;
  /** Forecast if the whole pack ships. Not reality. */
  projectedDedicatedCoverageRatio: number;
  coverageByFamily: Record<string, number>;
  coverageByKind: Record<string, number>;
  coverageByTier: Record<string, number>;
  averageDiversityScore: number;
};

export function plannedCoverageReport(allMoveIds: string[]): PlannedCoverageReport {
  const total = allMoveIds.length || 1;
  const planned = PLANNED_COMBAT_ASSETS;

  const byPriority = { P0: 0, P1: 0, P2: 0 } as Record<"P0" | "P1" | "P2", number>;
  const byBatch: Record<ProductionBatch, number> = {
    "batch-1-core-standup": 0,
    "batch-2-power": 0,
    "batch-3-aerial-ground": 0,
    "batch-4-continuity": 0,
  };
  const byProductionMode: Record<ProductionMode, number> = {
    "dedicated-clip": 0,
    "expanded-reel": 0,
    either: 0,
  };
  const byStatus: Record<PlannedAssetStatus, number> = {
    planned: 0,
    generated: 0,
    review: 0,
    approved: 0,
    registered: 0,
    rejected: 0,
  };
  const coverageByFamily: Record<string, number> = {};
  const coverageByKind: Record<string, number> = {};
  const coverageByTier: Record<string, number> = {};

  const covered = new Set<string>();
  const registeredCovered = new Set<string>();
  let diversity = 0;

  for (const asset of planned) {
    byPriority[asset.priority] += 1;
    byBatch[asset.batch] += 1;
    byProductionMode[asset.preferredProductionMode] += 1;
    byStatus[asset.status] += 1;
    diversity += asset.diversityScore;
    for (const moveId of asset.mappedMoveIds) {
      covered.add(moveId);
      if (asset.status === "registered") registeredCovered.add(moveId);
      coverageByFamily[asset.family] = (coverageByFamily[asset.family] ?? 0) + 1;
      coverageByKind[asset.kind] = (coverageByKind[asset.kind] ?? 0) + 1;
      coverageByTier[`t${asset.tier}`] = (coverageByTier[`t${asset.tier}`] ?? 0) + 1;
    }
  }

  const known = new Set(allMoveIds);
  const coveredKnown = [...covered].filter((id) => known.has(id));

  const round = (value: number) => Math.round(value * 1000) / 10;

  return {
    totalMoveDefinitions: allMoveIds.length,
    plannedAssets: planned.length,
    plannedAttackClips: planned.filter((a) => a.role === "attack").length,
    plannedTransitionClips: planned.filter((a) => a.role === "transition").length,
    plannedReactionRecoveryClips: planned.filter(
      (a) => a.role === "reaction" || a.role === "recovery",
    ).length,
    byPriority,
    byBatch,
    byProductionMode,
    byStatus,
    movesCoveredByPlanned: coveredKnown.length,
    movesStillLegacyOnly: allMoveIds.length - coveredKnown.length,
    currentDedicatedCoverageRatio: round(registeredCovered.size / total),
    projectedDedicatedCoverageRatio: round(coveredKnown.length / total),
    coverageByFamily,
    coverageByKind,
    coverageByTier,
    averageDiversityScore: Math.round((diversity / (planned.length || 1)) * 10) / 10,
  };
}

/** Mapped ids that do not exist in scenes.ts — must be fixed before production. */
export function unknownMappedMoveIds(allMoveIds: string[]): Array<{ assetId: string; moveId: string }> {
  const known = new Set(allMoveIds);
  const out: Array<{ assetId: string; moveId: string }> = [];
  for (const asset of PLANNED_COMBAT_ASSETS)
    for (const moveId of asset.mappedMoveIds)
      if (!known.has(moveId)) out.push({ assetId: asset.id, moveId });
  return out;
}

/** Flat rows for the admin inspector. */
export function plannedAssetRows() {
  return PLANNED_COMBAT_ASSETS.map((asset) => ({
    id: asset.id,
    filename: asset.filename,
    role: asset.role,
    family: asset.family,
    kind: asset.kind,
    tier: asset.tier,
    priority: asset.priority,
    batch: asset.batch,
    mode: asset.preferredProductionMode,
    status: asset.status,
    mappedMoves: asset.mappedMoveIds.length,
    diversityScore: asset.diversityScore,
    duration: `${asset.targetDurationSeconds[0]}–${asset.targetDurationSeconds[1]}s`,
    states: `${asset.attackerStartState}→${asset.attackerEndState} / ${asset.defenderStartState}→${asset.defenderEndState}`,
    location: `${asset.locationStart}→${asset.locationEnd}`,
    checklist: checklistProgress(asset.status),
  }));
}
