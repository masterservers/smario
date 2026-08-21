import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** One shareable "watch live" link. Never grants console access. */
export type LiveSession = {
  id: string;
  token: string;
  label: string;
  lang: string;
  allow_gifts: boolean;
  is_active: boolean;
  expires_at: string | null;
  created_by_email: string | null;
  created_at: string;
};

const COLUMNS =
  "id, token, label, lang, allow_gifts, is_active, expires_at, created_by_email, created_at";

/** Throws unless the caller is staff (admin or moderator, 2FA already enforced). */
async function assertStaff(context: { supabase: any; userId: string }) {
  const [{ data: isAdmin }, { data: isModerator }] = await Promise.all([
    context.supabase.rpc("current_user_has_role", { _role: "admin" }),
    context.supabase.rpc("current_user_has_role", { _role: "moderator" }),
  ]);
  if (!isAdmin && !isModerator) throw new Error("Forbidden");
}

function newToken() {
  const bytes = new Uint8Array(9);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 14);
}

/** Every session link, newest first — staff only. */
export const listLiveSessions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("live_sessions")
      .select(COLUMNS)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return (data ?? []) as LiveSession[];
  });

/** Creates a viewing link. Viewers get the arena only, never the console. */
export const createLiveSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { label: string; lang: string; allowGifts: boolean; days: number }) => {
    const label = String(input?.label ?? "").trim().slice(0, 60) || "Live session";
    const lang = ["en", "de", "sr", "ro", "ru"].includes(String(input?.lang))
      ? String(input.lang)
      : "en";
    const days = Number.isFinite(input?.days) ? Math.min(365, Math.max(0, Number(input.days))) : 7;
    return { label, lang, allowGifts: Boolean(input?.allowGifts), days };
  })
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const expires =
      data.days > 0 ? new Date(Date.now() + data.days * 86_400_000).toISOString() : null;
    const { data: row, error } = await supabaseAdmin
      .from("live_sessions")
      .insert({
        token: newToken(),
        label: data.label,
        lang: data.lang,
        allow_gifts: data.allowGifts,
        expires_at: expires,
        created_by: context.userId,
        created_by_email: (context.claims as { email?: string } | null)?.email ?? null,
      })
      .select(COLUMNS)
      .single();
    if (error) throw new Error(error.message);
    return row as LiveSession;
  });

/** Pauses, resumes or changes the permissions of an existing link. */
export const updateLiveSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; isActive?: boolean; allowGifts?: boolean }) => {
    if (typeof input?.id !== "string" || !input.id) throw new Error("Invalid session");
    return {
      id: input.id,
      ...(typeof input.isActive === "boolean" ? { isActive: input.isActive } : {}),
      ...(typeof input.allowGifts === "boolean" ? { allowGifts: input.allowGifts } : {}),
    };
  })
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch = {
      ...(data.isActive !== undefined ? { is_active: data.isActive } : {}),
      ...(data.allowGifts !== undefined ? { allow_gifts: data.allowGifts } : {}),
    };
    const { data: row, error } = await supabaseAdmin
      .from("live_sessions")
      .update(patch)
      .eq("id", data.id)
      .select(COLUMNS)
      .single();
    if (error) throw new Error(error.message);
    return row as LiveSession;
  });

/** Revokes a link for good. */
export const deleteLiveSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (typeof input?.id !== "string" || !input.id) throw new Error("Invalid session");
    return { id: input.id };
  })
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("live_sessions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
