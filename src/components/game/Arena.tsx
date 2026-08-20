import { useEffect, useRef, useState } from "react";
import arenaBg from "@/assets/arena.jpg";
import putinImg from "@/assets/putin-fighter.png";
import trumpImg from "@/assets/trump-fighter.png";
import refereeImg from "@/assets/referee.png";
import { GIFT_BY_ID, type GiftEvent, type Side } from "@/lib/battle";
import { SIDE_NAME, UI_TEXT, type Lang } from "@/lib/i18n";

type MoveId = "jab" | "kick" | "clothesline" | "slam" | "powerbomb";

type MoveSpec = {
  attack: string;
  react: string;
  duration: number;
  impactAt: number;
  label: string;
  dust: boolean;
};

const MOVES: Record<MoveId, MoveSpec> = {
  jab: { attack: "mv-jab", react: "df-recoil", duration: 900, impactAt: 340, label: "JAB", dust: false },
  kick: { attack: "mv-kick", react: "df-stagger", duration: 1150, impactAt: 470, label: "DROPKICK", dust: false },
  clothesline: {
    attack: "mv-clothesline",
    react: "df-flip",
    duration: 1350,
    impactAt: 560,
    label: "CLOTHESLINE",
    dust: true,
  },
  slam: { attack: "mv-slam", react: "df-slammed", duration: 1750, impactAt: 800, label: "BODY SLAM", dust: true },
  powerbomb: {
    attack: "mv-powerbomb",
    react: "df-launched",
    duration: 1950,
    impactAt: 900,
    label: "POWERBOMB",
    dust: true,
  },
};

function moveForValue(value: number): MoveId {
  if (value >= 25) return "powerbomb";
  if (value >= 10) return "slam";
  if (value >= 5) return "clothesline";
  if (value >= 2) return "kick";
  return "jab";
}

type Action = { event: GiftEvent; move: MoveId };
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
  const t = UI_TEXT[lang];
  const names = SIDE_NAME[lang];

  const [action, setAction] = useState<Action | null>(null);
  const [impact, setImpact] = useState<{ id: string; side: Side; label: string; dust: boolean } | null>(null);
  const [floats, setFloats] = useState<FloatItem[]>([]);
  const [damages, setDamages] = useState<DamageItem[]>([]);

  const seen = useRef<Set<string>>(new Set());
  const queue = useRef<GiftEvent[]>([]);
  const busy = useRef(false);
  const timers = useRef<number[]>([]);
  const primed = useRef(false);

  // Collect newly arrived gifts into the choreography queue.
  useEffect(() => {
    const fresh: GiftEvent[] = [];
    for (const e of events) {
      if (seen.current.has(e.id)) continue;
      seen.current.add(e.id);
      fresh.push(e);
    }
    if (!primed.current) {
      // Skip replaying the whole match history on first load.
      primed.current = true;
      return;
    }
    if (fresh.length) queue.current.push(...fresh.slice(-4));
  }, [events]);

  // Play queued moves one at a time so each throw finishes cleanly.
  useEffect(() => {
    const tick = window.setInterval(() => {
      if (busy.current || ko) return;
      const next = queue.current.shift();
      if (!next) return;
      busy.current = true;

      const gift = GIFT_BY_ID[next.gift];
      const move = moveForValue(gift?.value ?? 1);
      const spec = MOVES[move];
      const defender: Side = next.side === "ru" ? "us" : "ru";

      setAction({ event: next, move });
      setFloats((prev) => [
        ...prev.slice(-10),
        {
          id: next.id,
          emoji: gift?.emoji ?? "🌹",
          side: next.side,
          left: next.side === "ru" ? 8 + Math.random() * 26 : 64 + Math.random() * 26,
        },
      ]);

      timers.current.push(
        window.setTimeout(() => {
          setImpact({ id: next.id, side: defender, label: spec.label, dust: spec.dust });
          setDamages((prev) => [
            ...prev.slice(-4),
            { id: next.id, side: defender, amount: gift?.damage ?? 4 },
          ]);
        }, spec.impactAt),
        window.setTimeout(() => setImpact(null), spec.impactAt + 700),
        window.setTimeout(() => {
          setDamages((prev) => prev.filter((d) => d.id !== next.id));
        }, spec.impactAt + 1200),
        window.setTimeout(() => setFloats((prev) => prev.filter((f) => f.id !== next.id)), 2400),
        window.setTimeout(() => {
          setAction(null);
          busy.current = false;
        }, spec.duration),
      );
    }, 90);

    return () => {
      window.clearInterval(tick);
      timers.current.forEach((id) => window.clearTimeout(id));
      timers.current = [];
    };
  }, [ko]);

  const fighterStyle = (side: Side): React.CSSProperties => {
    const toward = side === "ru" ? 1 : -1;
    if (ko) {
      return ko === side
        ? { animation: "fighter-idle 2.6s ease-in-out infinite" }
        : {
            animation: `${side === "ru" ? "ko-fall-left" : "ko-fall-right"} 0.7s ease-in forwards`,
          };
    }
    if (action) {
      const spec = MOVES[action.move];
      const isAttacker = action.event.side === side;
      return {
        ["--dir" as string]: isAttacker ? toward : -toward,
        animation: `${isAttacker ? spec.attack : spec.react} ${spec.duration}ms cubic-bezier(0.22, 0.9, 0.28, 1) both`,
        zIndex: isAttacker ? 3 : 2,
      };
    }
    return { animation: "fighter-idle 2.6s ease-in-out infinite" };
  };

  const shaking = impact !== null;

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{ animation: shaking ? "arena-shake 0.45s ease-out" : undefined }}
      >
        <img
          src={arenaBg}
          alt=""
          width={1920}
          height={1088}
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/60" />

        {/* Referee */}
        <img
          src={refereeImg}
          alt={t.referee}
          width={640}
          height={1024}
          loading="lazy"
          className="absolute bottom-[14%] left-1/2 h-[30%] w-[15%] -translate-x-1/2 object-contain object-bottom opacity-90 drop-shadow-[0_10px_20px_rgba(0,0,0,0.7)]"
          style={{ animation: "ref-wave 3.4s ease-in-out infinite" }}
        />

        {/* Fighters */}
        <img
          src={putinImg}
          alt={names.ru}
          width={768}
          height={1024}
          className="absolute bottom-[8%] left-[3%] h-[56%] w-[30%] origin-bottom object-contain object-bottom drop-shadow-[0_18px_28px_rgba(0,0,0,0.75)]"
          style={fighterStyle("ru")}
        />
        <img
          src={trumpImg}
          alt={names.us}
          width={768}
          height={1024}
          className="absolute bottom-[8%] right-[3%] h-[56%] w-[30%] origin-bottom object-contain object-bottom drop-shadow-[0_18px_28px_rgba(0,0,0,0.75)]"
          style={fighterStyle("us")}
        />

        {/* Impact */}
        {impact && (
          <>
            <div
              key={`burst-${impact.id}`}
              className="pointer-events-none absolute top-[36%] text-6xl sm:text-8xl"
              style={{
                left: impact.side === "us" ? "58%" : "24%",
                animation: "impact-burst 0.55s ease-out forwards",
                zIndex: 4,
              }}
            >
              💥
            </div>
            <div
              key={`label-${impact.id}`}
              className="display pointer-events-none absolute top-[24%] left-1/2 -translate-x-1/2 text-3xl text-outline sm:text-5xl"
              style={{ color: "var(--gold)", animation: "pop-damage 0.9s ease-out forwards", zIndex: 4 }}
            >
              {impact.label}
            </div>
            <div
              key={`line-${impact.id}`}
              className="pointer-events-none absolute top-[42%] left-[12%] h-[3px] w-[76%] rounded-full bg-white/70"
              style={{ animation: "speed-line 0.4s ease-out forwards" }}
            />
            {impact.dust && (
              <div
                key={`dust-${impact.id}`}
                className="pointer-events-none absolute bottom-[7%] h-[9%] w-[42%] rounded-[50%] bg-white/35 blur-md"
                style={{
                  left: impact.side === "us" ? "66%" : "34%",
                  animation: "mat-dust 0.75s ease-out forwards",
                }}
              />
            )}
          </>
        )}

        {/* Damage numbers */}
        {damages.map((d) => (
          <div
            key={`dmg-${d.id}`}
            className="display pointer-events-none absolute top-[30%] text-3xl text-outline sm:text-5xl"
            style={{
              left: d.side === "ru" ? "14%" : "74%",
              color: "var(--hp-bad)",
              animation: "pop-damage 1.1s ease-out forwards",
              zIndex: 4,
            }}
          >
            -{d.amount}
          </div>
        ))}

        {/* Floating gifts */}
        {floats.map((f) => (
          <div
            key={`f-${f.id}`}
            className="pointer-events-none absolute bottom-[16%] text-3xl sm:text-5xl"
            style={{ left: `${f.left}%`, animation: "float-gift 2.3s ease-out forwards", zIndex: 4 }}
          >
            {f.emoji}
          </div>
        ))}

        {/* Combo badge */}
        {combo > 2 && comboSide && !ko && (
          <div
            className="display absolute top-[18%] rounded-full px-3 py-1 text-xl text-outline sm:text-3xl"
            style={{
              left: comboSide === "ru" ? "4%" : undefined,
              right: comboSide === "us" ? "4%" : undefined,
              background: comboSide === "ru" ? "var(--ru)" : "var(--us)",
              boxShadow: comboSide === "ru" ? "var(--shadow-glow-ru)" : "var(--shadow-glow-us)",
              zIndex: 4,
            }}
          >
            +{combo} COMBO
          </div>
        )}

        {/* Knockout overlay */}
        {ko && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/65 text-center">
            <div className="display text-6xl text-outline sm:text-8xl" style={{ color: "var(--gold)" }}>
              {t.knockout}
            </div>
            <div className="display text-3xl sm:text-5xl">
              {ko === "ru" ? names.ru : names.us} {t.wins}
            </div>
            <div className="text-sm text-muted-foreground">{t.nextMatch}</div>
          </div>
        )}
      </div>
    </div>
  );
}
