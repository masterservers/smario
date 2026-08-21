/**
 * Lightweight continuity vocabulary for the fight.
 *
 * This is not a physics engine: it only records *where* the two fighters are
 * and *how* they stand at the beginning and at the end of a piece of footage,
 * so the selector can chain clips that actually follow one another
 * (clinch → suplex → mat → recovery) instead of cutting between unrelated
 * postures.
 */

import type { SceneFamily } from "@/lib/scenes";

export type CombatState =
  | "neutral-standing"
  | "close-standing"
  | "clinched"
  | "attacking"
  | "staggered"
  | "grounded-face-up"
  | "grounded-face-down"
  | "kneeling"
  | "cornered"
  | "ropes"
  | "airborne"
  | "recovering"
  | "ko";

export type CombatLocation =
  | "center"
  | "left-side"
  | "right-side"
  | "corner-nw"
  | "corner-ne"
  | "corner-sw"
  | "corner-se"
  | "ropes-left"
  | "ropes-right"
  | "mat"
  | "outside";

/** What the arena is currently showing, as far as continuity is concerned. */
export type MatchVisualState = {
  attackerState: CombatState;
  defenderState: CombatState;
  location: CombatLocation;
  lastClipId: string | null;
  lastClusterId: string | null;
  lastMoveFamily: SceneFamily | null;
};

export const INITIAL_VISUAL_STATE: MatchVisualState = {
  attackerState: "neutral-standing",
  defenderState: "neutral-standing",
  location: "center",
  lastClipId: null,
  lastClusterId: null,
  lastMoveFamily: null,
};

/** States in which the opponent counts as down on the mat. */
export const GROUNDED_STATES: CombatState[] = [
  "grounded-face-up",
  "grounded-face-down",
  "kneeling",
  "ko",
];

export function isGrounded(state: CombatState): boolean {
  return GROUNDED_STATES.includes(state);
}

export function isStanding(state: CombatState): boolean {
  return !isGrounded(state) && state !== "airborne";
}

/** States that read as "close enough to grapple". */
export function isClose(state: CombatState): boolean {
  return state === "close-standing" || state === "clinched" || state === "cornered";
}

/**
 * How naturally state B can follow state A. 1 = seamless, 0 = a hard cut the
 * viewer will notice. Used as a score, never as a hard filter, so the
 * scheduler can never starve.
 */
export function continuityScore(previous: CombatState, next: CombatState): number {
  if (previous === next) return 1;
  if (isGrounded(previous) && isGrounded(next)) return 0.85;
  if (previous === "recovering" && next === "neutral-standing") return 0.95;
  if (previous === "staggered" && (next === "close-standing" || next === "neutral-standing"))
    return 0.8;
  if (previous === "clinched" && (next === "close-standing" || next === "airborne")) return 0.8;
  if (isGrounded(previous) && isStanding(next)) return 0.1; // needs a recovery clip first
  if (isStanding(previous) && isGrounded(next)) return 0.35;
  return 0.5;
}

/** Locations that read as the same spot in the ring. */
export function locationScore(previous: CombatLocation, next: CombatLocation): number {
  if (previous === next) return 1;
  const corner = (l: CombatLocation) => l.startsWith("corner");
  const ropes = (l: CombatLocation) => l.startsWith("ropes");
  if (corner(previous) && corner(next)) return 0.7;
  if (ropes(previous) && ropes(next)) return 0.7;
  if (previous === "mat" || next === "mat") return 0.6;
  return 0.5;
}
