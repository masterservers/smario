import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Side } from "@/lib/battle";

/**
 * Ring outfit of each fighter: "suit" (jacket on) or "gear" (stripped down to
 * wrestling gear). The admin flips it live and every open arena tab — including
 * the spectators on a session link — follows instantly.
 *
 * The choice is stored on the running match, so a reload or a restart of the
 * page brings both fighters back in the outfit they were last sent out in.
 *
 * This is a pure presentation layer on top of the running footage: the video
 * element is never reloaded, so audio, commentary and hit timing stay in sync.
 */
export type Outfit = "suit" | "gear";
export type OutfitState = Record<Side, Outfit>;

const KEY = "pvt.outfits";
const CHANNEL = "pvt.outfits";
const EVENT = "pvt-outfits";

export const DEFAULT_OUTFITS: OutfitState = { ru: "suit", us: "suit" };

function channel(): BroadcastChannel | null {
  if (typeof window === "undefined" || !("BroadcastChannel" in window)) return null;
  return new BroadcastChannel(CHANNEL);
}

function normalize(raw: unknown): OutfitState {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_OUTFITS };
  const value = raw as Partial<OutfitState>;
  return {
    ru: value.ru === "gear" ? "gear" : "suit",
    us: value.us === "gear" ? "gear" : "suit",
  };
}

/** Last outfit known locally — used until the match row answers. */
export function readOutfits(): OutfitState {
  if (typeof window === "undefined") return { ...DEFAULT_OUTFITS };
  try {
    const raw = window.localStorage.getItem(KEY);
    return normalize(raw ? JSON.parse(raw) : null);
  } catch {
    return { ...DEFAULT_OUTFITS };
  }
}

function cache(value: OutfitState) {
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(value));
}

export function publishOutfits(next: OutfitState) {
  if (typeof window === "undefined") return;
  const value = normalize(next);
  cache(value);
  const bus = channel();
  bus?.postMessage(value);
  bus?.close();
  window.dispatchEvent(new CustomEvent<OutfitState>(EVENT, { detail: value }));
}

/** The match the ring is currently running, if any. */
export async function currentMatchId(): Promise<string | null> {
  const { data } = await supabase
    .from("matches")
    .select("id")
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

/** Outfit stored for a match (falls back to both fighters in a suit). */
export async function fetchMatchOutfits(matchId: string): Promise<OutfitState> {
  const { data } = await supabase
    .from("match_outfits")
    .select("ru, us")
    .eq("match_id", matchId)
    .maybeSingle();
  return normalize(data);
}

/** Live outfit state for the arena; updates without any reload. */
export function useOutfits(): OutfitState {
  const [state, setState] = useState<OutfitState>(DEFAULT_OUTFITS);

  useEffect(() => {
    let cancelled = false;
    setState(readOutfits());

    // Persisted state wins over the local cache on every load.
    const hydrate = async () => {
      const matchId = await currentMatchId();
      if (!matchId || cancelled) return;
      const stored = await fetchMatchOutfits(matchId);
      if (cancelled) return;
      cache(stored);
      setState(stored);
    };
    void hydrate();
    // Keeps spectators on other devices in step with the console.
    const timer = window.setInterval(() => void hydrate(), 10000);

    const apply = (value: OutfitState) => {
      const next = normalize(value);
      cache(next);
      setState(next);
    };
    const bus = channel();
    const onMessage = (event: MessageEvent<OutfitState>) => apply(event.data);
    const onLocal = (event: Event) => apply((event as CustomEvent<OutfitState>).detail);
    const onStorage = (event: StorageEvent) => {
      if (event.key === KEY) setState(readOutfits());
    };
    bus?.addEventListener("message", onMessage);
    window.addEventListener(EVENT, onLocal);
    window.addEventListener("storage", onStorage);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      bus?.removeEventListener("message", onMessage);
      bus?.close();
      window.removeEventListener(EVENT, onLocal);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return state;
}
