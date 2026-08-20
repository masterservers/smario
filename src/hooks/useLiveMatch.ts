import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { finishMatch, getCurrentMatch } from "@/lib/match.functions";
import {
  reduceEvents,
  randomNickname,
  type GiftEvent,
  type GiftId,
  type Side,
} from "@/lib/battle";

type LeaderRow = { sender: string; total: number; side: Side };

const KO_HOLD_MS = 4200;

function readNickname(): string {
  if (typeof window === "undefined") return "guest";
  const stored = window.localStorage.getItem("pvt-nick");
  if (stored) return stored;
  const nick = randomNickname();
  window.localStorage.setItem("pvt-nick", nick);
  return nick;
}

export function useLiveMatch() {
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

  const state = useMemo(() => reduceEvents(events), [events]);

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
      if (!matchId || state.ko) return;
      await supabase.from("gift_events").insert({
        match_id: matchId,
        side,
        gift,
        sender: nickname,
        message: message ?? null,
      });
    },
    [matchId, nickname, state.ko],
  );

  return { matchId, round, events, state, leaders, viewers, nickname, ready, sendGift };
}
