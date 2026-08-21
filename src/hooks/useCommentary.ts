import { useEffect, useRef, useState } from "react";
import { GIFT_BY_ID, type BattleState, type GiftEvent, type Side } from "@/lib/battle";
import { COMMENTARY, LANG_META, REFEREE_LINES, UI_TEXT, type Lang } from "@/lib/i18n";
import { sideVoiceNames } from "@/lib/adminConfig";
import { publishSubtitle } from "@/lib/subtitles";
import { familyOf } from "@/lib/scenes";
import { FAMILY_LINES } from "@/lib/familyLines";
import { getVoiceClip, playVoiceClip, stopVoiceClip, type VoiceTone } from "@/lib/voice";
import { crowdReact, duckCrowd } from "@/lib/crowd";

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

/** Minimum spacing between two calls of the same kind. */
const TONE_COOLDOWN_MS: Record<CommentaryLine["tone"], number> = {
  ko: 0, // never delay a knockout call
  big: 900,
  hit: 1600,
  idle: 6000,
};


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
 * Priority lanes for the commentator:
 *   3 = critical (knockout, final count) — cuts anything, even mid-sentence
 *   2 = high (referee count, big hit / combo) — cuts ambient chatter only
 *   1 = normal (regular hit, fighter back up)
 *   0 = ambient (idle filler, round intro) — always yields
 */
export const PRIORITY: Record<CommentaryLine["tone"], number> = {
  ko: 3,
  big: 2,
  hit: 1,
  idle: 0,
};

const speechQueue: Spoken[] = [];
let speaking = false;
let speakingPriority = -1;
let lastEndAt = 0;
let drainTimer = 0;
let laneGeneration = 0;
const MIN_GAP_MS = 320;
const MAX_QUEUE = 2;

export function commentaryBusy() {
  return speaking || speechQueue.length > 0;
}

/**
 * Priority of what currently holds the voice lane (-1 when it is free). A
 * sparring call may cut ambient filler (0) but never a referee count, a big
 * hit or a knockout (>= 2).
 */
export function commentaryLanePriority() {
  const queued = speechQueue.length > 0 ? speechQueue[0]!.priority : -1;
  return Math.max(speaking ? speakingPriority : -1, queued);
}

function toneOf(priority: number): VoiceTone {
  return priority >= 3 ? "ko" : priority >= 2 ? "big" : "normal";
}

/** Browser synthesis, used only when the neural voice is unavailable. */
function speakFallback(next: Spoken, done: () => void) {
  const synth = window.speechSynthesis;
  const speechLang = LANG_META[next.lang].speech;
  const utterance = new SpeechSynthesisUtterance(next.text);
  utterance.lang = speechLang;
  const voice = pickVoice(speechLang);
  if (voice) utterance.voice = voice;
  utterance.rate = next.priority >= 3 ? 1.14 : 1.08;
  utterance.pitch = 0.78;
  utterance.volume = 1;
  utterance.onend = done;
  utterance.onerror = done;
  synth.speak(utterance);
  window.setTimeout(
    () => {
      if (speaking && !synth.speaking) done();
    },
    800 + next.text.length * 90,
  );
}

function drain() {
  if (typeof window === "undefined") return;
  if (speaking || speechQueue.length === 0 || drainTimer) return;
  const wait = Math.max(0, lastEndAt + MIN_GAP_MS - Date.now());
  drainTimer = window.setTimeout(() => {
    drainTimer = 0;
    const next = speechQueue.shift();
    if (!next) return;
    const generation = ++laneGeneration;
    const done = () => {
      if (generation !== laneGeneration) return;
      speaking = false;
      speakingPriority = -1;
      lastEndAt = Date.now();
      duckCrowd(false);
      drain();
    };
    speaking = true;
    speakingPriority = next.priority;
    duckCrowd(true);
    void getVoiceClip(next.text, next.lang, toneOf(next.priority)).then((url) => {
      if (generation !== laneGeneration) return;
      if (url) playVoiceClip(url, done);
      else if ("speechSynthesis" in window) speakFallback(next, done);
      else done();
    });
  }, wait);
}

function clearLane() {
  laneGeneration += 1;
  speechQueue.length = 0;
  window.clearTimeout(drainTimer);
  drainTimer = 0;
  speaking = false;
  speakingPriority = -1;
  stopVoiceClip();
  duckCrowd(false);
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}

export function stopCommentary() {
  if (typeof window === "undefined") return;
  clearLane();
}


function speak(text: string, lang: Lang, priority: number) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

  // A more important call interrupts whatever is on air right now.
  if (speaking && priority > speakingPriority) {
    clearLane();
    lastEndAt = 0;
  } else if (speaking && priority < speakingPriority && priority <= 0) {
    return; // ambient filler never queues behind an important call
  } else {
    // Drop pending lines that matter less than the newcomer.
    for (let i = speechQueue.length - 1; i >= 0; i -= 1) {
      if (speechQueue[i]!.priority < priority) speechQueue.splice(i, 1);
    }
    if (speechQueue.length >= MAX_QUEUE) speechQueue.shift();
  }

  speechQueue.push({ text, lang, priority });
  // Highest priority first, stable for equal lanes.
  speechQueue.sort((a, b) => b.priority - a.priority);
  drain();
}


/**
 * Speak a top-bar announcement (referee call or gift ticker) in the selected
 * language, on the same voice lane as the commentary so the two never overlap.
 */
export function announce(text: string, lang: Lang, priority = 2) {
  speak(text, lang, priority);
}

export type HitAnnouncement = {
  eventId: string;
  side: Side;
  gift: string;
  kind: string;
  label: string;
};

let hitAnnouncer: ((hit: HitAnnouncement) => void) | null = null;

/**
 * Called by the arena at the exact frame a blow connects, so the voice line and
 * the subtitle are triggered on the impact itself, not on an estimate.
 */
export function announceHit(hit: HitAnnouncement) {
  hitAnnouncer?.(hit);
}

let sceneAnnouncer: ((scene: { id?: string; label: string }) => void) | null = null;

/**
 * Called by the arena when a scene without a gift starts (feeling-out phases,
 * rope work, mat scrambles). The commentator describes the family of the scene
 * in the language chosen on the link.
 */
export function announceScene(scene: { id?: string; label: string }) {
  sceneAnnouncer?.(scene);
}

export type SparAnnouncement = { side: Side; label: string; tier: number };

let sparAnnouncer: ((spar: SparAnnouncement) => void) | null = null;

/**
 * Called by the arena at the impact frame of a sparring spot (no gift behind
 * it). The commentator calls the move by its real family — punch, kick, rope
 * dive, throw, mat work — so the voice always matches what is on screen.
 */
export function announceSpar(spar: SparAnnouncement) {
  sparAnnouncer?.(spar);
}


export function useCommentary(
  lang: Lang,
  events: GiftEvent[],
  state: BattleState,
  muted: boolean,
  referee?: RefereeInput,
  round?: number,
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
  const lastToneAt = useRef<Record<CommentaryLine["tone"], number>>({
    ko: 0,
    big: 0,
    hit: 0,
    idle: 0,
  });
  // `force` is used for calls tied to a frame on screen (a landed blow): the
  // move must always be named, even if another hit was called a second ago.
  const push = (text: string, tone: CommentaryLine["tone"], force = false) => {
    const now = Date.now();
    // Spacing per lane so the same kind of call never floods the broadcast.
    if (!force && now - lastToneAt.current[tone] < TONE_COOLDOWN_MS[tone]) return;
    // Never repeat one of the recent lines.
    if (recent.current.includes(text)) return;
    lastToneAt.current[tone] = now;
    recent.current = [...recent.current, text].slice(-16);
    setLines((prev) => [
      ...prev.slice(-(MAX_LINES - 1)),
      { id: `${now}-${Math.random().toString(36).slice(2)}`, text, tone },
    ]);
    publishSubtitle(text, "commentary", 3200);
    if (!mutedRef.current) speak(text, langRef.current, PRIORITY[tone]);
  };


  /**
   * Calls waiting for their impact. The arena confirms the exact frame of
   * contact through `announceHit`; if that confirmation never arrives (tab in
   * the background, dropped scene), a fallback fires the call anyway — but only
   * once per gift id, so a hit is never commented twice.
   */
  const pendingCalls = useRef<Map<string, { run: (label?: string) => void; timer: number }>>(
    new Map(),
  );
  const spokenHits = useRef<Set<string>>(new Set());

  const flushCall = (eventId: string, suffix?: string) => {
    const pending = pendingCalls.current.get(eventId);
    if (!pending) return;
    pendingCalls.current.delete(eventId);
    window.clearTimeout(pending.timer);
    if (spokenHits.current.has(eventId)) return;
    spokenHits.current.add(eventId);
    if (spokenHits.current.size > 200) spokenHits.current.clear();
    pending.run(suffix);
    if (suffix) publishSubtitle(suffix, "hit", 2200);
  };

  useEffect(() => {
    hitAnnouncer = (hit) => flushCall(hit.eventId, hit.label);
    // Ambient family call: only when the voice lane is free, so it never steps
    // on a hit, a referee count or a knockout call.
    sceneAnnouncer = (scene) => {
      if (commentaryBusy()) return;
      const family = familyOf(scene);
      const ambient = FAMILY_LINES[langRef.current][family].ambient;
      if (ambient.length === 0) return;
      push(pick(ambient), "idle");
    };
    // Sparring impact: a real call for the move that just landed, but it never
    // steps on a gift hit, a referee count or a knockout.
    sparAnnouncer = ({ side, label, tier }) => {
      if (pendingCalls.current.size > 0) return;
      // Ambient filler is cut off by the move that just landed; only a referee
      // count, a big hit or a knockout keeps the lane.
      if (commentaryLanePriority() >= 2) return;
      const names = sideVoiceNames(langRef.current);
      const attacker = side === "ru" ? names.ru : names.us;
      const defender = side === "ru" ? names.us : names.ru;
      const family = familyOf({ label });
      const pack = FAMILY_LINES[langRef.current][family].action;
      if (pack.length === 0) return;
      push(pick(pack)(attacker, defender), tier >= 4 ? "big" : "hit", true);
    };
    return () => {
      hitAnnouncer = null;
      sceneAnnouncer = null;
      sparAnnouncer = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    const names = sideVoiceNames(lang);
    const c = COMMENTARY[lang];
    const attacker = last.side === "ru" ? names.ru : names.us;
    const defender = last.side === "ru" ? names.us : names.ru;
    const gift = GIFT_BY_ID[last.gift];

    const call = (label?: string) => {
      const big = (gift?.damage ?? 0) >= 20;
      if (state.combo >= 4 && state.comboSide === last.side) {
        push(pick(c.combo)(attacker, defender, String(state.combo)), "big");
        return;
      }
      // The arena tells us which move actually landed, so the call describes the
      // real family of the scene (punch, kick, ropes, throw, mat, clinch).
      if (label) {
        const family = familyOf({ label });
        const pack = FAMILY_LINES[langRef.current][family].action;
        if (pack.length > 0) {
          push(pick(pack)(attacker, defender), big ? "big" : "hit");
          return;
        }
      }
      push(big ? pick(c.bigHit)(attacker, defender) : pick(c.hit)(attacker, defender), big ? "big" : "hit");
    };
    // Fallback well after the usual impact delay, in case no confirmation comes.
    const timer = window.setTimeout(() => flushCall(last.id), IMPACT_DELAY_MS + 3200);
    pendingCalls.current.set(last.id, { run: call, timer });

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

  // KNOCKDOWN: announced the moment the fighter hits the mat, in the selected
  // language, with the caption published on the same beat.
  const knockdownFor = useRef<string | null>(null);
  useEffect(() => {
    if (!referee?.side || referee.count <= 0) {
      if (!referee?.side) knockdownFor.current = null;
      return;
    }
    const key = `${referee.side}-${referee.final ? "ko" : "kd"}`;
    if (knockdownFor.current === key) return;
    knockdownFor.current = key;
    const names = sideVoiceNames(lang);
    const fighter = referee.side === "ru" ? names.ru : names.us;
    const text = `${UI_TEXT[lang].knockdown.toUpperCase()} — ${fighter}!`;
    publishSubtitle(text, "ref", 2600);
    setLines((prev) => [
      ...prev.slice(-(MAX_LINES - 1)),
      { id: `kd-${Date.now()}`, text, tone: referee.final ? "ko" : "big" },
    ]);
    if (!mutedRef.current) speak(text, lang, referee.final ? PRIORITY.ko : PRIORITY.big);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [referee?.side, referee?.final, referee?.count, lang]);


  // Referee count, spoken in the selected language and synced to each number.
  const lastCount = useRef(0);
  const countedSide = useRef<Side | null>(null);
  useEffect(() => {
    if (!referee) return;
    const names = sideVoiceNames(lang);
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
    const names = sideVoiceNames(lang);
    const winner = state.ko === "ru" ? names.ru : names.us;
    const loser = state.ko === "ru" ? names.us : names.ru;
    push(pick(COMMENTARY[lang].ko)(winner, loser), "ko");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ko, lang]);

  // Keeps talking while nothing happens.
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!mutedRef.current && commentaryBusy()) return;
      const names = sideVoiceNames(langRef.current);
      const c = COMMENTARY[langRef.current];
      push(pick(c.idle)(names.ru, names.us), "idle");
    }, IDLE_MS);
    return () => window.clearInterval(timer);
  }, []);

  // Round intro whenever the language changes or a new round starts — the call
  // is always spoken in the currently selected broadcast language.
  useEffect(() => {
    const names = sideVoiceNames(lang);
    const intro = pick(COMMENTARY[lang].roundStart)(names.ru, names.us);
    const label =
      round && round > 0 ? `${UI_TEXT[lang].round} ${round} — ` : "";
    push(`${label}${intro}`, "idle");
  }, [lang, round]);

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
