import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Persists the outfit (suit / ring gear) chosen for each fighter on the running
 * match, so a reload or a restart brings the ring back exactly as it was.
 * Only staff may write; everyone reads through the public row.
 */
export const saveMatchOutfits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { matchId: string; ru: string; us: string }) => ({
    matchId: String(input?.matchId ?? ""),
    ru: input?.ru === "gear" ? "gear" : "suit",
    us: input?.us === "gear" ? "gear" : "suit",
  }))
  .handler(async ({ data, context }) => {
    if (!data.matchId) return { ok: false as const };
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    const { data: isMod } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "moderator",
    });
    if (!isAdmin && !isMod) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("match_outfits")
      .upsert(
        { match_id: data.matchId, ru: data.ru, us: data.us, updated_at: new Date().toISOString() },
        { onConflict: "match_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
