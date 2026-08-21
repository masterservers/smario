import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  reduceEvents,
  parseChatMessage,
  GIFT_BY_ID,
  type GiftEvent,
  type GiftId,
  type Side,
} from "@/lib/battle";
import { defaultHitConfig, type GiftHitRule, type HitConfig, type HitKind } from "@/lib/hitConfig";

/** Service-role client, used only for reads/writes the referee owns. */
export async function adminClient(): Promise<SupabaseClient> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as SupabaseClient;
}

/** Anonymous client for public reads (published config). */
export function publicClient(): SupabaseClient {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

/**
 * The hit mapping the show is on air with. Published config wins; if nothing is
 * published the built-in defaults apply, so the referee always has a rule set
 * and a client can never inject its own.
 */
export async function loadActiveHitConfig(): Promise<HitConfig> {
  const base = defaultHitConfig();
  try {
    const { data } = await publicClient()
      .from("config_versions")
      .select("bundle")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    const bundle = (data?.bundle ?? null) as { hits?: Partial<HitConfig> } | null;
    const hits = bundle?.hits;
    if (!hits) return base;
    if (hits.gifts) {
      for (const [id, rule] of Object.entries(hits.gifts)) {
        const target = base.gifts[id as GiftId];
        if (target && rule) Object.assign(target, sanitize(rule, target));
      }
    }
    if (hits.rounds) {
      for (const [round, rules] of Object.entries(hits.rounds)) {
        const bucket: Partial<Record<GiftId, GiftHitRule>> = {};
        for (const [id, rule] of Object.entries(rules ?? {})) {
          const fallback = base.gifts[id as GiftId];
          if (fallback && rule) bucket[id as GiftId] = sanitize(rule, fallback);
        }
        base.rounds[round] = bucket;
      }
    }
    if (hits.referee) base.referee = { ...base.referee, ...hits.referee };
  } catch {
    /* published config unavailable: run on defaults */
  }
  return base;
}

const KINDS: HitKind[] = ["punch", "kick", "grapple", "aerial", "throw"];

function clamp(value: unknown, min: number, max: number, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

function sanitize(rule: Partial<GiftHitRule>, fallback: GiftHitRule): GiftHitRule {
  const kinds = Array.isArray(rule.kinds)
    ? rule.kinds.filter((k): k is HitKind => KINDS.includes(k as HitKind))
    : [];
  return {
    kinds: kinds.length > 0 ? kinds : [...fallback.kinds],
    tier: Math.round(clamp(rule.tier, 1, 5, fallback.tier)),
    force: clamp(rule.force, 0.4, 2, fallback.force),
    stun: clamp(rule.stun, 0.4, 2, fallback.stun),
  };
}

export type HitDecision = {
  eventId: string;
  side: Side;
  gift: GiftId;
  kinds: HitKind[];
  tier: number;
  force: number;
  stun: number;
  /** True when this gift is the blow that drops the opponent. */
  knockdown: boolean;
};

export type RingVerdict = {
  matchId: string;
  round: number;
  scoreRu: number;
  scoreUs: number;
  hpRu: number;
  hpUs: number;
  combo: number;
  comboSide: Side | null;
  ko: Side | null;
  referee: HitConfig["referee"];
  decisions: HitDecision[];
  serverTime: number;
};

/** A quiet ring: no score, no knockdown, no decisions to apply. */
function emptyVerdict(matchId: string, round: number, config: HitConfig): RingVerdict {
  return {
    matchId,
    round,
    scoreRu: 0,
    scoreUs: 0,
    hpRu: 100,
    hpUs: 100,
    combo: 0,
    comboSide: null,
    ko: null,
    referee: config.referee,
    decisions: [],
    serverTime: Date.now(),
  };
}

/**
 * Recomputes the whole ring state from the stored gift feed and decides which
 * blow every gift produces. Nothing here trusts the browser: score, knockdown
 * and knockout all come from the database rows.
 */

export async function judgeRing(matchId: string): Promise<RingVerdict> {
  const supabase = await adminClient();

  const { data: matchRow } = await supabase
    .from("matches")
    .select("id, round, ended_at")
    .eq("id", matchId)
    .maybeSingle();
  // A match that was reset, ended or is not on air yet is not an error: the
  // referee simply has nothing to judge, so it answers with a neutral ring.
  if (!matchRow) return emptyVerdict(matchId, 1, await loadActiveHitConfig());

  const { data: rows, error } = await supabase
    .from("gift_events")
    .select("id, side, gift, value, sender, created_at, flagged")
    .eq("match_id", matchId)
    .eq("flagged", false)
    .order("created_at", { ascending: true })
    .limit(1000);

  const events = (error ? [] : (rows ?? [])) as GiftEvent[];

  const state = reduceEvents(events);
  const config = await loadActiveHitConfig();
  const round = (matchRow.round as number) ?? 1;

  // Replay the feed once more to know which single gift caused the knockdown.
  let koEventId: string | null = null;
  {
    const running = reduceEvents(events);
    if (running.ko) {
      for (let i = 0; i < events.length; i += 1) {
        if (reduceEvents(events.slice(0, i + 1)).ko) {
          koEventId = events[i]!.id;
          break;
        }
      }
    }
  }

  const recent = events.slice(-60);
  const decisions: HitDecision[] = recent.map((event) => {
    const rule =
      config.rounds[String(round)]?.[event.gift] ??
      config.gifts[event.gift] ??
      config.gifts.rose!;
    const gift = GIFT_BY_ID[event.gift];
    return {
      eventId: event.id,
      side: event.side,
      gift: event.gift,
      kinds: rule.kinds,
      tier: rule.tier,
      // Heavier catalog gifts land a little harder, still inside admin bounds.
      force: Math.min(2, rule.force * (1 + Math.min(0.25, (gift?.damage ?? 4) / 200))),
      stun: rule.stun,
      knockdown: event.id === koEventId,
    };
  });

  return {
    matchId,
    round,
    scoreRu: state.scoreRu,
    scoreUs: state.scoreUs,
    hpRu: state.hpRu,
    hpUs: state.hpUs,
    combo: state.combo,
    comboSide: state.comboSide,
    ko: state.ko,
    referee: config.referee,
    decisions,
    serverTime: Date.now(),
  };
}

/** Maps a chat/stream line to a side and a gift, then records it on the match. */
export async function ingestStreamGift(input: {
  text?: string;
  side?: Side;
  gift?: GiftId;
  sender?: string;
}): Promise<{ ok: true; side: Side; gift: GiftId; matchId: string } | { ok: false; reason: string }> {
  const supabase = await adminClient();
  const { data: current } = await supabase.rpc("current_match");
  const match = Array.isArray(current) ? current[0] : current;
  if (!match?.id) return { ok: false, reason: "no-match" };

  const parsed = input.text ? parseChatMessage(input.text) : { side: null, gift: null as GiftId | null };
  const side = input.side ?? parsed.side;
  const gift = input.gift ?? parsed.gift ?? "rose";
  if (side !== "ru" && side !== "us") return { ok: false, reason: "no-side" };
  if (!GIFT_BY_ID[gift]) return { ok: false, reason: "unknown-gift" };

  const sender = (input.sender ?? "stream").trim().slice(0, 32) || "stream";
  const { error } = await supabase.from("gift_events").insert({
    match_id: match.id as string,
    side,
    gift,
    sender,
    message: input.text ? input.text.slice(0, 200) : null,
  });
  if (error) return { ok: false, reason: "insert-failed" };
  return { ok: true, side, gift, matchId: match.id as string };
}
