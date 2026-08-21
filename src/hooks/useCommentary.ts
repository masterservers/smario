import { useEffect, useRef, useState } from "react";
import { GIFT_BY_ID, type BattleState, type GiftEvent, type Side } from "@/lib/battle";
import { COMMENTARY, LANG_META, REFEREE_LINES, SIDE_NAME, type Lang } from "@/lib/i18n";

export type CommentaryLine = { id: string; text: string; tone: "hit" | "big" | "ko" | "idle" };

type RefereeInput = {
  side: "ru" | "us" | null;
  count: number;
  final: boolean;
  koConfirmed: boolean;
};

const IDLE_MS = 5000;
/** The video lands the hit ~0.5s after the gift arrives; align the call. */
const IMPACT_DELAY_MS = 520;
const MAX_LINES = 6;

function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)]!;
}

// Male-sounding voices per platform; the first match for the requested
// language wins, so the commentator always keeps one clear male voice.
const MALE_HINTS = [
  "male",
  "george",
  "daniel",
  "david",
  "alex",
  "fred",
  "google uk english male",
  "stefan",
  "yuri",
  "pavel",
  "dmitri",
  "emil",
  "nikola",
  "andrei",
  "hans",
  "markus",
  "conrad",
];

const FEMALE_HINTS = ["female", "zira", "samantha", "victoria", "milena", "anna", "katja", "ioana"];

function pickVoice(speechLang: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;
  const base = speechLang.slice(0, 2).toLowerCase();
  const sameLang = voices.filter((v) => v.lang.toLowerCase().startsWith(base));
  const pool = sameLang.length > 0 ? sameLang : voices;
  const male = pool.find((v) => MALE_HINTS.some((h) => v.name.toLowerCase().includes(h)));
  if (male) return male;
  const neutral = pool.find((v) => !FEMALE_HINTS.some((h) => v.name.toLowerCase().includes(h)));
  return neutral ?? pool[0] ?? null;
}

type Spoken = { text: string; lang: Lang; priority: number };

/**
 * Single speech pipeline: only one line is ever spoken at a time, urgent calls
 * (KO, referee count) cut the queue, and normal lines wait for a short gap so
 * sentences never overlap or stack up behind the action.
 */
const speechQueue: Spoken[] = [];
let speaking = false;
let lastEndAt = 0;
let drainTimer = 0;
const MIN_GAP_MS = 320;
const MAX_QUEUE = 2;

export function commentaryBusy() {
  return speaking || speechQueue.length > 0;
}

function drain() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  if (speaking || speechQueue.length === 0 || drainTimer) return;
  const wait = Math.max(0, lastEndAt + MIN_GAP_MS - Date.now());
  drainTimer = window.setTimeout(() => {
    drainTimer = 0;
    const next = speechQueue.shift();
    if (!next) return;
    const synth = window.speechSynthesis;
    const speechLang = LANG_META[next.lang].speech;
    const utterance = new SpeechSynthesisUtterance(next.text);
    utterance.lang = speechLang;
    const voice = pickVoice(speechLang);
    if (voice) utterance.voice = voice;
    utterance.rate = 1.08;
    utterance.pitch = 0.78; // deeper, male broadcast tone
    utterance.volume = 1;
    const done = () => {
      speaking = false;
      lastEndAt = Date.now();
      drain();
    };
    utterance.onend = done;
    utterance.onerror = done;
    speaking = true;
    synth.speak(utterance);
    // Safety net: some engines never fire onend, so release the lane anyway.
    window.setTimeout(
      () => {
        if (speaking && !synth.speaking) done();
      },
      800 + next.text.length * 90,
    );
  }, wait);
}

export function stopCommentary() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  speechQueue.length = 0;
  window.clearTimeout(drainTimer);
  drainTimer = 0;
  speaking = false;
  window.speechSynthesis.cancel();
}

function speak(text: string, lang: Lang, urgent: boolean) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  if (urgent) {
    speechQueue.length = 0;
    window.clearTimeout(drainTimer);
    drainTimer = 0;
    speaking = false;
    window.speechSynthesis.cancel();
    lastEndAt = 0;
  } else if (speechQueue.length >= MAX_QUEUE) {
    // Drop the oldest pending line: stale commentary is worse than silence.
    speechQueue.shift();
  }
  speechQueue.push({ text, lang, priority: urgent ? 2 : 1 });
  drain();
}

export function useCommentary(
  lang: Lang,
  events: GiftEvent[],
  state: BattleState,
  muted: boolean,
  referee?: RefereeInput,
) {
  const [lines, setLines] = useState<CommentaryLine[]>([]);
  const lastEventId = useRef<string | null>(null);
  const lastLeader = useRef<Side | null>(null);
  const koAnnounced = useRef<string | null>(null);
  const langRef = useRef(lang);
  const mutedRef = useRef(muted);

  langRef.current = lang;
  mutedRef.current = muted;

  const recent = useRef<string[]>([]);
  const push = (text: string, tone: CommentaryLine["tone"]) => {
    // Never repeat one of the last lines twice in a row.
    if (recent.current.includes(text)) return;
    recent.current = [...recent.current, text].slice(-8);
    setLines((prev) => [
      ...prev.slice(-(MAX_LINES - 1)),
      { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, text, tone },
    ]);
    if (!mutedRef.current) speak(text, langRef.current, tone === "ko" || tone === "big");
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

    const call = () => {
      if (state.combo >= 4 && state.comboSide === last.side) {
        push(pick(c.combo)(attacker, defender, String(state.combo)), "big");
      } else if ((gift?.damage ?? 0) >= 20) {
        push(pick(c.bigHit)(attacker, defender), "big");
      } else {
        push(pick(c.hit)(attacker, defender), "hit");
      }
    };
    const impactTimer = window.setTimeout(call, IMPACT_DELAY_MS);

    const leader: Side | null =
      state.scoreRu === state.scoreUs ? null : state.scoreRu > state.scoreUs ? "ru" : "us";
    if (leader && leader !== lastLeader.current) {
      lastLeader.current = leader;
      const l = leader === "ru" ? names.ru : names.us;
      const o = leader === "ru" ? names.us : names.ru;
      window.setTimeout(() => push(pick(c.lead)(l, o), "hit"), 1400);
    }
    return () => window.clearTimeout(impactTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, lang]);

  // Referee count, spoken in the selected language and synced to each number.
  const lastCount = useRef(0);
  const countedSide = useRef<Side | null>(null);
  useEffect(() => {
    if (!referee) return;
    const names = SIDE_NAME[lang];
    const r = REFEREE_LINES[lang];
    const fighter = referee.side === "ru" ? names.ru : names.us;

    if (referee.side && referee.count > 0 && referee.count !== lastCount.current) {
      lastCount.current = referee.count;
      countedSide.current = referee.side;
      if (referee.final && referee.count === 10) push(r.ko(fighter), "ko");
      else push(r.count(referee.count, fighter), referee.final ? "ko" : "big");
      return;
    }
    if (!referee.side && lastCount.current > 0) {
      const previous = countedSide.current === "ru" ? names.ru : names.us;
      lastCount.current = 0;
      if (!state.ko) push(r.up(previous), "hit");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [referee?.side, referee?.count, referee?.final, lang]);

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
      if (!mutedRef.current && commentaryBusy()) return;
      const names = SIDE_NAME[langRef.current];
      const c = COMMENTARY[langRef.current];
      push(pick(c.idle)(names.ru, names.us), "idle");
    }, IDLE_MS);
    return () => window.clearInterval(timer);
  }, []);

  // Round intro whenever the language changes or the fight resets.
  useEffect(() => {
    const names = SIDE_NAME[lang];
    push(pick(COMMENTARY[lang].roundStart)(names.ru, names.us), "idle");
  }, [lang]);

  // Voice list loads asynchronously in most browsers; warm it up so the very
  // first call already uses the male voice.
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const warm = () => void window.speechSynthesis.getVoices();
    warm();
    window.speechSynthesis.addEventListener("voiceschanged", warm);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", warm);
  }, []);

  useEffect(() => {
    if (muted) stopCommentary();
  }, [muted]);

  return lines;
}

// Hook signatures change often during development; a partial HMR patch would
// keep stale refs/state and break the Hook order. Force a full reload instead.
if (import.meta.hot) import.meta.hot.accept(() => import.meta.hot?.invalidate());
