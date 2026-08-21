import { useEffect, useRef, useState } from "react";
import fightVideo from "@/assets/arena-wide.webm.asset.json";
import { GIFT_BY_ID, type GiftEvent, type Side } from "@/lib/battle";
import { SIDE_NAME, UI_TEXT, type Lang } from "@/lib/i18n";

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

/**
 * Move library. The broadcast clip is sliced into many different windows and
 * played back at different speeds, so the same attack is rarely seen twice in
 * a row. Camera stays fixed — the footage is never mirrored.
 */
const MOVES: Move[] = [
  { id: "jab", start: 0.2, end: 1.5, impact: 1.0, label: "JAB", rate: 1.15, tier: 1 },
  { id: "hook", start: 1.3, end: 2.6, impact: 2.1, label: "HOOK", rate: 1.1, tier: 1 },
  { id: "elbow", start: 2.4, end: 3.6, impact: 3.1, label: "ELBOW", rate: 1.2, tier: 1 },
  { id: "kick", start: 4.1, end: 5.3, impact: 4.9, label: "LOW KICK", rate: 1.1, tier: 1 },

  { id: "combo", start: 0.6, end: 2.4, impact: 1.7, label: "COMBO", rate: 1.05, tier: 2 },
  { id: "clothesline", start: 3.0, end: 4.6, impact: 4.0, label: "CLOTHESLINE", rate: 1.0, tier: 2 },
  { id: "counter", start: 5.0, end: 6.4, impact: 6.0, label: "COUNTER", rate: 1.05, tier: 2 },
  { id: "knee", start: 6.2, end: 7.4, impact: 7.0, label: "FLYING KNEE", rate: 1.15, tier: 2 },

  { id: "grapple", start: 2.0, end: 4.2, impact: 3.4, label: "GRAPPLE", rate: 0.95, tier: 3 },
  { id: "suplex", start: 4.4, end: 6.6, impact: 5.8, label: "SUPLEX", rate: 0.95, tier: 3 },
  { id: "dropkick", start: 6.0, end: 7.8, impact: 7.1, label: "DROPKICK", rate: 1.05, tier: 3 },
  { id: "corner", start: 7.2, end: 9.0, impact: 8.3, label: "CORNER RUSH", rate: 1.0, tier: 3 },

  { id: "slam", start: 1.8, end: 4.4, impact: 3.6, label: "BODY SLAM", rate: 0.9, tier: 4 },
  { id: "rope-dive", start: 5.4, end: 8.0, impact: 7.2, label: "TOP-ROPE DIVE", rate: 0.9, tier: 4 },
  { id: "throw-out", start: 6.8, end: 9.6, impact: 8.6, label: "THROWN OUT OF THE RING", rate: 0.9, tier: 4 },

  { id: "splash", start: 4.0, end: 7.6, impact: 6.6, label: "SPLASH FROM THE ROPES", rate: 0.85, tier: 5 },
  { id: "finisher", start: 6.4, end: 10.0, impact: 8.8, label: "FINISHER", rate: 0.85, tier: 5 },
  { id: "powerbomb", start: 2.6, end: 6.2, impact: 5.2, label: "POWERBOMB", rate: 0.85, tier: 5 },
];

const GIFT_TIER: Record<string, number> = {
  rose: 1,
  donut: 2,
  tiktok: 3,
  gift: 4,
  rocket: 5,
};

/** Feeling-out scenarios played when nobody is sending gifts. */
const IDLE_SCENES: Array<{ start: number; end: number; rate: number }> = [
  { start: 0.2, end: 2.2, rate: 0.8 },
  { start: 2.0, end: 4.4, rate: 0.75 },
  { start: 4.2, end: 6.4, rate: 0.8 },
  { start: 6.0, end: 8.2, rate: 0.75 },
  { start: 7.8, end: 10.0, rate: 0.85 },
  { start: 1.2, end: 3.4, rate: 0.9 },
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
  events: GiftEvent[];
  ko: Side | null;
  combo: number;
  comboSide: Side | null;
};

export function Arena({ lang, events, ko, combo, comboSide }: Props) {
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
  const idleScene = useRef(IDLE_SCENES[0]!);
  const primed = useRef(false);

  const [attacker, setAttacker] = useState<Side>("us");
  const [impact, setImpact] = useState<{ id: string; side: Side; label: string } | null>(null);
  const [floats, setFloats] = useState<FloatItem[]>([]);
  const [damages, setDamages] = useState<DamageItem[]>([]);
  const t = UI_TEXT[lang];
  const names = SIDE_NAME[lang];

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

  // Freeze the fight on the downed frame when someone gets knocked out.
  useEffect(() => {
    if (!ko) return;
    const video = videoRef.current;
    if (!video) return;
    playing.current = false;
    currentEvent.current = null;
    currentMove.current = null;
    video.playbackRate = 0.5;
    const finisher = MOVES.find((move) => move.id === "finisher")!;
    video.currentTime = finisher.impact;
    void video.play();
    const timer = window.setTimeout(() => video.pause(), 1200);
    return () => window.clearTimeout(timer);
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
          video.currentTime = idleScene.current.start;
        }
        video.playbackRate = idleScene.current.rate;
        void video.play();
      }

      const event = queue.current.shift();
      if (!event) return;

      const tier = GIFT_TIER[event.gift] ?? 1;
      const move = pick(movesForTier(tier), recentMoves.current, (m) => m.id);
      recentMoves.current = [...recentMoves.current, move.id].slice(-4);

      const gift = GIFT_BY_ID[event.gift];
      currentEvent.current = event;
      currentMove.current = move;
      playing.current = true;
      impacted.current = false;
      stopAt.current = move.end;
      impactAt.current = move.impact;
      setAttacker(event.side);
      setFloats((previous) => [
        ...previous.slice(-8),
        {
          id: event.id,
          emoji: gift?.emoji ?? "🌹",
          side: event.side,
          left: event.side === "ru" ? 8 + Math.random() * 22 : 70 + Math.random() * 20,
        },
      ]);

      video.currentTime = move.start;
      video.playbackRate = move.rate;
      void video.play();
    }, 80);
    return () => window.clearInterval(timer);
  }, [ko]);

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    const event = currentEvent.current;
    const move = currentMove.current;
    if (!video || !event || !move || !playing.current) return;

    if (!impacted.current && video.currentTime >= impactAt.current) {
      impacted.current = true;
      const defender: Side = event.side === "ru" ? "us" : "ru";
      const gift = GIFT_BY_ID[event.gift];
      setImpact({ id: event.id, side: defender, label: move.label });
      setDamages((previous) => [
        ...previous.slice(-3),
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
      video.currentTime = idleScene.current.start;
      video.playbackRate = idleScene.current.rate;
      void video.play();
      window.setTimeout(
        () => setFloats((previous) => previous.filter((item) => item.id !== event.id)),
        900,
      );
    }
  };

  return (
    <div className="absolute inset-0 overflow-hidden bg-background">
      <video
        ref={videoRef}
        src={fightVideo.url}
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
        className="absolute inset-0 size-full object-contain"
      />

      {impact && !ko && (
        <div className="pointer-events-none absolute inset-0 animate-arena-impact">
          <div className="display absolute left-1/2 top-[14%] -translate-x-1/2 text-2xl text-gold text-outline sm:text-4xl">
            {impact.label}
          </div>
          <div
            className={`absolute top-[46%] text-5xl ${impact.side === "ru" ? "left-[27%]" : "right-[27%]"}`}
          >
            💥
          </div>
        </div>
      )}

      {damages.map((damage) => (
        <div
          key={damage.id}
          className={`display pointer-events-none absolute top-[34%] animate-pop-damage text-4xl text-destructive text-outline ${damage.side === "ru" ? "left-[22%]" : "right-[22%]"}`}
        >
          -{damage.amount}
        </div>
      ))}

      {floats.map((item) => (
        <div
          key={item.id}
          className="pointer-events-none absolute bottom-[13%] animate-float-gift text-4xl"
          style={{ left: `${item.left}%` }}
        >
          {item.emoji}
        </div>
      ))}

      {combo > 2 && comboSide && !ko && (
        <div
          className={`display absolute top-[13%] z-10 border border-border bg-background/75 px-2 py-0.5 text-xl text-outline ${comboSide === "ru" ? "left-3" : "right-3"}`}
        >
          +{combo} COMBO
        </div>
      )}

      {/* Knockout: no overlay panel over the ring — the loser stays down on the
          mat and only a headline sits at the top-centre of the screen. */}
      {ko && (
        <div className="pointer-events-none absolute inset-x-0 top-[8%] z-20 flex flex-col items-center gap-1 text-center">
          <div className="display text-5xl text-gold text-outline sm:text-7xl">{t.knockout}</div>
          <div className="display text-xl text-outline sm:text-3xl">
            {ko === "ru" ? names.us : names.ru} — {t.knockedDown}
          </div>
        </div>
      )}
    </div>
  );
}
