import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type StaffRole = "admin" | "moderator" | null;

export type AuditEntry = {
  id: string;
  actor_email: string | null;
  section: string;
  action: string;
  /** Human-readable summary of the values that changed. */
  details: string;
  created_at: string;
};

/** Which staff role (if any) the signed-in user holds. */
export const getMyStaffRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId, claims } = context;
    const [{ data: isAdmin }, { data: isModerator }] = await Promise.all([
      supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
      supabase.rpc("has_role", { _user_id: userId, _role: "moderator" }),
    ]);
    const role: StaffRole = isAdmin ? "admin" : isModerator ? "moderator" : null;
    const email = (claims as { email?: string } | null)?.email ?? null;
    return { role, email, userId };
  });

/** Records one admin-console change: who, when and exactly what changed. */
export const logAdminChange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { section: string; action: string; details?: string }) => {
    if (typeof input?.section !== "string" || !input.section.trim() || input.section.length > 60) {
      throw new Error("Invalid section");
    }
    if (typeof input?.action !== "string" || !input.action.trim() || input.action.length > 120) {
      throw new Error("Invalid action");
    }
    return {
      section: input.section.trim(),
      action: input.action.trim(),
      details: typeof input.details === "string" ? input.details.slice(0, 1000) : "",
    };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const email = (claims as { email?: string } | null)?.email ?? null;
    // RLS keeps this insert to admins/moderators writing under their own id.
    const { error } = await supabase.from("admin_audit_log").insert({
      actor_id: userId,
      actor_email: email,
      section: data.section,
      action: data.action,
      details: { text: data.details },
    });
    if (error) throw new Error("Unable to record the change");
    return { ok: true };
  });

/** Latest audit entries; RLS limits the read to admins and moderators. */
export const listAuditLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AuditEntry[]> => {
    const { data, error } = await context.supabase
      .from("admin_audit_log")
      .select("id, actor_email, section, action, details, created_at")
      .order("created_at", { ascending: false })
      .limit(80);
    if (error) return [];
    return (data ?? []).map((row) => {
      const raw = row.details as { text?: unknown } | null;
      const text =
        raw && typeof raw === "object" && typeof raw.text === "string"
          ? raw.text
          : JSON.stringify(row.details ?? {});
      return {
        id: row.id,
        actor_email: row.actor_email,
        section: row.section,
        action: row.action,
        details: text,
        created_at: row.created_at,
      };
    });
  });

/**
 * One-time bootstrap: the first signed-in account can claim the admin role
 * while no administrator exists yet. Once one exists this always refuses.
 */
export const claimFirstAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count, error } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if (error) throw new Error("Unable to verify existing administrators");
    if ((count ?? 0) > 0) return { granted: false as const };
    const { error: insertError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: context.userId, role: "admin" });
    if (insertError) throw new Error("Unable to grant the admin role");
    const email = (context.claims as { email?: string } | null)?.email ?? null;
    await supabaseAdmin.from("admin_audit_log").insert({
      actor_id: context.userId,
      actor_email: email,
      section: "roles",
      action: "bootstrap admin",
      details: { text: "First administrator claimed the console" },
    });
    return { granted: true as const };
  });

export type SourceProbe = {
  ok: boolean;
  status: number | null;
  latencyMs: number;
  message: string;
};

/**
 * Read-only probe of a TikTok live/relay URL. It never touches the running
 * match — it only performs an outbound GET and reports what came back.
 */
export const probeTikTokSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { url: string }) => {
    let parsed: URL;
    try {
      parsed = new URL(input?.url ?? "");
    } catch {
      throw new Error("Enter a full URL, including https://");
    }
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      throw new Error("Only http(s) URLs can be tested");
    }
    return { url: parsed.toString() };
  })
  .handler(async ({ data, context }): Promise<SourceProbe> => {
    const { data: isStaff } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    const { data: isModerator } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "moderator",
    });
    if (!isStaff && !isModerator) throw new Error("Forbidden");

    const started = Date.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(data.url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
      });
      clearTimeout(timer);
      return {
        ok: response.ok,
        status: response.status,
        latencyMs: Date.now() - started,
        message: response.ok
          ? "Source reachable"
          : `Source answered ${response.status} ${response.statusText}`,
      };
    } catch (error) {
      return {
        ok: false,
        status: null,
        latencyMs: Date.now() - started,
        message: error instanceof Error ? error.message : "Request failed",
      };
    }
  });
