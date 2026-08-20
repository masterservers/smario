import { createServerFn } from "@tanstack/react-start";
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
