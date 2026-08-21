import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { UI_TEXT, type Lang } from "@/lib/i18n";
import { finishMatch, getCurrentMatch } from "@/lib/match.functions";
import { reduceEvents, randomNickname, type GiftEvent, type GiftId, type Side } from "@/lib/battle";
import { resolveRing } from "@/lib/referee.functions";
import { resolveHitSide, setServerRules } from "@/lib/hitConfig";

type LeaderRow = { sender: string; total: number; side: Side };

/** Keep the defeated fighter visible on the mat for a full twenty seconds. */
const KO_HOLD_MS = 20000;

function readNickname(): string {
  if (typeof window === "undefined") return "guest";
  const stored = window.localStorage.getItem("pvt-nick");
  if (stored) return stored;
  const nick = randomNickname();
  window.localStorage.setItem("pvt-nick", nick);
  return nick;
}

type LogFn = (kind: "gift" | "ref" | "ko", text: string) => void;

export function useLiveMatch(lang: Lang = "en", onLog?: LogFn) {
  // Keep the logger in a ref so re-renders never rebuild sendGift.
  const logRef = useRef<LogFn | undefined>(onLog);
  logRef.current = onLog;
  const log = useCallback((text: string) => logRef.current?.("gift", text), []);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [round, setRound] = useState(1);
  const [events, setEvents] = useState<GiftEvent[]>([]);
  const [leaders, setLeaders] = useState<LeaderRow[]>([]);
  const [viewers, setViewers] = useState(1);
  const [nickname, setNickname] = useState("guest");
  const [ready, setReady] = useState(false);
  const finishing = useRef(false);

  useEffect(() => {
    setNickname(readNickname());
  }, []);

  const loadMatch = useCallback(async () => {
    let match: { id: string; round: number };
    try {
      match = await getCurrentMatch();
    } catch {
      return;
    }
    if (!match?.id) return;
    setMatchId(match.id);
    setRound(match.round ?? 1);
    const { data: rows } = await supabase
      .from("gift_events")
      .select("id, side, gift, value, sender, created_at")
      .eq("match_id", match.id)
      .order("created_at", { ascending: true })
      .limit(400);
    setEvents((rows ?? []) as GiftEvent[]);
    finishing.current = false;
    setReady(true);
  }, []);

  const loadLeaders = useCallback(async () => {
    const { data } = await supabase.rpc("daily_leaderboard");
    if (data) setLeaders(data as LeaderRow[]);
  }, []);

  useEffect(() => {
    void loadMatch();
    void loadLeaders();
  }, [loadMatch, loadLeaders]);

  // Live gift feed for the current match.
  useEffect(() => {
    if (!matchId) return;
    const channel = supabase
      .channel(`gifts-${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "gift_events",
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          // Flagged gifts are filtered out by the database before they ever
          // reach a viewer, so anything arriving here counts.
          const row = payload.new as GiftEvent;
          setEvents((prev) => (prev.some((e) => e.id === row.id) ? prev : [...prev, row]));
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [matchId]);

  // A new match row means the previous fight ended.
  useEffect(() => {
    const channel = supabase
      .channel("matches-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "matches" }, () => {
        window.setTimeout(() => {
          void loadMatch();
          void loadLeaders();
        }, 400);
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadMatch, loadLeaders]);

  // Presence-based viewer count.
  useEffect(() => {
    const channel = supabase.channel("arena-presence", {
      config: { presence: { key: Math.random().toString(36).slice(2) } },
    });
    channel
      .on("presence", { event: "sync" }, () => {
        setViewers(Math.max(1, Object.keys(channel.presenceState()).length));
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") void channel.track({ at: Date.now() });
      });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const localState = useMemo(() => reduceEvents(events), [events]);
  const [verdict, setVerdict] = useState<Awaited<ReturnType<typeof resolveRing>> | null>(null);

  // Server-side referee: the score, the knockdown and the strength of every
  // blow are recomputed from the stored feed, never trusted from the browser.
  useEffect(() => {
    if (!matchId) return;
    let alive = true;
    const judge = async () => {
      try {
        const result = await resolveRing({ data: { matchId } });
        if (!alive) return;
        setServerRules(
          result.decisions.map((d) => ({
            eventId: d.eventId,
            rule: { kinds: d.kinds, tier: d.tier, force: d.force, stun: d.stun },
          })),
        );
        setVerdict(result);
      } catch {
        /* keep playing on the local mapping until the referee answers again */
      }
    };
    void judge();
    const timer = window.setInterval(judge, 4000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [matchId, events.length]);

  // The referee's verdict is authoritative; local reduction only bridges the
  // few hundred milliseconds before the next server answer.
  const state = useMemo(() => {
    if (!verdict || verdict.matchId !== matchId) return localState;
    return {
      scoreRu: Math.max(verdict.scoreRu, localState.scoreRu),
      scoreUs: Math.max(verdict.scoreUs, localState.scoreUs),
      hpRu: Math.min(verdict.hpRu, localState.hpRu),
      hpUs: Math.min(verdict.hpUs, localState.hpUs),
      combo: localState.combo,
      comboSide: localState.comboSide,
      ko: verdict.ko ?? localState.ko,
    };
  }, [verdict, localState, matchId]);

  // First client to see the knockout closes the match and opens the next one.
  useEffect(() => {
    if (!state.ko || !matchId || finishing.current) return;
    finishing.current = true;
    const timer = window.setTimeout(async () => {
      try {
        await finishMatch({ data: { matchId, winner: state.ko as Side } });
      } catch {
        /* another client may have closed the match first */
      }
      void loadMatch();
      void loadLeaders();
    }, KO_HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [state.ko, matchId, loadMatch, loadLeaders]);

  const sendGift = useCallback(
    async (side: Side, gift: GiftId, message?: string) => {
      // Unlimited gifting: no throttle, no lockout — even during the KO hold.
      if (!matchId) return;
      const t = UI_TEXT[lang];

      // Putin vs Trump rules: a gift locked to a fighter always lands on him.
      const target = resolveHitSide(gift, side);

      // No throttling: a viewer may tap a gift as often as they want.
      const { data, error } = await supabase
        .from("gift_events")
        .insert({
          match_id: matchId,
          side: target,
          gift,
          sender: nickname,
          message: message ?? null,
        })

        .select("id, side, gift, value, sender, created_at")
        .single();

      if (error) {
        log(`rejected · ${gift} → ${side.toUpperCase()} · ${error.message ?? "unknown"} (server)`);
        toast.error(t.tooFast);
        return;
      }


      if (data) {
        setEvents((prev) =>
          prev.some((e) => e.id === data.id) ? prev : [...prev, data as GiftEvent],
        );
      }
    },
    [matchId, nickname, lang, log],
  );

  return { matchId, round, events, state, leaders, viewers, nickname, ready, sendGift, verdict };
}

// Hook signatures change often during development; a partial HMR patch would
// keep stale refs/state and break the Hook order. Force a full reload instead.
if (import.meta.hot) import.meta.hot.accept(() => import.meta.hot?.invalidate());
