import { useEffect, useRef, useState } from "react";
import { GIFT_BY_ID, type GiftEvent, type Side } from "@/lib/battle";
import { SIDE_NAME, UI_TEXT, type Lang } from "@/lib/i18n";

type Sequence = {
  start: number;
  end: number;
  impact: number;
  label: string;
};

const SEQUENCES: Record<string, Sequence> = {
  rose: { start: 4.4, end: 8.2, impact: 6.2, label: "BODY SHOT" },
  donut: { start: 8.1, end: 12.2, impact: 10.4, label: "COUNTER" },
  tiktok: { start: 12.1, end: 17.4, impact: 15.2, label: "GRAPPLE" },
  gift: { start: 19.1, end: 24.8, impact: 23.1, label: "TAKEDOWN" },
  rocket: { start: 23.0, end: 29.8, impact: 25.2, label: "FINISHER" },
};

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

  useEffect(() => {
    const timer = window.setInterval(() => {
      const video = videoRef.current;
      if (!video || ko || playing.current) return;
      const event = queue.current.shift();
      if (!event) return;

      const sequence = SEQUENCES[event.gift] ?? SEQUENCES['rose'];
      if (!sequence) return;
      const gift = GIFT_BY_ID[event.gift];
      currentEvent.current = event;
      playing.current = true;
      impacted.current = false;
      stopAt.current = sequence.end;
      impactAt.current = sequence.impact;
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

      video.currentTime = sequence.start;
      void video.play();
    }, 80);
    return () => window.clearInterval(timer);
  }, [ko]);

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    const event = currentEvent.current;
    if (!video || !event || !playing.current) return;
    const sequence = SEQUENCES[event.gift] ?? SEQUENCES['rose'];
    if (!sequence) return;

    if (!impacted.current && video.currentTime >= impactAt.current) {
      impacted.current = true;
      const defender: Side = event.side === "ru" ? "us" : "ru";
      const gift = GIFT_BY_ID[event.gift];
      setImpact({ id: event.id, side: defender, label: sequence.label });
      setDamages((previous) => [
        ...previous.slice(-3),
        { id: event.id, side: defender, amount: gift?.damage ?? 4 },
      ]);
      window.setTimeout(() => setImpact(null), 500);
      window.setTimeout(
        () => setDamages((previous) => previous.filter((item) => item.id !== event.id)),
        900,
      );
    }

    if (video.currentTime >= stopAt.current) {
      video.pause();
      playing.current = false;
      currentEvent.current = null;
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
        src="/media/arena-fight.webm"
        muted
        playsInline
        preload="auto"
        aria-label={`${names.ru} versus ${names.us}`}
        onLoadedMetadata={(event) => {
          event.currentTarget.currentTime = 4.4;
        }}
        onTimeUpdate={handleTimeUpdate}
        className={`absolute inset-0 size-full object-contain transition-transform duration-300 ${attacker === "ru" ? "-scale-x-100" : "scale-x-100"}`}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-background/25" />


      {impact && (
        <div className="pointer-events-none absolute inset-0 animate-arena-impact">
          <div className="display absolute left-1/2 top-[22%] -translate-x-1/2 text-4xl text-gold text-outline sm:text-6xl">
            {impact.label}
          </div>
          <div
            className={`absolute top-[43%] text-7xl ${impact.side === "ru" ? "left-[24%]" : "right-[24%]"}`}
          >
            💥
          </div>
        </div>
      )}

      {damages.map((damage) => (
        <div
          key={damage.id}
          className={`display pointer-events-none absolute top-[34%] animate-pop-damage text-5xl text-destructive text-outline ${damage.side === "ru" ? "left-[18%]" : "right-[18%]"}`}
        >
          -{damage.amount}
        </div>
      ))}

      {floats.map((item) => (
        <div
          key={item.id}
          className="pointer-events-none absolute bottom-[18%] animate-float-gift text-5xl"
          style={{ left: `${item.left}%` }}
        >
          {item.emoji}
        </div>
      ))}

      {combo > 2 && comboSide && !ko && (
        <div
          className={`display absolute top-[18%] z-10 border border-border bg-background/75 px-3 py-1 text-2xl text-outline backdrop-blur-md ${comboSide === "ru" ? "left-3" : "right-3"}`}
        >
          +{combo} COMBO
        </div>
      )}

      {ko && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-background/75 text-center backdrop-blur-sm">
          <div className="display text-6xl text-gold text-outline sm:text-8xl">{t.knockout}</div>
          <div className="display text-3xl sm:text-5xl">
            {ko === "ru" ? names.ru : names.us} {t.wins}
          </div>
          <div className="text-sm text-muted-foreground">{t.nextMatch}</div>
        </div>
      )}
    </div>
  );
}