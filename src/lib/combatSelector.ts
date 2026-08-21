/**
 * Pure clip selection: given a requested (semantic) move and the current
 * visual state of the match, score the physical footage we own and pick the
 * best legal one. No React, no video, no side effects — Arena.tsx must not
 * grow because of this phase.
 *
 * If nothing scores above -Infinity the caller falls back to the existing
 * VisualSequence scheduler, so there can never be a blank arena.
 */

import type { CombatClip } from "@/lib/combatClips";
import { enabledCombatClips } from "@/lib/combatClipRegistry";
import {
  continuityScore,
  isGrounded,
  locationScore,
  type MatchVisualState,
} from "@/lib/combatState";
import type { Move } from "@/lib/scenes";
import { familyOf } from "@/lib/scenes";
import { moveKind } from "@/lib/moveKind";

export type ClipRequest = {
  requestedMove: Pick<Move, "id" | "label" | "tier">;
  state: MatchVisualState;
  recentClips?: string[];
  recentClusters?: string[];
};

/** Higher is better. -Infinity means physically impossible right now. */
export function scoreClipCompatibility(clip: CombatClip, request: ClipRequest): number {
  if (!clip.enabled) return -Infinity;
  const { requestedMove, state, recentClips = [], recentClusters = [] } = request;

  const defenderDown = isGrounded(state.defenderState);
  if (clip.requiresGroundedOpponent && !defenderDown) return -Infinity;
  if (clip.requiresStandingOpponent && defenderDown) return -Infinity;
  if (clip.requiresCorner && !state.location.startsWith("corner")) return -Infinity;
  if (clip.requiresRopes && !state.location.startsWith("ropes")) return -Infinity;

  let score = 0;

  // Semantic match: does this footage actually represent the requested move?
  if (clip.moveIds.includes(requestedMove.id)) score += 40;
  const kind = moveKind(requestedMove);
  if (clip.kind === kind) score += 18;
  const family = familyOf(requestedMove);
  if (clip.moveFamily === family) score += 12;

  // Tier proximity: a light jab should not play a finisher slam.
  score += Math.max(0, 10 - Math.abs(clip.tier - requestedMove.tier) * 4);

  // Continuity: does the clip start where the previous one ended?
  score += continuityScore(state.attackerState, clip.attackerStartState) * 20;
  score += continuityScore(state.defenderState, clip.defenderStartState) * 25;
  score += locationScore(state.location, clip.locationStart) * 10;

  // Freshness: the same footage or the same cluster twice in a row is the
  // single most visible flaw, so penalise it hard — but never disqualify.
  const clipAge = recentClips.lastIndexOf(clip.id);
  if (clipAge >= 0) score -= 40 - (recentClips.length - 1 - clipAge) * 6;
  if (clip.clusterId) {
    const clusterAge = recentClusters.lastIndexOf(clip.clusterId);
    if (clusterAge >= 0) score -= 30 - (recentClusters.length - 1 - clusterAge) * 5;
  }
  if (state.lastClipId === clip.id) score -= 60;
  if (state.lastClusterId && state.lastClusterId === clip.clusterId) score -= 45;
  if (state.lastMoveFamily === clip.moveFamily) score -= 6;

  return score;
}

export type ClipChoice = { clip: CombatClip; score: number } | null;

/** Best attack clip for a request, or null when the legacy path must be used. */
export function selectCombatClip(request: ClipRequest, role: CombatClip["role"] = "attack"): ClipChoice {
  let best: ClipChoice = null;
  for (const clip of enabledCombatClips()) {
    if (clip.role !== role) continue;
    const score = scoreClipCompatibility(clip, request);
    if (score === -Infinity) continue;
    if (!best || score > best.score) best = { clip, score };
  }
  return best;
}

/** Ranked list, for the admin inspector and for tests. */
export function rankCombatClips(request: ClipRequest, role: CombatClip["role"] = "attack") {
  return enabledCombatClips()
    .filter((clip) => clip.role === role)
    .map((clip) => ({ clip, score: scoreClipCompatibility(clip, request) }))
    .filter((entry) => entry.score > -Infinity)
    .sort((a, b) => b.score - a.score);
}
