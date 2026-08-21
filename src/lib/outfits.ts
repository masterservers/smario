import { useEffect, useState } from "react";
import type { Side } from "@/lib/battle";

/**
 * Ring outfit of each fighter: "suit" (jacket on) or "gear" (stripped down to
 * wrestling gear). The admin flips it live and every open arena tab — including
 * the spectators on a session link — follows instantly.
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

export function readOutfits(): OutfitState {
  if (typeof window === "undefined") return { ...DEFAULT_OUTFITS };
  try {
    const raw = window.localStorage.getItem(KEY);
    return normalize(raw ? JSON.parse(raw) : null);
  } catch {
    return { ...DEFAULT_OUTFITS };
  }
}

export function publishOutfits(next: OutfitState) {
  if (typeof window === "undefined") return;
  const value = normalize(next);
  window.localStorage.setItem(KEY, JSON.stringify(value));
  const bus = channel();
  bus?.postMessage(value);
  bus?.close();
  window.dispatchEvent(new CustomEvent<OutfitState>(EVENT, { detail: value }));
}

/** Live outfit state for the arena; updates without any reload. */
export function useOutfits(): OutfitState {
  const [state, setState] = useState<OutfitState>(DEFAULT_OUTFITS);

  useEffect(() => {
    setState(readOutfits());
    const apply = (value: OutfitState) => setState(normalize(value));
    const bus = channel();
    const onMessage = (event: MessageEvent<OutfitState>) => apply(event.data);
    const onLocal = (event: Event) => apply((event as CustomEvent<OutfitState>).detail);
    // Other tabs of the same browser that miss the channel still follow.
    const onStorage = (event: StorageEvent) => {
      if (event.key === KEY) setState(readOutfits());
    };
    bus?.addEventListener("message", onMessage);
    window.addEventListener(EVENT, onLocal);
    window.addEventListener("storage", onStorage);
    return () => {
      bus?.removeEventListener("message", onMessage);
      bus?.close();
      window.removeEventListener(EVENT, onLocal);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return state;
}
