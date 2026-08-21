/**
 * Physical combat asset layer.
 *
 *   Move (semantic name)  →  CombatClip (real footage)  →  Video / Reel
 *
 * A CombatClip is the actual animation a viewer sees. It is NOT a wrestling
 * move name: many names may legitimately point at one clip. Clips come either
 * from a window of an existing master reel ("legacy-reel") or, later, from a
 * dedicated file shipped on its own ("dedicated-clip").
 *
 * Nothing in this module plays video. It is data plus pure helpers so the
 * arena component does not grow.
 */

import type { SceneFamily } from "@/lib/scenes";
import type { HitKind } from "@/lib/hitConfig";
import type { CombatLocation, CombatState } from "@/lib/combatState";

export type CombatClipSourceType = "legacy-reel" | "expanded-reel" | "dedicated-clip";

/** What a clip does dramatically. Only "attack" may ever deal damage. */
export type CombatClipRole =
  | "attack"
  | "transition"
  | "reaction"
  | "recovery"
  | "idle"
  | "taunt"
  | "ko";

export type CombatClip = {
  id: string;
  src: string;

  /** Reel mode: window inside a master reel. Omitted for standalone files. */
  start?: number;
  end?: number;
  impact?: number;
  /** Standalone mode: known length, otherwise read from media metadata. */
  duration?: number;

  sourceType: CombatClipSourceType;
  role: CombatClipRole;

  moveFamily: SceneFamily;
  kind: HitKind;

  /** Semantic move ids/labels this footage can legitimately represent. */
  moveIds: string[];

  tier: 1 | 2 | 3 | 4 | 5;

  attackerStartState: CombatState;
  attackerEndState: CombatState;
  defenderStartState: CombatState;
  defenderEndState: CombatState;

  locationStart: CombatLocation;
  locationEnd: CombatLocation;

  attackerSide?: "left" | "right" | "either";

  requiresStandingOpponent?: boolean;
  requiresGroundedOpponent?: boolean;
  requiresCorner?: boolean;
  requiresRopes?: boolean;

  /** Visual cluster this footage belongs to (audit layer, phase 2). */
  clusterId?: string;
  tags: string[];
  enabled: boolean;
};

/** Playable length in seconds, for both asset modes (0 = read from metadata). */
export function clipDuration(clip: CombatClip): number {
  if (typeof clip.start === "number" && typeof clip.end === "number")
    return Math.max(0, clip.end - clip.start);
  return clip.duration ?? 0;
}

/** Playback window for the player: standalone clips simply start at 0. */
export function clipWindow(clip: CombatClip): { start: number; end: number | null } {
  if (typeof clip.start === "number" && typeof clip.end === "number")
    return { start: clip.start, end: clip.end };
  return { start: clip.start ?? 0, end: clip.duration ? (clip.start ?? 0) + clip.duration : null };
}

/** Moment the hit lands, absolute in the source video. */
export function clipImpact(clip: CombatClip): number {
  if (typeof clip.impact === "number") return clip.impact;
  const { start } = clipWindow(clip);
  const duration = clipDuration(clip);
  return duration > 0 ? start + duration * 0.62 : start;
}

/** Only attack clips are ever allowed to credit a gift with damage. */
export function isDamaging(clip: CombatClip): boolean {
  return clip.role === "attack";
}
