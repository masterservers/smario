/**
 * Visual cluster audit layer.
 *
 *   Move  →  VisualSequence  →  VisualCluster  →  Video / Reel
 *
 * A visual *sequence* is one exact window (src + start + end). Two windows that
 * differ by a tenth of a second on the same reel show, to a viewer, the very
 * same action. This layer groups strongly overlapping, semantically compatible
 * windows into **clusters**, so we can measure *perceived* variety instead of
 * counting timecodes.
 *
 * This file is classification and measurement only: it never changes playback.
 * The anti-repeat helpers at the bottom are prepared but not wired into the
 * scheduler.
 */

import type { SceneFamily } from "@/lib/scenes";
import type { HitKind } from "@/lib/hitConfig";
import {
  VISUAL_SEQUENCES,
  sceneLabel,
  sequenceMembers,
  visualSequenceIdOf,
  type VisualSequence,
} from "@/lib/visualSequences";

export const VISUAL_CLUSTER_CONFIG = {
  /** Overlap at or above this ratio means "same underlying action". */
  sameClusterOverlap: 0.8,
  /** Overlap at or above this ratio (but below the one above) means "related". */
  relatedOverlap: 0.6,
};

export type VisualCluster = {
  id: string;
  reel: string;
  memberSequenceIds: string[];
  startMin: number;
  endMax: number;
  representativeSequenceId: string;
  family: SceneFamily;
  kind: HitKind;
  /** Mean overlap ratio between merged members (1 for singleton clusters). */
  confidence: number;
};

/** How much of the shorter window is contained inside the other one. */
export function overlapRatio(
  a: Pick<VisualSequence, "src" | "start" | "end">,
  b: Pick<VisualSequence, "src" | "start" | "end">,
): number {
  if (a.src !== b.src) return 0;
  const intersection = Math.max(0, Math.min(a.end, b.end) - Math.max(a.start, b.start));
  const minDuration = Math.min(a.end - a.start, b.end - b.start);
  return minDuration > 0 ? intersection / minDuration : 0;
}

/** Overlap alone never merges: the two windows must also read as the same act. */
function semanticallyCompatible(a: VisualSequence, b: VisualSequence): boolean {
  return a.kind === b.kind || a.family === b.family;
}

/* ------------------------------------------------------------------ */
/* Deterministic clustering                                            */
/* ------------------------------------------------------------------ */

/** Sorted by reel then start: the traversal order fixes every cluster id. */
const ordered = Object.values(VISUAL_SEQUENCES).slice().sort((a, b) => {
  if (a.src !== b.src) return a.src < b.src ? -1 : 1;
  if (a.start !== b.start) return a.start - b.start;
  return a.end - b.end;
});

const parent = new Map<string, string>();
function find(id: string): string {
  let root = id;
  while (parent.get(root) !== root) root = parent.get(root)!;
  let cursor = id;
  while (parent.get(cursor) !== root) {
    const next = parent.get(cursor)!;
    parent.set(cursor, root);
    cursor = next;
  }
  return root;
}
const rank = new Map<string, number>();
/** Live span of each cluster root, used to stop chain-merging. */
const spanOf = new Map<string, { start: number; end: number; longest: number }>();

/**
 * A → B and B → C can each overlap strongly while A and C show nothing in
 * common. Without a guard, a chain of shifted windows collapses a whole reel
 * into one "cluster". A merge is only accepted while the resulting span stays
 * close to the length of a single action.
 */
const SPAN_GUARD = 1.6;

function union(a: string, b: string): boolean {
  const ra = find(a);
  const rb = find(b);
  if (ra === rb) return false;
  const sa = spanOf.get(ra)!;
  const sb = spanOf.get(rb)!;
  const start = Math.min(sa.start, sb.start);
  const end = Math.max(sa.end, sb.end);
  const longest = Math.max(sa.longest, sb.longest);
  if (end - start > longest * SPAN_GUARD) return false;
  // Keep the earlier sequence (traversal order) as the root for determinism.
  const merged = { start, end, longest };
  if ((rank.get(ra) ?? 0) <= (rank.get(rb) ?? 0)) {
    parent.set(rb, ra);
    spanOf.set(ra, merged);
  } else {
    parent.set(ra, rb);
    spanOf.set(rb, merged);
  }
  return true;
}

ordered.forEach((sequence, index) => {
  parent.set(sequence.id, sequence.id);
  rank.set(sequence.id, index);
  spanOf.set(sequence.id, {
    start: sequence.start,
    end: sequence.end,
    longest: sequence.end - sequence.start,
  });
});

export type SequencePair = {
  a: string;
  b: string;
  ratio: number;
  reason: "strong-overlap" | "near-duplicate" | "suspicious";
};

const pairs: SequencePair[] = [];

for (let i = 0; i < ordered.length; i++) {
  const a = ordered[i]!;
  for (let j = i + 1; j < ordered.length; j++) {
    const b = ordered[j]!;
    if (b.src !== a.src) break; // sorted by reel
    if (b.start >= a.end) break; // sorted by start: no further overlap possible
    const ratio = overlapRatio(a, b);
    if (ratio < VISUAL_CLUSTER_CONFIG.relatedOverlap) continue;
    const compatible = semanticallyCompatible(a, b);
    if (ratio >= VISUAL_CLUSTER_CONFIG.sameClusterOverlap) {
      if (compatible) {
        const merged = union(a.id, b.id);
        // Refused by the span guard: still worth reporting as related footage.
        pairs.push({ a: a.id, b: b.id, ratio, reason: merged ? "strong-overlap" : "near-duplicate" });
      } else {
        // Metadata conflict (e.g. punch vs throw): flag instead of merging.
        pairs.push({ a: a.id, b: b.id, ratio, reason: "suspicious" });
      }
    } else {
      pairs.push({ a: a.id, b: b.id, ratio, reason: "near-duplicate" });
    }
  }
}

const groups = new Map<string, VisualSequence[]>();
for (const sequence of ordered) {
  const root = find(sequence.id);
  const list = groups.get(root) ?? [];
  list.push(sequence);
  groups.set(root, list);
}

const kindCounters: Record<string, number> = {};
const clusters: VisualCluster[] = [];
const clusterOfSequence = new Map<string, string>();

for (const [root, members] of groups) {
  const representative = members[0]!;
  const index = kindCounters[representative.kind] ?? 0;
  kindCounters[representative.kind] = index + 1;
  const ratios: number[] = [];
  for (let i = 0; i < members.length; i++)
    for (let j = i + 1; j < members.length; j++)
      ratios.push(overlapRatio(members[i]!, members[j]!));
  const cluster: VisualCluster = {
    id: `vc-${representative.kind}-${String(index).padStart(2, "0")}`,
    reel: representative.src,
    memberSequenceIds: members.map((m) => m.id),
    startMin: Math.min(...members.map((m) => m.start)),
    endMax: Math.max(...members.map((m) => m.end)),
    representativeSequenceId: root,
    family: representative.family,
    kind: representative.kind,
    confidence: ratios.length
      ? Number((ratios.reduce((s, r) => s + r, 0) / ratios.length).toFixed(2))
      : 1,
  };
  clusters.push(cluster);
  for (const member of members) clusterOfSequence.set(member.id, cluster.id);
}

clusters.sort((a, b) => (a.reel === b.reel ? a.startMin - b.startMin : a.reel < b.reel ? -1 : 1));

export const VISUAL_CLUSTERS: VisualCluster[] = clusters;

const clusterById = new Map(clusters.map((c) => [c.id, c]));

export function visualClusterIdOf(sequenceId: string): string {
  return clusterOfSequence.get(sequenceId) ?? sequenceId;
}

export function visualClusterOfMove(move: { id: string; src?: string; start?: number; end?: number }):
  | VisualCluster
  | undefined {
  return clusterById.get(visualClusterIdOf(visualSequenceIdOf(move)));
}

/* ------------------------------------------------------------------ */
/* Cluster anti-repeat (prepared, not enabled in the scheduler yet)    */
/* ------------------------------------------------------------------ */

const recentClusters: string[] = [];
let clusterMemory = 4;

export function setVisualClusterMemory(value: number) {
  clusterMemory = Math.max(1, Math.round(value));
}

export function noteVisualCluster(id: string) {
  recentClusters.push(id);
  if (recentClusters.length > 32) recentClusters.shift();
}

export function isVisualClusterRecent(id: string, depth = clusterMemory): boolean {
  return recentClusters.slice(-Math.max(1, depth)).includes(id);
}

export function lastVisualCluster(): string | null {
  return recentClusters[recentClusters.length - 1] ?? null;
}

export function visualClusterTrace(count = 8): string[] {
  return recentClusters.slice(-count);
}

/* ------------------------------------------------------------------ */
/* True-variety report (debug/admin only)                              */
/* ------------------------------------------------------------------ */

export type ClusterReportRow = {
  id: string;
  reel: string;
  span: string;
  sequences: number;
  names: number;
  labels: string[];
  kinds: string[];
  families: string[];
  confidence: number;
};

export type TrueVarietyReport = {
  totalSceneNames: number;
  uniqueVisualSequences: number;
  uniqueVisualClusters: number;
  exactDuplicateMappings: number;
  strongOverlapPairs: number;
  nearDuplicatePairs: number;
  suspiciousPairs: number;
  averageNamesPerCluster: number;
  averageSequencesPerCluster: number;
  largestClusterSize: number;
  clusterPerNameRatio: number;
  clusterPerSequenceRatio: number;
  perFamily: Record<string, number>;
  perKind: Record<string, number>;
  topClusters: ClusterReportRow[];
};

function reelName(src: string): string {
  const match = /([^/]+?)(\.[a-z0-9]+)*$/i.exec(src);
  return match?.[1] ?? src;
}

function namesOf(cluster: VisualCluster): string[] {
  return cluster.memberSequenceIds.flatMap((id) => sequenceMembers(id));
}

export function clusterRow(cluster: VisualCluster): ClusterReportRow {
  const names = namesOf(cluster);
  const sequences = cluster.memberSequenceIds.map((id) => VISUAL_SEQUENCES[id]!);
  return {
    id: cluster.id,
    reel: reelName(cluster.reel),
    span: `${cluster.startMin.toFixed(2)}s–${cluster.endMax.toFixed(2)}s`,
    sequences: cluster.memberSequenceIds.length,
    names: names.length,
    labels: names.slice(0, 8).map((id) => sceneLabel(id)),
    kinds: Array.from(new Set(sequences.map((s) => s.kind))),
    families: Array.from(new Set(sequences.map((s) => s.family))),
    confidence: cluster.confidence,
  };
}

export function trueVarietyReport(topN = 10): TrueVarietyReport {
  let totalNames = 0;
  let exactDuplicates = 0;
  for (const sequence of ordered) {
    const members = sequenceMembers(sequence.id).length;
    totalNames += members;
    if (members > 1) exactDuplicates += members - 1;
  }
  const perFamily: Record<string, number> = {};
  const perKind: Record<string, number> = {};
  for (const cluster of clusters) {
    perFamily[cluster.family] = (perFamily[cluster.family] ?? 0) + 1;
    perKind[cluster.kind] = (perKind[cluster.kind] ?? 0) + 1;
  }
  const rows = clusters
    .map(clusterRow)
    .sort((a, b) => b.names - a.names || b.sequences - a.sequences)
    .slice(0, topN);
  const count = clusters.length || 1;
  return {
    totalSceneNames: totalNames,
    uniqueVisualSequences: ordered.length,
    uniqueVisualClusters: clusters.length,
    exactDuplicateMappings: exactDuplicates,
    strongOverlapPairs: pairs.filter((p) => p.reason === "strong-overlap").length,
    nearDuplicatePairs: pairs.filter((p) => p.reason === "near-duplicate").length,
    suspiciousPairs: pairs.filter((p) => p.reason === "suspicious").length,
    averageNamesPerCluster: Number((totalNames / count).toFixed(2)),
    averageSequencesPerCluster: Number((ordered.length / count).toFixed(2)),
    largestClusterSize: clusters.reduce((m, c) => Math.max(m, c.memberSequenceIds.length), 0),
    clusterPerNameRatio: Number(((clusters.length / (totalNames || 1)) * 100).toFixed(1)),
    clusterPerSequenceRatio: Number(((clusters.length / (ordered.length || 1)) * 100).toFixed(1)),
    perFamily,
    perKind,
    topClusters: rows,
  };
}

/** Pairs flagged as near-duplicate or suspicious, for manual inspection. */
export function sequencePairs(reason?: SequencePair["reason"]): SequencePair[] {
  return reason ? pairs.filter((p) => p.reason === reason) : pairs.slice();
}

/** ASCII timeline of clusters on one reel — development visualisation only. */
export function reelTimeline(reel: string, width = 56): string[] {
  const onReel = clusters.filter((c) => c.reel === reel);
  if (onReel.length === 0) return [];
  const max = Math.max(...onReel.map((c) => c.endMax));
  const lines = [`0s ${"-".repeat(Math.max(0, width - 8))} ${max.toFixed(0)}s`];
  for (const cluster of onReel) {
    const from = Math.round((cluster.startMin / max) * width);
    const to = Math.max(from + 1, Math.round((cluster.endMax / max) * width));
    lines.push(`${" ".repeat(from)}[${cluster.id}]`.padEnd(to) + ` ${namesOf(cluster).length}n`);
  }
  return lines;
}

/** Distinct reels that currently carry footage. */
export const REELS_IN_USE: string[] = Array.from(new Set(ordered.map((s) => s.src)));
