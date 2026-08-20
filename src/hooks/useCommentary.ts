import { useEffect, useRef, useState } from "react";
import { GIFT_BY_ID, type BattleState, type GiftEvent, type Side } from "@/lib/battle";
import { COMMENTARY, LANG_META, SIDE_NAME, type Lang } from "@/lib/i18n";

export type CommentaryLine = { id: string; text: string; tone: "hit" | "big" | "ko" | "idle" };

const IDLE_MS = 9000;
const MAX_LINES = 6;

function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)]!;
}

function speak(text: string, lang: Lang) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = LANG_META[lang].speech;
  utterance.rate = 1.12;
  utterance.pitch = 1.05;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

export function useCommentary(
  lang: Lang,
  events: GiftEvent[],
  state: BattleState,
  muted: boolean,
) {
  const [lines, setLines] = useState<CommentaryLine[]>([]);
  const lastEventId = useRef<string | null>(null);
  const lastLeader = useRef<Side | null>(null);
  const koAnnounced = useRef<string | null>(null);
  const langRef = useRef(lang);
  const mutedRef = useRef(muted);

  langRef.current = lang;
  mutedRef.current = muted;

  const push = (text: string, tone: CommentaryLine["tone"]) => {
    setLines((prev) => [
      ...prev.slice(-(MAX_LINES - 1)),
      { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, text, tone },
    ]);
    if (!mutedRef.current) speak(text, langRef.current);
  };

  // Reacts to each incoming gift.
  useEffect(() => {
    const last = events[events.length - 1];
    if (!last) return;
    if (lastEventId.current === null) {
      lastEventId.current = last.id;
      return;
    }
    if (lastEventId.current === last.id) return;
    lastEventId.current = last.id;

    const names = SIDE_NAME[lang];
    const c = COMMENTARY[lang];
    const attacker = last.side === "ru" ? names.ru : names.us;
    const defender = last.side === "ru" ? names.us : names.ru;
    const gift = GIFT_BY_ID[last.gift];

    if (state.combo >= 4 && state.comboSide === last.side) {
      push(pick(c.combo)(attacker, defender, String(state.combo)), "big");
    } else if ((gift?.damage ?? 0) >= 20) {
      push(pick(c.bigHit)(attacker, defender), "big");
    } else {
      push(pick(c.hit)(attacker, defender), "hit");
    }

    const leader: Side | null =
      state.scoreRu === state.scoreUs ? null : state.scoreRu > state.scoreUs ? "ru" : "us";
    if (leader && leader !== lastLeader.current) {
      lastLeader.current = leader;
      const l = leader === "ru" ? names.ru : names.us;
      const o = leader === "ru" ? names.us : names.ru;
      window.setTimeout(() => push(pick(c.lead)(l, o), "hit"), 1400);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, lang]);

  // Knockout call.
  useEffect(() => {
    if (!state.ko) return;
    const key = `${state.ko}-${events.length}`;
    if (koAnnounced.current === key) return;
    koAnnounced.current = key;
    const names = SIDE_NAME[lang];
    const winner = state.ko === "ru" ? names.ru : names.us;
    const loser = state.ko === "ru" ? names.us : names.ru;
    push(pick(COMMENTARY[lang].ko)(winner, loser), "ko");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ko, lang]);

  // Keeps talking while nothing happens.
  useEffect(() => {
    const timer = window.setInterval(() => {
      const names = SIDE_NAME[langRef.current];
      const c = COMMENTARY[langRef.current];
      push(pick(c.idle)(names.ru, names.us), "idle");
    }, IDLE_MS);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Round intro whenever the language changes or the fight resets.
  useEffect(() => {
    const names = SIDE_NAME[lang];
    push(pick(COMMENTARY[lang].roundStart)(names.ru, names.us), "idle");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  useEffect(() => {
    if (muted && typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, [muted]);

  return lines;
}
