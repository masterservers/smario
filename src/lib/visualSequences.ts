/**
 * Visual sequence registry.
 *
 * The move catalog holds *names* (semantic metadata: label, tier, kind,
 * family). The footage actually shown on screen is a **visual sequence**: one
 * concrete window (src + start + end) of a master reel.
 *
 * Many differently named moves currently share the exact same window, so the
 * scheduler must not treat them as different animations. Everything in this
 * file exists to make that distinction explicit:
 *
 *   Move  →  VisualSequence  →  Video / Reel
 *
 * Nothing here changes playback: the registry is derived from the existing
 * catalog, so current reels and timings keep working unchanged. New real
 * animation clips can later be declared as sequences without touching the
 * combat engine.
 */

import { FOLLOW_UPS, IDLE_SCENES, MOVES, familyOf, type IdleScene, type Move, type SceneFamily } from "@/lib/scenes";
import { moveKind } from "@/lib/moveKind";
import { PRIMARY_REEL } from "@/lib/reels";
import type { HitKind } from "@/lib/hitConfig";

/** Physical/positional metadata — prepared for a future continuity state machine. */
export type VisualSequence = {
  id: string;
  src: string;
  start: number;
  end: number;
  impact: number;
  kind: HitKind;
  family: SceneFamily;
  attackerState?: string;
  defenderState?: string;
  startPosition?: string;
  endPosition?: string;
  requiresOpponentStanding?: boolean;
  requiresOpponentGrounded?: boolean;
  tags?: string[];
};

/** Semantic move metadata, independent of any footage. */
export type WrestlingMoveDefinition = {
  id: string;
  label: string;
  tier: number;
  kind: HitKind;
  family: SceneFamily;
  allowedVisualSequences: string[];
};

type AnyScene = { id: string; src?: string; start: number; end: number; impact?: number; label?: string };

/** Deterministic key of the physical footage a scene plays. */
export function visualWindowKey(move: { src?: string; start: number; end: number }): string {
  return `${move.src ?? PRIMARY_REEL}:${move.start.toFixed(2)}:${move.end.toFixed(2)}`;
}

const byWindow = new Map<string, VisualSequence>();
const sequenceOfMove = new Map<string, string>();
const movesOfSequence = new Map<string, string[]>();

function register(scene: AnyScene) {
  const key = visualWindowKey(scene);
  let sequence = byWindow.get(key);
  if (!sequence) {
    const family = familyOf(scene);
    const kind = moveKind({ label: scene.label ?? "" });
    sequence = {
      id: `vs-${family}-${byWindow.size.toString(36)}`,
      src: scene.src ?? PRIMARY_REEL,
      start: scene.start,
      end: scene.end,
      impact: scene.impact ?? scene.start + (scene.end - scene.start) * 0.62,
      kind,
      family,
    };
    byWindow.set(key, sequence);
    movesOfSequence.set(sequence.id, []);
  }
  sequenceOfMove.set(scene.id, sequence.id);
  movesOfSequence.get(sequence.id)!.push(scene.id);
}

for (const scene of [...MOVES, ...FOLLOW_UPS] as Move[]) register(scene);
for (const scene of IDLE_SCENES as IdleScene[]) register(scene);

/** Every distinct piece of footage the arena can currently show. */
export const VISUAL_SEQUENCES: Record<string, VisualSequence> = Object.fromEntries(
  Array.from(byWindow.values()).map((s) => [s.id, s]),
);

/** The visual sequence a scene plays. Falls back to its raw window key. */
export function visualSequenceIdOf(scene: { id: string; src?: string; start?: number; end?: number }): string {
  const known = sequenceOfMove.get(scene.id);
  if (known) return known;
  if (typeof scene.start === "number" && typeof scene.end === "number") {
    return byWindow.get(visualWindowKey(scene as AnyScene))?.id ?? visualWindowKey(scene as AnyScene);
  }
  return scene.id;
}

/** Semantic definition of a catalog move, with the footage it may use. */
export function moveDefinition(move: Move): WrestlingMoveDefinition {
  const sequenceId = visualSequenceIdOf(move);
  return {
    id: move.id,
    label: move.label,
    tier: move.tier,
    kind: moveKind(move),
    family: familyOf(move),
    allowedVisualSequences: [sequenceId],
  };
}

/* ------------------------------------------------------------------ */
/* Anti-repetition on the footage itself                               */
/* ------------------------------------------------------------------ */

const recentVisualSequences: string[] = [];
let visualMemory = 8;

export function setVisualMemory(value: number) {
  visualMemory = Math.max(1, Math.round(value));
}

/** Was this footage shown inside the recent window? */
export function isVisualSequenceRecent(id: string, depth = visualMemory): boolean {
  return recentVisualSequences.slice(-Math.max(1, depth)).includes(id);
}

export function lastVisualSequence(): string | null {
  return recentVisualSequences[recentVisualSequences.length - 1] ?? null;
}

export function noteVisualSequence(id: string) {
  recentVisualSequences.push(id);
  if (recentVisualSequences.length > 32) recentVisualSequences.shift();
}

export function visualTrace(count = 8): string[] {
  return recentVisualSequences.slice(-count);
}

/* ------------------------------------------------------------------ */
/* Development diagnostics (debug/admin only, never the live viewer)   */
/* ------------------------------------------------------------------ */

export type VisualStats = {
  totalMoveNames: number;
  uniqueVisualSequences: number;
  uniqueVideoWindows: number;
  duplicateMappings: number;
  averageMovesPerSequence: number;
  mostReused: { id: string; count: number; labels: string[] };
  recent: string[];
};

export function visualSequenceStats(): VisualStats {
  const total = sequenceOfMove.size;
  let most = { id: "—", count: 0, labels: [] as string[] };
  let duplicates = 0;
  for (const [id, members] of movesOfSequence) {
    if (members.length > 1) duplicates += members.length - 1;
    if (members.length > most.count) most = { id, count: members.length, labels: members.slice(0, 6) };
  }
  return {
    totalMoveNames: total,
    uniqueVisualSequences: byWindow.size,
    uniqueVideoWindows: byWindow.size,
    duplicateMappings: duplicates,
    averageMovesPerSequence: byWindow.size > 0 ? Number((total / byWindow.size).toFixed(2)) : 0,
    mostReused: most,
    recent: visualTrace(),
  };
}
