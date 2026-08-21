import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type {
  CombatAssetProductionRecord,
  CombatAssetProductionStatus,
} from "@/lib/combatAssetProduction";

const STATUSES: CombatAssetProductionStatus[] = [
  "planned",
  "uploaded",
  "technical-review",
  "visual-review",
  "approved",
  "registered",
  "rejected",
];

type Row = {
  asset_id: string;
  status: string;
  actual_src: string | null;
  duration: number | null;
  width: number | null;
  height: number | null;
  fps: number | null;
  impact_seconds: number | null;
  mime_type: string | null;
  file_size: number | null;
  technical_warnings: unknown;
  visual_warnings: unknown;
  review_checklist: unknown;
  rejection_reasons: unknown;
  reviewed_at: string | null;
  approved_at: string | null;
  registered_at: string | null;
  updated_at: string | null;
};

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function toRecord(row: Row): CombatAssetProductionRecord {
  const checklistRaw = (row.review_checklist ?? {}) as Record<string, unknown>;
  const reviewChecklist: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(checklistRaw)) reviewChecklist[key] = value === true;
  return {
    assetId: row.asset_id,
    status: (STATUSES.includes(row.status as CombatAssetProductionStatus)
      ? row.status
      : "planned") as CombatAssetProductionStatus,
    actualSrc: row.actual_src ?? undefined,
    duration: row.duration ?? undefined,
    width: row.width ?? undefined,
    height: row.height ?? undefined,
    fps: row.fps ?? undefined,
    measuredImpactSeconds: row.impact_seconds ?? undefined,
    mimeType: row.mime_type ?? undefined,
    fileSizeBytes: row.file_size ?? undefined,
    technicalWarnings: strings(row.technical_warnings),
    visualWarnings: strings(row.visual_warnings),
    reviewChecklist,
    rejectionReasons: strings(row.rejection_reasons),
    reviewedAt: row.reviewed_at ?? undefined,
    approvedAt: row.approved_at ?? undefined,
    registeredAt: row.registered_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

/** Admin/moderator read of the production board. RLS blocks everyone else. */
export const listCombatAssetProduction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CombatAssetProductionRecord[]> => {
    const { data, error } = await context.supabase
      .from("combat_asset_production")
      .select("*")
      .order("asset_id", { ascending: true });
    if (error) throw new Error("Unable to read the production board");
    return ((data ?? []) as Row[]).map(toRecord);
  });

function clean(input: Partial<CombatAssetProductionRecord>) {
  const num = (value: unknown) =>
    typeof value === "number" && Number.isFinite(value) ? value : null;
  const text = (value: unknown, max: number) =>
    typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
  const list = (value: unknown) => strings(value).slice(0, 40).map((item) => item.slice(0, 300));
  return {
    status: STATUSES.includes(input.status as CombatAssetProductionStatus)
      ? (input.status as CombatAssetProductionStatus)
      : "planned",
    actual_src: text(input.actualSrc, 500),
    duration: num(input.duration),
    width: num(input.width),
    height: num(input.height),
    fps: num(input.fps),
    impact_seconds: num(input.measuredImpactSeconds),
    mime_type: text(input.mimeType, 100),
    file_size: num(input.fileSizeBytes),
    technical_warnings: list(input.technicalWarnings),
    visual_warnings: list(input.visualWarnings),
    review_checklist: input.reviewChecklist && typeof input.reviewChecklist === "object"
      ? input.reviewChecklist
      : {},
    rejection_reasons: list(input.rejectionReasons),
    reviewed_at: input.reviewedAt ?? null,
    approved_at: input.approvedAt ?? null,
    registered_at: input.registeredAt ?? null,
  };
}

/** Admin-only write. Any non-admin caller is refused before the update runs. */
export const saveCombatAssetProduction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: CombatAssetProductionRecord) => {
    if (!input || typeof input.assetId !== "string" || !input.assetId.trim())
      throw new Error("Invalid asset id");
    return { ...input, assetId: input.assetId.trim().slice(0, 120) };
  })
  .handler(async ({ data, context }): Promise<CombatAssetProductionRecord> => {
    const { data: isAdmin } = await context.supabase.rpc("current_user_has_role", {
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Administrator role required");

    const payload = {
      asset_id: data.assetId,
      ...clean(data),
      updated_at: new Date().toISOString(),
      updated_by: context.userId,
    };
    const { data: row, error } = await context.supabase
      .from("combat_asset_production")
      .upsert(payload, { onConflict: "asset_id" })
      .select("*")
      .single();
    if (error) throw new Error("Unable to save the production record");
    return toRecord(row as Row);
  });
