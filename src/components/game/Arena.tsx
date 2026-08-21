import { DIFFICULTY_CONFIG, type Difficulty } from "@/lib/difficulty";
import { useEffect, useRef, useState } from "react";
import fightVideo from "@/assets/arena-moves.webm.asset.json";
import { GIFT_BY_ID, type GiftEvent, type Side } from "@/lib/battle";
import { SIDE_NAME, UI_TEXT, type Lang } from "@/lib/i18n";

const FIGHT_VIDEO = fightVideo.url;

type Move = {
  id: string;
  start: number;
  end: number;
  impact: number;
  label: string;
  rate: number;
  /** 1 = light strike, 5 = finisher */
  tier: number;
};

/** How a hit reads physically on screen. */
type HitKind = "punch" | "kick" | "grapple" | "aerial" | "throw";

function kindOf(move: Move): HitKind {
  const l = move.label;
  if (/KICK|TEEP|DROPKICK/.test(l)) return "kick";
  if (/ROPE|CLIMB|DIVE|SPLASH|MOONSAULT|JUMP|DROP/.test(l)) return "aerial";
  if (/SLAM|THROW|POWERBOMB|TOSS|FINISHER/.test(l)) return "throw";
  if (/JAB|HOOK|CROSS|RIGHT|UPPERCUT|ELBOW|COMBO|COMBINATION|COUNTER|SHOT/.test(l)) return "punch";
  return "grapple";
}

/**
 * Framing presets: the fighters travel across the ring instead of staying
 * pinned in the centre. Values stay small (no close-ups) — they only shift the
 * wide shot left/right, a touch nearer/further, with a controlled tilt.
 */
type Frame = { x: number; y: number; scale: number; rotate: number };

const FRAMES: Frame[] = [
  { x: 0, y: 0, scale: 1, rotate: 0 },
  { x: -4.5, y: 0.5, scale: 1.04, rotate: -0.9 },
  { x: 4.5, y: 0.5, scale: 1.04, rotate: 0.9 },
  { x: -6, y: -1, scale: 1.06, rotate: 1.1 },
  { x: 6, y: -1, scale: 1.06, rotate: -1.1 },
  { x: 0, y: 1.5, scale: 0.97, rotate: 0 },
  { x: -2.5, y: -1.5, scale: 1.02, rotate: 0.6 },
  { x: 2.5, y: -1.5, scale: 1.02, rotate: -0.6 },
];

/** Each block of the reel gets its own corner of the ring, plus a little drift. */
function frameFor(move: Move): Frame {
  const block = Math.floor(move.start / 10); // 0..3
  const base = FRAMES[(block * 2 + (move.tier % 2) + 1) % FRAMES.length]!;
  const drift = (Math.random() - 0.5) * 2.4;
  return {
    x: Math.max(-7, Math.min(7, base.x + drift)),
    y: base.y + (Math.random() - 0.5) * 1.2,
    scale: base.scale,
    rotate: base.rotate + (Math.random() - 0.5) * 0.5,
  };
}


/**
 * The reel is one continuous wide camera, 40s long, built from four blocks:
 *   A  0.0 – 10.0  stand-up exchange: circling, punches, lock-up
 *   B 10.1 – 20.0  kickboxing: ring rush, rope run, spin/high kicks, corner clinch
 *   C 20.2 – 30.1  ground: opponent down, corner climb, top-rope dive, arms raised
 *   D 30.3 – 40.3  power: lift, carry across the ring, slam, throw over the ropes
 * Every window below is a real, distinct piece of action — no two moves reuse
 * the same seconds, so the fight never looks like the same loop.
 */
const MOVES: Move[] = [
  // Tier 1 — boxing strikes from block A.
  { id: "jab-a", start: 0.2, end: 1.3, impact: 1.0, label: "JAB", rate: 1.16, tier: 1 },
  { id: "jab-b", start: 1.3, end: 2.4, impact: 2.05, label: "DOUBLE JAB", rate: 1.06, tier: 1 },
  { id: "cross", start: 2.4, end: 3.5, impact: 3.1, label: "STRAIGHT RIGHT", rate: 1.14, tier: 1 },
  { id: "hook-a", start: 3.5, end: 4.6, impact: 4.25, label: "LEFT HOOK", rate: 1.12, tier: 1 },
  { id: "body-shot", start: 4.6, end: 5.7, impact: 5.35, label: "BODY SHOT", rate: 1.08, tier: 1 },
  { id: "uppercut", start: 5.7, end: 6.8, impact: 6.45, label: "UPPERCUT", rate: 1.12, tier: 1 },
  { id: "short-hook", start: 6.8, end: 7.9, impact: 7.5, label: "SHORT HOOK", rate: 1.08, tier: 1 },
  { id: "elbow-jab", start: 7.9, end: 9.0, impact: 8.6, label: "ELBOW", rate: 1.1, tier: 1 },
  { id: "low-kick", start: 10.2, end: 11.4, impact: 11.0, label: "LOW KICK", rate: 1.1, tier: 1 },
  { id: "teep", start: 11.4, end: 12.5, impact: 12.1, label: "PUSH KICK", rate: 1.18, tier: 1 },
  { id: "counter-jab", start: 30.4, end: 31.5, impact: 31.1, label: "COUNTER", rate: 1.08, tier: 1 },

  // Tier 2 — kickboxing and travel across the ring (block B).
  { id: "combo-a", start: 0.4, end: 2.3, impact: 1.7, label: "COMBINATION", rate: 1.0, tier: 2 },
  { id: "combo-b", start: 5.4, end: 7.4, impact: 6.7, label: "1-2-3 COMBO", rate: 1.02, tier: 2 },
  { id: "ring-rush", start: 10.1, end: 12.2, impact: 11.6, label: "RING RUSH", rate: 1.0, tier: 2 },
  { id: "rope-run", start: 12.2, end: 14.3, impact: 13.7, label: "ROPE RUN", rate: 1.0, tier: 2 },
  {
    id: "spinning-kick",
    start: 14.3,
    end: 16.4,
    impact: 15.7,
    label: "SPINNING KICK",
    rate: 1.02,
    tier: 2,
  },
  { id: "high-kick", start: 16.4, end: 18.3, impact: 17.6, label: "HIGH KICK", rate: 1.04, tier: 2 },
  {
    id: "corner-combo",
    start: 18.3,
    end: 20.0,
    impact: 19.4,
    label: "CORNER COMBO",
    rate: 1.0,
    tier: 2,
  },
  {
    id: "counter",
    start: 31.5,
    end: 33.4,
    impact: 32.8,
    label: "COUNTER KICK",
    rate: 1.0,
    tier: 2,
  },

  // Tier 3 — clinch, knees, mat work.
  {
    id: "grapple-a",
    start: 2.3,
    end: 4.5,
    impact: 3.9,
    label: "CLINCH KNEES",
    rate: 0.94,
    tier: 3,
  },
  { id: "grapple-b", start: 7.6, end: 9.9, impact: 9.2, label: "TAKEDOWN", rate: 0.92, tier: 3 },
  {
    id: "corner-drive",
    start: 17.6,
    end: 20.0,
    impact: 19.2,
    label: "CORNER DRIVE",
    rate: 0.94,
    tier: 3,
  },
  {
    id: "turnbuckle",
    start: 20.3,
    end: 22.6,
    impact: 21.9,
    label: "TURNBUCKLE SMASH",
    rate: 0.94,
    tier: 3,
  },
  {
    id: "mat-work",
    start: 26.0,
    end: 28.4,
    impact: 27.6,
    label: "MAT TAKEDOWN",
    rate: 0.92,
    tier: 3,
  },
  { id: "dropkick", start: 33.4, end: 35.6, impact: 34.9, label: "DROPKICK", rate: 0.96, tier: 3 },

  // Tier 4 — rope attacks, throws, out-of-the-ring spots.
  {
    id: "rope-climb",
    start: 20.4,
    end: 23.4,
    impact: 22.7,
    label: "CORNER CLIMB",
    rate: 0.9,
    tier: 4,
  },
  { id: "rope-jump", start: 22.4, end: 25.4, impact: 24.6, label: "ROPE JUMP", rate: 0.88, tier: 4 },
  {
    id: "rope-attack",
    start: 24.6,
    end: 27.6,
    impact: 26.4,
    label: "ROPE ATTACK",
    rate: 0.9,
    tier: 4,
  },
  { id: "slam-a", start: 30.4, end: 33.3, impact: 32.6, label: "BODY SLAM", rate: 0.9, tier: 4 },
  { id: "slam-b", start: 32.6, end: 35.6, impact: 34.8, label: "POWERSLAM", rate: 0.88, tier: 4 },
  {
    id: "corner-run",
    start: 12.4,
    end: 15.5,
    impact: 14.7,
    label: "CORNER RUSH",
    rate: 0.9,
    tier: 4,
  },
  {
    id: "ring-throw",
    start: 36.4,
    end: 39.4,
    impact: 38.4,
    label: "THROWN OUT OF THE RING",
    rate: 0.88,
    tier: 4,
  },

  // Rope work — contact with the mesh, being pushed off the ropes, rebound
  // jumps and turns, so the action leaves the centre of the ring.
  { id: "rope-press", start: 12.6, end: 14.4, impact: 13.6, label: "PRESSED ON THE ROPES", rate: 0.96, tier: 2 },
  { id: "rope-whip", start: 13.2, end: 15.2, impact: 14.5, label: "ROPE WHIP", rate: 1.0, tier: 2 },
  { id: "rope-rebound", start: 15.2, end: 17.2, impact: 16.4, label: "ROPE REBOUND", rate: 1.02, tier: 2 },
  { id: "rope-shoulder", start: 18.4, end: 20.0, impact: 19.5, label: "ROPE SHOULDER CHARGE", rate: 0.98, tier: 3 },
  { id: "rope-spin", start: 20.6, end: 22.8, impact: 22.0, label: "ROPE SPIN OUT", rate: 0.94, tier: 3 },
  { id: "rope-vault", start: 23.2, end: 25.6, impact: 24.8, label: "ROPE VAULT", rate: 0.9, tier: 4 },

  // Tier 5 — finishers.

  {
    id: "powerbomb-a",
    start: 34.2,
    end: 37.8,
    impact: 36.8,
    label: "POWERBOMB",
    rate: 0.86,
    tier: 5,
  },
  {
    id: "finisher-a",
    start: 14.0,
    end: 17.6,
    impact: 16.6,
    label: "SPINNING FINISHER",
    rate: 0.86,
    tier: 5,
  },
  {
    id: "rope-finisher",
    start: 21.4,
    end: 25.2,
    impact: 24.3,
    label: "TOP-ROPE FINISHER",
    rate: 0.84,
    tier: 5,
  },
  {
    id: "throw-finisher",
    start: 31.6,
    end: 35.4,
    impact: 34.4,
    label: "THROW FINISHER",
    rate: 0.84,
    tier: 5,
  },
  { id: "finisher", start: 35.6, end: 39.6, impact: 38.2, label: "FINISHER", rate: 0.84, tier: 5 },
];

/**
 * Follow-up spots played while the opponent is already down: corner climbs,
 * dives from the ropes and throws — all taken from the ground/power blocks.
 */
const FOLLOW_UPS: Move[] = [
  {
    id: "fu-splash-a",
    start: 22.8,
    end: 25.8,
    impact: 25.0,
    label: "SPLASH ON THE MAT",
    rate: 0.88,
    tier: 4,
  },
  { id: "fu-stomp", start: 25.8, end: 28.0, impact: 27.3, label: "SOCCER KICK", rate: 0.92, tier: 3 },
  {
    id: "fu-elbow-a",
    start: 26.4,
    end: 29.4,
    impact: 28.6,
    label: "ELBOW DROP",
    rate: 0.88,
    tier: 4,
  },
  {
    id: "fu-corner-a",
    start: 20.3,
    end: 23.3,
    impact: 22.5,
    label: "CORNER CLIMB",
    rate: 0.86,
    tier: 4,
  },
  { id: "fu-rope-a", start: 21.8, end: 24.9, impact: 24.1, label: "ROPE DIVE", rate: 0.86, tier: 4 },
  { id: "fu-legdrop", start: 27.0, end: 29.8, impact: 29.0, label: "LEG DROP", rate: 0.9, tier: 3 },
  {
    id: "fu-ground-a",
    start: 24.2,
    end: 27.2,
    impact: 26.3,
    label: "GROUND AND POUND",
    rate: 0.88,
    tier: 3,
  },
  {
    id: "fu-toss",
    start: 36.2,
    end: 39.6,
    impact: 38.6,
    label: "TOSS OVER THE ROPES",
    rate: 0.86,
    tier: 4,
  },
  {
    id: "fu-moonsault",
    start: 21.2,
    end: 24.6,
    impact: 23.8,
    label: "MOONSAULT",
    rate: 0.84,
    tier: 4,
  },
  {
    id: "fu-finisher-a",
    start: 33.8,
    end: 37.4,
    impact: 36.4,
    label: "FOLLOW-UP FINISHER",
    rate: 0.84,
    tier: 5,
  },
];

/** Victory pose: the winner stands over the ring with both hands raised. */
const CHAMPION_POSE = { start: 28.6, end: 30.1, rate: 0.7 };

const GIFT_TIER: Record<string, number> = {
  rose: 1,
  donut: 2,
  tiktok: 3,
  gift: 4,
  rocket: 5,
};

/** Feeling-out scenarios played when nobody is sending gifts. */
const IDLE_SCENES: Array<{ start: number; end: number; rate: number }> = [
  { start: 0.2, end: 2.4, rate: 0.8 },
  { start: 2.2, end: 4.6, rate: 0.75 },
  { start: 4.4, end: 6.8, rate: 0.8 },
  { start: 6.6, end: 9.0, rate: 0.75 },
  { start: 10.2, end: 12.6, rate: 0.82 },
  { start: 12.4, end: 14.8, rate: 0.78 },
  { start: 15.0, end: 17.4, rate: 0.8 },
  { start: 17.2, end: 19.8, rate: 0.76 },
  { start: 20.4, end: 22.6, rate: 0.74 },
  { start: 26.6, end: 29.4, rate: 0.78 },
  { start: 30.5, end: 32.8, rate: 0.8 },
  { start: 32.6, end: 35.0, rate: 0.76 },
];


function pick<T>(items: T[], avoid: string[] = [], key?: (item: T) => string): T {
  const pool = key ? items.filter((item) => !avoid.includes(key(item))) : items;
  const list = pool.length > 0 ? pool : items;
  return list[Math.floor(Math.random() * list.length)]!;
}

function movesForTier(tier: number): Move[] {
  const exact = MOVES.filter((move) => move.tier === tier);
  return exact.length > 0 ? exact : MOVES;
}

type FloatItem = { id: string; emoji: string; side: Side; left: number };
type DamageItem = { id: string; side: Side; amount: number };

type Props = {
  lang: Lang;
  /** Pace preset: speed, move frequency and anti-repetition memory. */
  difficulty?: Difficulty;
  events: GiftEvent[];
  ko: Side | null;
  combo: number;
  comboSide: Side | null;
  /** True while the referee is counting — the sequence holds on the mat. */
  paused?: boolean;
  /** The ten-count is finished, so the knockout headline is official. */
  koConfirmed?: boolean;
  /** Real-time trace of triggered moves, impacts, KO and replay. */
  onLog?: (kind: "move" | "impact" | "ko" | "replay", text: string) => void;
};

export function Arena({
  lang,
  difficulty = "normal",
  events,
  ko,
  combo,
  comboSide,
  paused = false,
  koConfirmed = true,
  onLog,
}: Props) {
  const logRef = useRef(onLog);
  logRef.current = onLog;
  const videoRef = useRef<HTMLVideoElement>(null);
  const seen = useRef<Set<string>>(new Set());
  const queue = useRef<GiftEvent[]>([]);
  const playing = useRef(false);
  const stopAt = useRef(0);
  const impactAt = useRef(0);
  const impacted = useRef(false);
  const currentEvent = useRef<GiftEvent | null>(null);
  const currentMove = useRef<Move | null>(null);
  const recentMoves = useRef<string[]>([]);
  const recentFollows = useRef<string[]>([]);
  const idleScene = useRef(IDLE_SCENES[0]!);
  const follow = useRef<{ event: GiftEvent; move: Move } | null>(null);
  const primed = useRef(false);

  const cfg = DIFFICULTY_CONFIG[difficulty];
  const cfgRef = useRef(cfg);
  cfgRef.current = cfg;

  // Low-power phones: skip the per-hit colour grading repaint, which is the
  // most expensive effect during a fast exchange.
  const [lite, setLite] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cores = navigator.hardwareConcurrency ?? 8;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    setLite(reduced || cores <= 4 || (coarse && window.innerWidth < 480));
  }, []);

  // Stop decoding frames while the tab is in the background.
  useEffect(() => {
    const onVisibility = () => {
      const video = videoRef.current;
      if (!video) return;
      if (document.hidden) video.pause();
      else void video.play();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const [attacker, setAttacker] = useState<Side>("us");
  const [crowd, setCrowd] = useState(0);
  const [replay, setReplay] = useState(false);
  const [champion, setChampion] = useState(false);
  const [impact, setImpact] = useState<{ id: string; side: Side; label: string } | null>(null);
  const [floats, setFloats] = useState<FloatItem[]>([]);
  /** Current camera framing: where in the ring the action sits. */
  const [frame, setFrame] = useState<Frame>({ x: 0, y: 0, scale: 1, rotate: 0 });
  /** Physical reaction to the last landed hit (drives the shake/stagger). */
  const [reaction, setReaction] = useState<{ id: string; kind: HitKind; dir: number } | null>(null);

  const [damages, setDamages] = useState<DamageItem[]>([]);

  const t = UI_TEXT[lang];
  const names = SIDE_NAME[lang];

  const seek = (video: HTMLVideoElement, time: number) => {
    video.currentTime = time;
  };

  /** Crowd reaction pulse, synced to hits and knockouts. */
  const cheer = (strength: number) => {
    setCrowd(strength);
    window.setTimeout(() => setCrowd(0), strength > 1 ? 2200 : 700);
  };

  // While the referee counts, the picture holds on the downed fighter.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || ko) return;
    if (paused) video.pause();
    else if (playing.current) void video.play();
  }, [paused, ko]);

  useEffect(() => {
    if (!primed.current) {
      if (events.length === 0) return;
      for (const event of events) seen.current.add(event.id);
      primed.current = true;
      return;
    }
    const fresh: GiftEvent[] = [];
    for (const event of events) {
      if (seen.current.has(event.id)) continue;
      seen.current.add(event.id);
      fresh.push(event);
    }
    queue.current.push(...fresh.slice(-5));
  }, [events]);

  // Knockout: instant slow-motion replay of the finish (~2.5s), then the loser
  // stays down on the mat. Nothing covers the ring.
  useEffect(() => {
    if (!ko) return;
    const video = videoRef.current;
    if (!video) return;
    playing.current = false;
    currentEvent.current = null;
    currentMove.current = null;
    const finisher = MOVES.find((move) => move.id === "finisher")!;
    cheer(2);
    setReplay(true);
    logRef.current?.("ko", `KO — ${ko === "ru" ? names.us : names.ru} down`);
    logRef.current?.("replay", "slow-motion replay");

    // Replay: rewind slightly before the finish and play it back in slow motion.
    video.playbackRate = 0.45;
    seek(video, Math.max(0, finisher.impact - 1.2));
    void video.play();

    let pose = 0;
    const settle = window.setTimeout(() => {
      setReplay(false);
      video.playbackRate = 0.35;
      seek(video, finisher.impact);
      void video.play();
      window.setTimeout(() => video.pause(), 900);

      // The winner then walks the ring with both hands raised.
      pose = window.setTimeout(() => {
        setChampion(true);
        video.playbackRate = CHAMPION_POSE.rate;
        seek(video, CHAMPION_POSE.start);
        void video.play();
        cheer(2);
        logRef.current?.("ko", `champion pose — ${ko === "ru" ? names.ru : names.us}`);
      }, 2600);
    }, 2500);
    return () => {
      window.clearTimeout(settle);
      window.clearTimeout(pose);
      setChampion(false);
    };
  }, [ko]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const video = videoRef.current;
      if (!video || ko) return;
      if (playing.current) return;

      // Feeling-out phase: rotate through different idle scenarios.
      const scene = idleScene.current;
      if (video.paused || video.currentTime < scene.start || video.currentTime > scene.end) {
        if (video.currentTime < scene.start || video.currentTime > scene.end) {
          idleScene.current = pick(IDLE_SCENES);
          seek(video, idleScene.current.start);
        }

        video.playbackRate = idleScene.current.rate * cfgRef.current.speed;
        void video.play();
      }

      // A big spot leaves the opponent flat on the mat — chain corner climbs and
      // dives onto the downed fighter before taking new gifts.
      if (paused) return;
      const pendingFollow = follow.current;
      const event = pendingFollow ? pendingFollow.event : queue.current.shift();
      if (!event) return;
      follow.current = null;

      const tier = GIFT_TIER[event.gift] ?? 1;
      const move = pendingFollow
        ? pendingFollow.move
        : pick(movesForTier(tier), recentMoves.current, (m) => m.id);
      recentMoves.current = [...recentMoves.current, move.id].slice(-cfgRef.current.moveMemory);

      // Chance of a follow-up: high after a big spot, still possible after a
      // chained one so we get 2-3 spot sequences without visible repetition.
      const base = pendingFollow ? 0.4 : tier >= 4 ? 0.85 : tier === 3 ? 0.55 : 0.15;
      const chance = Math.min(0.95, base * cfgRef.current.followChance);
      if (Math.random() < chance) {
        const next = pick(FOLLOW_UPS, recentFollows.current, (m) => m.id);
        recentFollows.current = [...recentFollows.current, next.id].slice(
          -cfgRef.current.followMemory,
        );
        follow.current = {
          event: { ...event, id: `${event.id}-fu${Math.random().toString(36).slice(2, 6)}` },
          move: next,
        };
      }

      const gift = GIFT_BY_ID[event.gift];

      currentEvent.current = event;
      currentMove.current = move;
      playing.current = true;
      impacted.current = false;
      stopAt.current = move.end;
      impactAt.current = move.impact;
      setAttacker(event.side);
      setFloats((previous) => [
        ...previous.slice(-3),
        {
          id: event.id,
          emoji: gift?.emoji ?? "🌹",
          side: event.side,
          left: event.side === "ru" ? 8 + Math.random() * 22 : 70 + Math.random() * 20,
        },
      ]);

      logRef.current?.("move", `${event.side.toUpperCase()} · ${move.label}`);
      // Move the wide shot to this block's corner of the ring.
      setFrame(frameFor(move));
      seek(video, move.start);
      video.playbackRate = move.rate * cfgRef.current.speed;
      void video.play();

    }, cfg.tickMs);
    return () => window.clearInterval(timer);
  }, [ko, paused, cfg.tickMs]);

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    const event = currentEvent.current;
    const move = currentMove.current;
    if (!video || !event || !move || !playing.current) return;

    if (!impacted.current && video.currentTime >= impactAt.current) {
      logRef.current?.("impact", `${move.label} connects`);
      impacted.current = true;
      const defender: Side = event.side === "ru" ? "us" : "ru";
      const gift = GIFT_BY_ID[event.gift];
      const kind = kindOf(move);
      setImpact({ id: event.id, side: defender, label: move.label });
      // Distinct physical read per hit type: jitter for punches, a step back for
      // kicks, loss of balance for throws and aerials, then a recovery.
      setReaction({ id: event.id, kind, dir: defender === "ru" ? -1 : 1 });
      window.setTimeout(
        () => setReaction((previous) => (previous?.id === event.id ? null : previous)),
        kind === "punch" ? 420 : kind === "kick" ? 700 : 1000,
      );
      cheer(move.tier >= 4 ? 1.5 : 1);
      setDamages((previous) => [
        ...previous.slice(-1),
        { id: event.id, side: defender, amount: gift?.damage ?? 4 },
      ]);
      window.setTimeout(() => setImpact(null), 600);
      window.setTimeout(
        () => setDamages((previous) => previous.filter((item) => item.id !== event.id)),
        900,
      );
    }


    if (video.currentTime >= stopAt.current) {
      playing.current = false;
      currentEvent.current = null;
      currentMove.current = null;
      idleScene.current = pick(IDLE_SCENES);
      // Between spots the fighters keep circling: drift the framing back.
      setFrame({
        x: (Math.random() - 0.5) * 5,
        y: (Math.random() - 0.5) * 1.5,
        scale: 1 + (Math.random() - 0.5) * 0.03,
        rotate: (Math.random() - 0.5) * 0.8,
      });
      seek(video, idleScene.current.start);
      video.playbackRate = idleScene.current.rate * cfgRef.current.speed;
      void video.play();

      window.setTimeout(
        () => setFloats((previous) => previous.filter((item) => item.id !== event.id)),
        900,
      );
    }
  };

  const reactionClass =
    !reaction || lite
      ? ""
      : reaction.kind === "punch"
        ? "animate-hit-punch"
        : reaction.kind === "kick"
          ? "animate-hit-kick"
          : reaction.kind === "grapple"
            ? "animate-hit-grapple"
            : "animate-hit-heavy";

  return (
    <div className="absolute inset-0 overflow-hidden bg-background">
      {/* Framing layer: shifts the wide shot around the ring (left/right,
          nearer/further, slight tilt) so the action never stays pinned. */}
      <div
        className="absolute inset-0 transition-transform duration-[900ms] ease-out"
        style={{
          transform: `translate3d(${frame.x}%, ${frame.y}%, 0) scale(${frame.scale}) rotate(${frame.rotate}deg)`,
        }}
      >
        {/* Reaction layer: per-hit physical response (jitter, step back, loss of
            balance, recovery). */}
        <div
          className={`absolute inset-0 ${reactionClass}`}
          style={{ ["--hit-dir" as string]: String(reaction?.dir ?? 1) }}
        >
          <video
            ref={videoRef}
            src={FIGHT_VIDEO}
            muted
            autoPlay
            loop
            playsInline
            preload="auto"
            aria-label={`${names.ru} versus ${names.us}`}
            onLoadedData={(event) => {
              event.currentTarget.currentTime = IDLE_SCENES[0]!.start;
              void event.currentTarget.play();
            }}
            onTimeUpdate={handleTimeUpdate}
            disablePictureInPicture
            style={{
              // Crowd/lighting: the arena lifts in brightness and contrast on every
              // landed hit so the audience in the stands stays clearly readable.
              filter: lite
                ? "brightness(1.1) contrast(1.12) saturate(1.08)"
                : `brightness(${1.08 + crowd * 0.07}) contrast(${1.1 + crowd * 0.06}) saturate(${1.05 + crowd * 0.08})`,
              contain: "paint",
              willChange: lite ? undefined : "filter",
            }}
            className="arena-video absolute inset-0 size-full object-contain object-center transition-[filter] duration-200"
          />
        </div>
      </div>


      {/* Impact state remains synchronized for commentary and logs, but visual
          labels and gift particles stay off the ring so both fighters remain
          unobstructed on small screens. */}

      {/* Knockout: no overlay panel over the ring — the loser stays down on the
          mat and only a headline sits at the top-centre of the screen. */}
      {ko && koConfirmed && (
        <div className="pointer-events-none absolute inset-x-0 top-[8%] z-20 flex flex-col items-center gap-1 text-center">
          {replay && (
            <div className="display animate-fade-in text-xs tracking-widest text-outline opacity-80 sm:text-sm">
              ● REPLAY
            </div>
          )}
          <div className="display text-5xl text-gold text-outline sm:text-7xl">{t.knockout}</div>
          <div className="display text-xl text-outline sm:text-3xl">
            {ko === "ru" ? names.us : names.ru} — {t.knockedDown}
          </div>
          {champion && (
            <div className="display animate-fade-in text-lg text-gold text-outline sm:text-2xl">
              🏆 {ko === "ru" ? names.ru : names.us}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
