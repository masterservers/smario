/**
 * The single place where real combat footage is declared.
 *
 * Adding a new animation must never require touching Arena.tsx: declare the
 * file here with `registerCombatClip()` and the selector picks it up.
 *
 * Today the registry is seeded from the footage we actually own: one legacy
 * clip per *visual cluster* of the two master reels. It is deliberately NOT
 * one clip per move name — 466 labels do not mean 466 animations, and this
 * layer must never inflate the asset count.
 *
 * File naming for future assets (see /public/combat/…):
 *   strike-clothesline-01.webm, kick-superkick-01.webm,
 *   throw-german-suplex-01.webm, finisher-chokeslam-01.webm,
 *   transition-clinch-entry-01.webm, recovery-ground-to-standing-01.webm
 */

import type { CombatClip, CombatClipRole } from "@/lib/combatClips";
import type { CombatLocation, CombatState } from "@/lib/combatState";
import { VISUAL_CLUSTERS, clusterRow } from "@/lib/visualClusters";
import { VISUAL_SEQUENCES, sceneLabel, sequenceMembers } from "@/lib/visualSequences";
import type { SceneFamily } from "@/lib/scenes";
import type { HitKind } from "@/lib/hitConfig";

const clips = new Map<string, CombatClip>();

export function registerCombatClip(clip: CombatClip): CombatClip {
  clips.set(clip.id, clip);
  return clip;
}

export function unregisterCombatClip(id: string) {
  clips.delete(id);
}

export function combatClip(id: string): CombatClip | undefined {
  return clips.get(id);
}

export function allCombatClips(): CombatClip[] {
  return Array.from(clips.values());
}

export function enabledCombatClips(): CombatClip[] {
  return allCombatClips().filter((clip) => clip.enabled);
}

export function clipsByRole(role: CombatClipRole): CombatClip[] {
  return enabledCombatClips().filter((clip) => clip.role === role);
}

/* ------------------------------------------------------------------ */
/* Seed: existing reels, one clip per visual cluster                   */
/* ------------------------------------------------------------------ */

function stateForFamily(family: SceneFamily): {
  attackerEnd: CombatState;
  defenderStart: CombatState;
  defenderEnd: CombatState;
  location: CombatLocation;
} {
  switch (family) {
    case "throw":
      return {
        attackerEnd: "close-standing",
        defenderStart: "close-standing",
        defenderEnd: "grounded-face-up",
        location: "center",
      };
    case "mat":
      return {
        attackerEnd: "kneeling",
        defenderStart: "grounded-face-up",
        defenderEnd: "grounded-face-up",
        location: "mat",
      };
    case "rope":
      return {
        attackerEnd: "neutral-standing",
        defenderStart: "neutral-standing",
        defenderEnd: "grounded-face-up",
        location: "ropes-left",
      };
    case "clinch":
      return {
        attackerEnd: "clinched",
        defenderStart: "close-standing",
        defenderEnd: "clinched",
        location: "center",
      };
    case "taunt":
      return {
        attackerEnd: "neutral-standing",
        defenderStart: "neutral-standing",
        defenderEnd: "neutral-standing",
        location: "center",
      };
    default:
      return {
        attackerEnd: "neutral-standing",
        defenderStart: "neutral-standing",
        defenderEnd: "staggered",
        location: "center",
      };
  }
}

function roleForFamily(family: SceneFamily): CombatClipRole {
  if (family === "taunt") return "idle";
  return "attack";
}

function tierOf(kind: HitKind): 1 | 2 | 3 | 4 | 5 {
  if (kind === "throw") return 4;
  if (kind === "aerial") return 4;
  if (kind === "kick") return 3;
  if (kind === "grapple") return 2;
  return 1;
}

/**
 * One legacy clip per perceived visual cluster: this is the honest count of
 * distinct footage the project owns today.
 */
for (const cluster of VISUAL_CLUSTERS) {
  const representative = VISUAL_SEQUENCES[cluster.representativeSequenceId];
  if (!representative) continue;
  const names = cluster.memberSequenceIds.flatMap((id) => sequenceMembers(id));
  const states = stateForFamily(cluster.family);
  const role = roleForFamily(cluster.family);
  registerCombatClip({
    id: `legacy-${cluster.id}`,
    src: representative.src,
    start: representative.start,
    end: representative.end,
    impact: representative.impact,
    sourceType: "legacy-reel",
    role,
    moveFamily: cluster.family,
    kind: cluster.kind,
    moveIds: names,
    tier: tierOf(cluster.kind),
    attackerStartState: "neutral-standing",
    attackerEndState: states.attackerEnd,
    defenderStartState: states.defenderStart,
    defenderEndState: role === "attack" ? states.defenderEnd : "neutral-standing",
    locationStart: "center",
    locationEnd: states.location,
    attackerSide: "either",
    requiresGroundedOpponent: cluster.family === "mat" ? true : undefined,
    clusterId: cluster.id,
    tags: [cluster.family, cluster.kind, "legacy"],
    enabled: true,
  });
}

/* ------------------------------------------------------------------ */
/* Inventory report (debug / admin only)                               */
/* ------------------------------------------------------------------ */

export type ClipInventory = {
  total: number;
  legacy: number;
  expanded: number;
  dedicated: number;
  byRole: Record<CombatClipRole, number>;
  uniqueAttackClips: number;
  uniqueClusters: number;
  moveDefinitions: number;
  movesWithDedicatedFootage: number;
  movesUsingFallback: number;
  movesWithoutFootage: number;
  dedicatedCoverageRatio: number;
};

export function clipInventory(moveIds: string[]): ClipInventory {
  const list = allCombatClips();
  const byRole = {
    attack: 0,
    transition: 0,
    reaction: 0,
    recovery: 0,
    idle: 0,
    taunt: 0,
    ko: 0,
  } as Record<CombatClipRole, number>;
  for (const clip of list) byRole[clip.role] += 1;

  const dedicatedMoves = new Set<string>();
  const anyMoves = new Set<string>();
  for (const clip of list) {
    if (!clip.enabled) continue;
    for (const move of clip.moveIds) {
      anyMoves.add(move);
      if (clip.sourceType !== "legacy-reel") dedicatedMoves.add(move);
    }
  }
  const covered = moveIds.filter((id) => anyMoves.has(id)).length;
  const dedicated = moveIds.filter((id) => dedicatedMoves.has(id)).length;

  return {
    total: list.length,
    legacy: list.filter((c) => c.sourceType === "legacy-reel").length,
    expanded: list.filter((c) => c.sourceType === "expanded-reel").length,
    dedicated: list.filter((c) => c.sourceType === "dedicated-clip").length,
    byRole,
    uniqueAttackClips: list.filter((c) => c.role === "attack").length,
    uniqueClusters: new Set(list.map((c) => c.clusterId ?? c.id)).size,
    moveDefinitions: moveIds.length,
    movesWithDedicatedFootage: dedicated,
    movesUsingFallback: covered - dedicated,
    movesWithoutFootage: moveIds.length - covered,
    dedicatedCoverageRatio: moveIds.length ? Number(((dedicated / moveIds.length) * 100).toFixed(1)) : 0,
  };
}

/** Row model for the admin asset inspector. */
export function clipInspectorRows() {
  return allCombatClips().map((clip) => ({
    id: clip.id,
    sourceType: clip.sourceType,
    src: clip.src.split("/").pop() ?? clip.src,
    window:
      typeof clip.start === "number" && typeof clip.end === "number"
        ? `${clip.start.toFixed(2)}–${clip.end.toFixed(2)}s`
        : "full clip",
    role: clip.role,
    kind: clip.kind,
    family: clip.moveFamily,
    tier: clip.tier,
    names: clip.moveIds.length,
    examples: clip.moveIds.slice(0, 5).map((id) => sceneLabel(id)),
    attacker: `${clip.attackerStartState} → ${clip.attackerEndState}`,
    defender: `${clip.defenderStartState} → ${clip.defenderEndState}`,
    location: `${clip.locationStart} → ${clip.locationEnd}`,
    cluster: clip.clusterId ? clusterRow(VISUAL_CLUSTERS.find((c) => c.id === clip.clusterId)!).span : "—",
    enabled: clip.enabled,
  }));
}
