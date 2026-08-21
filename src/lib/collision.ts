/**
 * Collisions and impact points.
 *
 * Two things are tuned here so a blow reads as a real hit:
 *  1. WHEN it lands — the contact frame is clamped inside its scene window and
 *     always leaves room for the follow-through, so a move is never cut at the
 *     moment of contact but plays through to its end.
 *  2. WHERE it lands — the spark burst is placed on the contact point between
 *     the two fighters (height depends on the kind of blow: head, body, legs or
 *     the mat), instead of a fixed left/right position that floats in the air.
 */

import type { Move } from "@/lib/scenes";
import type { HitKind } from "@/lib/moveKind";
import type { Side } from "@/lib/battle";

/** Seconds of picture that must still play AFTER contact, per kind of blow. */
const FOLLOW_THROUGH: Record<HitKind, number> = {
  punch: 0.28,
  kick: 0.42,
  grapple: 0.6,
  aerial: 0.75,
  throw: 0.85,
};

/** Seconds of wind-up kept BEFORE contact so the blow is seen travelling. */
const WIND_UP: Record<HitKind, number> = {
  punch: 0.2,
  kick: 0.28,
  grapple: 0.4,
  aerial: 0.5,
  throw: 0.55,
};

export function followThroughOf(kind: HitKind): number {
  return FOLLOW_THROUGH[kind];
}

/**
 * Contact frame of a move, clamped inside its own window: never in the first
 * frames (there has to be a wind-up) and never so late that the scene ends on
 * the impact. When the window is short, the wind-up and the follow-through are
 * shrunk proportionally instead of one of them being dropped.
 */
export function impactTimeOf(move: Move, kind: HitKind): number {
  const span = Math.max(0.12, move.end - move.start);
  let lead = WIND_UP[kind];
  let tail = FOLLOW_THROUGH[kind];
  const needed = lead + tail;
  if (needed > span * 0.9) {
    const factor = (span * 0.9) / needed;
    lead *= factor;
    tail *= factor;
  }
  const min = move.start + lead;
  const max = move.end - tail;
  if (max <= min) return move.start + span * 0.55;
  return Math.max(min, Math.min(max, move.impact));
}

/**
 * End of the scene guaranteed to contain the whole follow-through: if the
 * scripted window would close too soon after contact, it is extended (bounded
 * by the length of the reel).
 */
export function completionEndOf(move: Move, kind: HitKind, reelEnd = 39.8): number {
  const impact = impactTimeOf(move, kind);
  return Math.min(reelEnd, Math.max(move.end, impact + FOLLOW_THROUGH[kind]));
}

/** Stable 0..1 value out of a scene id, so a scene always hits in the same spot. */
function hash01(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}

/**
 * Height of the contact point inside the picture, in % of the ring frame.
 * Head-level for punches, mid-body for kicks and clinches, low for throws and
 * anything that finishes on the mat.
 */
const CONTACT_Y: Record<HitKind, number> = {
  punch: 43,
  kick: 55,
  grapple: 52,
  aerial: 49,
  throw: 64,
};

export type ContactPoint = { left: number; top: number };

/**
 * Where the two bodies actually meet: between the attacker and the defender,
 * slightly on the defender's side, at the height of the blow. `travel` (0..1)
 * is how far the action has drifted across the ring for this scene, taken from
 * the scene id so it stays consistent for the whole move.
 */
export function contactPointOf(
  move: Move,
  kind: HitKind,
  attacker: Side,
  onMat = false,
): ContactPoint {
  const drift = (hash01(move.id) - 0.5) * 18; // −9% … +9% across the ring
  // The attacker comes from his corner, so contact sits just past the middle,
  // on the defender's half.
  const bias = attacker === "ru" ? 6 : -6;
  const left = Math.max(18, Math.min(82, 50 + bias + drift));
  const top = onMat ? 72 : CONTACT_Y[kind] + (hash01(`${move.id}-y`) - 0.5) * 6;
  return { left, top: Math.max(30, Math.min(78, top)) };
}
