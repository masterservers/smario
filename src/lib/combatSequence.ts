/**
 * A gift buys exactly ONE damaging attack. Around that attack a fight should
 * be able to show approach, clinch entry, landing reaction and recovery — none
 * of which may ever deal damage or credit a second hit.
 *
 * This module builds that flow. Today the registry only owns attack footage,
 * so a sequence normally contains a single clip; the shape is already correct
 * for the moment real transition/reaction/recovery clips are registered.
 */

import type { CombatClip } from "@/lib/combatClips";
import { isDamaging } from "@/lib/combatClips";
import { selectCombatClip, type ClipRequest } from "@/lib/combatSelector";
import { isGrounded, type MatchVisualState } from "@/lib/combatState";

export type CombatSequence = {
  id: string;
  requestedMoveId: string;
  clips: CombatClip[];
  /** Index of the single clip that deals damage. -1 only for non-attack flows. */
  damagingClipIndex: number;
};

export type SequenceOptions = ClipRequest & {
  /** Under gift-burst pressure the optional clips are dropped, never the attack. */
  underPressure?: boolean;
};

/**
 * Best legal flow for a requested move. Returns null when no compatible
 * footage exists — the caller then uses the existing VisualSequence path.
 */
export function buildCombatSequence(options: SequenceOptions): CombatSequence | null {
  const attack = selectCombatClip(options, "attack");
  if (!attack) return null;

  const clips: CombatClip[] = [];

  if (!options.underPressure) {
    // Getting up first if the attack needs a standing opponent but he is down.
    if (attack.clip.requiresStandingOpponent && isGrounded(options.state.defenderState)) {
      const recovery = selectCombatClip(options, "recovery");
      if (recovery) clips.push(recovery.clip);
    }
    const transition = selectCombatClip(options, "transition");
    if (transition && transition.clip.attackerEndState === attack.clip.attackerStartState)
      clips.push(transition.clip);
  }

  const damagingClipIndex = clips.length;
  clips.push(attack.clip);

  if (!options.underPressure) {
    const reaction = selectCombatClip(options, "reaction");
    if (reaction && reaction.clip.defenderStartState === attack.clip.defenderEndState)
      clips.push(reaction.clip);
  }

  return {
    id: `seq-${options.requestedMove.id}-${attack.clip.id}`,
    requestedMoveId: options.requestedMove.id,
    clips,
    damagingClipIndex,
  };
}

/** Safety net: exactly one damaging clip per sequence. */
export function validateSequence(sequence: CombatSequence): boolean {
  const damaging = sequence.clips.filter(isDamaging).length;
  return damaging === 1 && isDamaging(sequence.clips[sequence.damagingClipIndex]!);
}

/** Apply the end states of a finished clip to the running visual state. */
export function advanceVisualState(state: MatchVisualState, clip: CombatClip): MatchVisualState {
  return {
    attackerState: clip.attackerEndState,
    defenderState: clip.defenderEndState,
    location: clip.locationEnd,
    lastClipId: clip.id,
    lastClusterId: clip.clusterId ?? state.lastClusterId,
    lastMoveFamily: clip.moveFamily,
  };
}

/**
 * Which assets are worth having in memory: the clip on screen, the next one in
 * the sequence and (optionally) the recovery that usually follows. Never the
 * whole library — the arena keeps its limited decode slots.
 */
export function preloadTargets(sequence: CombatSequence, index: number): string[] {
  const wanted = [sequence.clips[index], sequence.clips[index + 1], sequence.clips[index + 2]];
  return Array.from(new Set(wanted.filter(Boolean).map((clip) => clip!.src)));
}
