/**
 * Combat asset PRODUCTION layer.
 *
 *   PlannedCombatAsset (specification, combatAssetManifest.ts)
 *              +
 *   CombatAssetProductionRecord (the real file that was produced)
 *              ↓
 *   CombatClip (only after an explicit registration action)
 *
 * The manifest is never mutated by this module: a delivered file must not be
 * allowed to rewrite the contract it was supposed to satisfy. Nothing here
 * touches the live scheduler, the arena, gifts, scoring or the referee.
 */

import type { CombatClip } from "@/lib/combatClips";
import type { PlannedCombatAsset } from "@/lib/combatAssetManifest";
import { PLANNED_COMBAT_ASSETS, plannedAsset } from "@/lib/combatAssetManifest";

export type CombatAssetProductionStatus =
  | "planned"
  | "uploaded"
  | "technical-review"
  | "visual-review"
  | "approved"
  | "registered"
  | "rejected";

export type CombatAssetProductionRecord = {
  assetId: string;
  status: CombatAssetProductionStatus;

  actualSrc?: string;

  duration?: number;
  width?: number;
  height?: number;
  fps?: number;

  measuredImpactSeconds?: number;

  fileSizeBytes?: number;
  mimeType?: string;

  technicalWarnings: string[];
  visualWarnings: string[];
  /** Reviewer checklist answers, keyed by REVIEW_CHECKLIST item id. */
  reviewChecklist: Record<string, boolean>;
  rejectionReasons: string[];

  reviewedAt?: string;
  approvedAt?: string;
  registeredAt?: string;
  updatedAt?: string;
};

export function emptyProductionRecord(assetId: string): CombatAssetProductionRecord {
  return {
    assetId,
    status: "planned",
    technicalWarnings: [],
    visualWarnings: [],
    reviewChecklist: {},
    rejectionReasons: [],
  };
}

/* ------------------------------------------------------------------ */
/* Review checklist                                                     */
/* ------------------------------------------------------------------ */

export const REVIEW_CHECKLIST = [
  { id: "fighters", label: "correct fighters" },
  { id: "proportions", label: "correct proportions (Putin ~90% of Trump)" },
  { id: "costumes", label: "correct costumes" },
  { id: "ring", label: "correct ring / lighting / crowd" },
  { id: "camera", label: "correct wide hard-camera framing" },
  { id: "start-pose", label: "usable start pose" },
  { id: "end-pose", label: "usable end pose" },
  { id: "clear-action", label: "clear action" },
  { id: "clear-impact", label: "clear impact" },
  { id: "no-artifacts", label: "no major motion artifacts" },
] as const;

export const REJECTION_REASONS = [
  "identity drift",
  "wrong camera",
  "bad start pose",
  "bad end pose",
  "weak impact",
  "broken limb motion",
  "wrong ring",
  "duration unusable",
  "encoding artifacts",
] as const;

export function checklistComplete(record: CombatAssetProductionRecord): boolean {
  return REVIEW_CHECKLIST.every((item) => record.reviewChecklist[item.id] === true);
}

export function checklistMissing(record: CombatAssetProductionRecord): string[] {
  return REVIEW_CHECKLIST.filter((item) => record.reviewChecklist[item.id] !== true).map(
    (item) => item.label,
  );
}

/* ------------------------------------------------------------------ */
/* Technical validation                                                 */
/* ------------------------------------------------------------------ */

export type TechnicalProbe = {
  loaded: boolean;
  duration?: number;
  width?: number;
  height?: number;
  fileSizeBytes?: number;
  mimeType?: string;
  error?: string;
};

export type TechnicalValidation = {
  ok: boolean;
  /** Blocking problems: approval is impossible while any of these exist. */
  errors: string[];
  warnings: string[];
};

/**
 * Judge what a browser can actually determine about a delivered file. Files
 * are never silently corrected — every deviation is reported.
 */
export function validateTechnical(
  asset: PlannedCombatAsset,
  probe: TechnicalProbe,
): TechnicalValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!probe.loaded) {
    errors.push(probe.error ? `media did not load: ${probe.error}` : "media did not load");
    return { ok: false, errors, warnings };
  }
  if (!probe.duration || !Number.isFinite(probe.duration) || probe.duration <= 0)
    errors.push("duration is not readable");
  if (!probe.width || !probe.height) errors.push("video has zero dimensions");

  const [min, max] = asset.targetDurationSeconds;
  if (probe.duration && probe.duration > 0) {
    const tolerance = 0.5;
    if (probe.duration < min - tolerance || probe.duration > max + tolerance) {
      warnings.push(
        `TARGET: ${min}–${max}s · ACTUAL: ${probe.duration.toFixed(2)}s · WARNING: duration outside specification`,
      );
    } else if (probe.duration < min || probe.duration > max) {
      warnings.push(
        `duration ${probe.duration.toFixed(2)}s is just outside the ${min}–${max}s target`,
      );
    }
  }
  if (probe.width && probe.height) {
    const ratio = probe.width / probe.height;
    if (ratio < 1.4) warnings.push(`aspect ratio ${ratio.toFixed(2)} is not a wide televised shot`);
    if (probe.height < 540) warnings.push(`height ${probe.height}px is below the reel resolution`);
  }
  if (probe.mimeType && !/^video\/(webm|mp4)/.test(probe.mimeType))
    warnings.push(`unusual MIME type: ${probe.mimeType}`);
  if (probe.fileSizeBytes && probe.fileSizeBytes > 25 * 1024 * 1024)
    warnings.push(`file is ${(probe.fileSizeBytes / 1024 / 1024).toFixed(1)} MB — heavy for playback`);

  return { ok: errors.length === 0, errors, warnings };
}

/** Attack clips must have a measured impact; continuity clips must not need one. */
export function requiresImpact(asset: PlannedCombatAsset): boolean {
  return asset.role === "attack" || asset.role === "ko";
}

/* ------------------------------------------------------------------ */
/* Gates                                                                */
/* ------------------------------------------------------------------ */

export type Gate = { allowed: boolean; blockers: string[] };

export function canApprove(
  asset: PlannedCombatAsset,
  record: CombatAssetProductionRecord,
  validation: TechnicalValidation | null,
): Gate {
  const blockers: string[] = [];
  if (record.status === "rejected") blockers.push("asset is rejected");
  if (!record.actualSrc) blockers.push("no video attached");
  if (!validation || !validation.ok) blockers.push("technical validation has not passed");
  if (!checklistComplete(record))
    blockers.push(`review checklist incomplete: ${checklistMissing(record).join(", ")}`);
  if (requiresImpact(asset) && typeof record.measuredImpactSeconds !== "number")
    blockers.push("impact timestamp not calibrated");
  return { allowed: blockers.length === 0, blockers };
}

export function canRegister(
  asset: PlannedCombatAsset,
  record: CombatAssetProductionRecord,
  duplicates: DuplicateReport,
): Gate {
  const blockers: string[] = [];
  if (record.status === "rejected") blockers.push("asset is rejected");
  else if (record.status === "registered") blockers.push("already registered");
  else if (record.status !== "approved") blockers.push("asset is not approved");
  if (!record.actualSrc) blockers.push("no video attached");
  if (!record.duration) blockers.push("duration unknown");
  if (requiresImpact(asset) && typeof record.measuredImpactSeconds !== "number")
    blockers.push("impact timestamp not calibrated");
  if (duplicates.duplicateAssetId) blockers.push("this asset id is already registered");
  if (duplicates.duplicateSrc)
    blockers.push(`this file is already registered as ${duplicates.duplicateSrc}`);
  return { allowed: blockers.length === 0, blockers };
}

export type DuplicateReport = {
  duplicateAssetId: boolean;
  /** Id of another registered record pointing at the same file, if any. */
  duplicateSrc: string | null;
};

export function detectDuplicates(
  record: CombatAssetProductionRecord,
  all: CombatAssetProductionRecord[],
  registeredClipIds: string[],
): DuplicateReport {
  const duplicateAssetId = registeredClipIds.includes(productionClipId(record.assetId));
  const src = (record.actualSrc ?? "").trim();
  const clash = src
    ? all.find(
        (other) =>
          other.assetId !== record.assetId &&
          other.status === "registered" &&
          (other.actualSrc ?? "").trim() === src,
      )
    : undefined;
  return { duplicateAssetId, duplicateSrc: clash ? clash.assetId : null };
}

/* ------------------------------------------------------------------ */
/* Registration: planned spec + real file → CombatClip                  */
/* ------------------------------------------------------------------ */

/** Registered clips are namespaced so they can never collide with legacy ids. */
export function productionClipId(assetId: string): string {
  return `prod-${assetId}`;
}

export function buildCombatClipFromProduction(
  asset: PlannedCombatAsset,
  record: CombatAssetProductionRecord,
): CombatClip {
  const duration = record.duration ?? asset.targetDurationSeconds[0];
  const impact =
    typeof record.measuredImpactSeconds === "number"
      ? record.measuredImpactSeconds
      : asset.impactTargetSeconds;
  return {
    id: productionClipId(asset.id),
    src: record.actualSrc!,
    duration,
    impact,
    sourceType: asset.sourceType,
    role: asset.role,
    moveFamily: asset.family,
    kind: asset.kind,
    moveIds: [...asset.mappedMoveIds],
    tier: asset.tier,
    attackerStartState: asset.attackerStartState,
    attackerEndState: asset.attackerEndState,
    defenderStartState: asset.defenderStartState,
    defenderEndState: asset.defenderEndState,
    locationStart: asset.locationStart,
    locationEnd: asset.locationEnd,
    requiresGroundedOpponent: asset.requiresGroundedOpponent,
    requiresCorner: asset.requiresCorner,
    requiresRopes: asset.requiresRopes,
    tags: ["production", asset.priority, asset.batch],
    enabled: true,
  };
}

/* ------------------------------------------------------------------ */
/* Health + statistics                                                  */
/* ------------------------------------------------------------------ */

export type AssetHealth =
  | "missing"
  | "invalid"
  | "review-needed"
  | "approved"
  | "registered"
  | "rejected"
  | "broken";

export function assetHealth(
  record: CombatAssetProductionRecord | undefined,
  probeOk: boolean | null,
): AssetHealth {
  if (!record || !record.actualSrc) return "missing";
  if (record.status === "rejected") return "rejected";
  if (record.status === "registered") return probeOk === false ? "broken" : "registered";
  if (probeOk === false) return "invalid";
  if (record.status === "approved") return "approved";
  return "review-needed";
}

export type ProductionStats = {
  planned: number;
  uploaded: number;
  inReview: number;
  approved: number;
  registered: number;
  rejected: number;
  byPriority: Record<"P0" | "P1" | "P2", { registered: number; total: number }>;
};

export function productionStats(records: CombatAssetProductionRecord[]): ProductionStats {
  const map = new Map(records.map((record) => [record.assetId, record]));
  const stats: ProductionStats = {
    planned: PLANNED_COMBAT_ASSETS.length,
    uploaded: 0,
    inReview: 0,
    approved: 0,
    registered: 0,
    rejected: 0,
    byPriority: {
      P0: { registered: 0, total: 0 },
      P1: { registered: 0, total: 0 },
      P2: { registered: 0, total: 0 },
    },
  };
  for (const asset of PLANNED_COMBAT_ASSETS) {
    const record = map.get(asset.id);
    stats.byPriority[asset.priority].total += 1;
    if (!record) continue;
    if (record.actualSrc) stats.uploaded += 1;
    if (record.status === "technical-review" || record.status === "visual-review")
      stats.inReview += 1;
    if (record.status === "approved") stats.approved += 1;
    if (record.status === "registered") {
      stats.registered += 1;
      stats.byPriority[asset.priority].registered += 1;
    }
    if (record.status === "rejected") stats.rejected += 1;
  }
  return stats;
}

/** Semantic move names actually covered by REGISTERED production footage. */
export function registeredCoverage(
  records: CombatAssetProductionRecord[],
  allMoveIds: string[],
): { moves: number; ratio: number } {
  const known = new Set(allMoveIds);
  const covered = new Set<string>();
  for (const record of records) {
    if (record.status !== "registered") continue;
    const asset = plannedAsset(record.assetId);
    if (!asset) continue;
    for (const moveId of asset.mappedMoveIds) if (known.has(moveId)) covered.add(moveId);
  }
  const total = allMoveIds.length || 1;
  return { moves: covered.size, ratio: Math.round((covered.size / total) * 1000) / 10 };
}

export type CoverageDelta = {
  beforeRatio: number;
  afterRatio: number;
  gainedMoves: number;
};

/** What registering `assetId` would add on top of what is registered today. */
export function coverageDelta(
  records: CombatAssetProductionRecord[],
  allMoveIds: string[],
  assetId: string,
): CoverageDelta {
  const before = registeredCoverage(records, allMoveIds);
  const simulated = records.map((record) =>
    record.assetId === assetId ? { ...record, status: "registered" as const } : record,
  );
  if (!simulated.some((record) => record.assetId === assetId))
    simulated.push({ ...emptyProductionRecord(assetId), status: "registered" });
  const after = registeredCoverage(simulated, allMoveIds);
  return {
    beforeRatio: before.ratio,
    afterRatio: after.ratio,
    gainedMoves: after.moves - before.moves,
  };
}
