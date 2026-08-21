import { useEffect, useRef, useState } from "react";
import type { GiftEvent, Side } from "@/lib/battle";
import { BANNER, SIDE_NAME, UI_TEXT, type Lang } from "@/lib/i18n";
import { announce } from "@/hooks/useCommentary";
import { publishSubtitle } from "@/lib/subtitles";
import { getGiftConfig, giftLabel } from "@/lib/giftConfig";

export type BannerTone = "ref" | "gift" | "hit";
export type Banner = { id: string; text: string; tone: BannerTone } | null;

/** The video lands the hit roughly half a second after the gift arrives. */
const HIT_DELAY_MS = 520;
/** How long a gift line stays in the bar before it clears. */
const GIFT_LIFE_MS = 2200;
const HIT_LIFE_MS = 2000;
const REF_LIFE_MS = 3200;

type Input = {
  lang: Lang;
  matchId: string | null | undefined;
  round: number;
  ko: Side | null;
  koConfirmed: boolean;
  events: GiftEvent[];
  muted: boolean;
};

/**
 * Single source of truth for the top bar: referee calls (round start, KO
 * confirmed, next round) and the gift ticker (incoming gift, then the strike it
 * triggers). Every message is spoken in the selected language at the exact
 * moment it appears in the bar.
 */
export function useTopBanner({ lang, matchId, round, ko, koConfirmed, events, muted }: Input): Banner {
  const [banner, setBanner] = useState<Banner>(null);
  const timers = useRef<number[]>([]);
  const seen = useRef<Set<string>>(new Set());
  const primed = useRef(false);
  const langRef = useRef(lang);
  const mutedRef = useRef(muted);
  langRef.current = lang;
  mutedRef.current = muted;

  const show = (text: string, tone: BannerTone, life: number, priority: number) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setBanner({ id, text, tone });
    // Caption first, so the subtitle appears on the same frame as the bar text
    // and the voice line that follows it.
    publishSubtitle(text, tone, life);
    if (!mutedRef.current) announce(text, langRef.current, priority);
    const timer = window.setTimeout(
      () => setBanner((current) => (current?.id === id ? null : current)),
      life,
    );
    timers.current.push(timer);
  };

  useEffect(
    () => () => {
      for (const timer of timers.current) window.clearTimeout(timer);
      timers.current = [];
    },
    [],
  );

  // Referee: round start / next round.
  useEffect(() => {
    if (!matchId) return;
    const t = UI_TEXT[lang];
    if (round > 1) {
      show(t.refNextRound, "ref", REF_LIFE_MS, 2);
      const timer = window.setTimeout(() => show(t.refRoundStart, "ref", REF_LIFE_MS, 2), 2600);
      timers.current.push(timer);
      return () => window.clearTimeout(timer);
    }
    show(t.refRoundStart, "ref", REF_LIFE_MS, 2);
    return;
    // The clock restarts on the same triggers, so bar and timer stay in sync.
  }, [matchId, round, lang]);

  // Referee: the ten-count is complete.
  useEffect(() => {
    if (!koConfirmed || !ko) return;
    show(UI_TEXT[lang].refKoConfirmed, "ref", 6000, 3);
  }, [koConfirmed, ko, lang]);

  // Gift ticker: who sent what for whom, then the strike it triggers.
  useEffect(() => {
    if (!primed.current) {
      for (const event of events) seen.current.add(event.id);
      primed.current = true;
      return;
    }
    for (const event of events) {
      if (seen.current.has(event.id)) continue;
      seen.current.add(event.id);
      const names = SIDE_NAME[lang];
      const copy = BANNER[lang];
      const giftName = giftLabel(getGiftConfig(), event.gift, lang);
      const team = event.side === "ru" ? names.ruTeam : names.usTeam;
      const defender = event.side === "ru" ? names.us : names.ru;
      show(copy.giftIn(event.sender, giftName, team), "gift", GIFT_LIFE_MS, 1);
      const timer = window.setTimeout(
        () => show(copy.giftHit(giftName, defender), "hit", HIT_LIFE_MS, 1),
        HIT_DELAY_MS,
      );
      timers.current.push(timer);
    }
  }, [events, lang]);

  return banner;
}
