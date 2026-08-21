import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { reduceEvents, type GiftEvent, type Side } from "@/lib/battle";

/** Returns (or opens) the live match. Match lifecycle runs server-side only. */
export const getCurrentMatch = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("current_match");
  if (error) throw new Error("Unable to load the live match");
  const match = Array.isArray(data) ? data[0] : data;
  if (!match) throw new Error("Unable to load the live match");
  return { id: match.id as string, round: (match.round as number) ?? 1 };
});

/**
 * Closes a match and opens the next round. The knockout is recomputed from the
 * stored gift events, so a client cannot declare an arbitrary winner.
 */
export const finishMatch = createServerFn({ method: "POST" })
  .inputValidator((input: { matchId: string; winner: Side }) => {
    if (
      typeof input?.matchId !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(input.matchId) ||
      (input.winner !== "ru" && input.winner !== "us")
    ) {
      throw new Error("Invalid request");
    }
    return { matchId: input.matchId, winner: input.winner };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: rows, error: rowsError } = await supabaseAdmin
      .from("gift_events")
      .select("id, side, gift, value, sender, created_at")
      .eq("match_id", data.matchId)
      .order("created_at", { ascending: true })
      .limit(1000);
    if (rowsError) throw new Error("Unable to verify the match");

    const state = reduceEvents((rows ?? []) as GiftEvent[]);
    if (state.ko !== data.winner) {
      // No knockout yet (or a different winner): keep the match running.
      const { data: current } = await supabaseAdmin.rpc("current_match");
      const match = Array.isArray(current) ? current[0] : current;
      return { id: match?.id as string, round: (match?.round as number) ?? 1 };
    }

    const { data: next, error } = await supabaseAdmin.rpc("finish_match", {
      p_match: data.matchId,
      p_winner: state.ko,
    });
    if (error) throw new Error("Unable to finish the match");
    const match = Array.isArray(next) ? next[0] : next;
    return { id: match?.id as string, round: (match?.round as number) ?? 1 };
  });

/**
 * Admin-only hard reset: closes every open match, wipes its gift feed and
 * opens a brand new fight at round 1 (score, HP and round counter back to zero).
 */
export const resetMatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { clearHistory?: boolean } | undefined) => ({
    clearHistory: Boolean(input?.clearHistory),
  }))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("current_user_has_role", { _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Which matches are we clearing? Everything when the admin asks for a full
    // wipe, otherwise just the fights that are still open.
    const { data: openRows } = await supabaseAdmin
      .from("matches")
      .select("id")
      .is("ended_at", null);
    const openIds = (openRows ?? []).map((r) => r.id as string);

    if (data.clearHistory) {
      await supabaseAdmin.from("gift_events").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabaseAdmin.from("matches").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    } else {
      if (openIds.length) {
        await supabaseAdmin.from("gift_events").delete().in("match_id", openIds);
        await supabaseAdmin
          .from("matches")
          .update({ ended_at: new Date().toISOString() })
          .in("id", openIds);
      }
    }

    const { data: fresh, error } = await supabaseAdmin
      .from("matches")
      .insert({ round: 1 })
      .select("id, round")
      .single();
    if (error || !fresh) throw new Error("Unable to reset the match");
    return { id: fresh.id as string, round: (fresh.round as number) ?? 1 };
  });
