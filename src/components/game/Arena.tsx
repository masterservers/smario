import { useEffect, useRef, useState } from "react";
import arenaBg from "@/assets/arena.jpg";
import putinImg from "@/assets/putin-fighter.png";
import trumpImg from "@/assets/trump-fighter.png";
import refereeImg from "@/assets/referee.png";
import { GIFT_BY_ID, type GiftEvent, type Side } from "@/lib/battle";
import { SIDE_NAME, UI_TEXT, type Lang } from "@/lib/i18n";

type FloatItem = { id: string; emoji: string; side: Side; left: number };
type DamageItem = { id: string; side: Side; amount: number };

type Props = {
  lang: Lang;
  lastEvent: GiftEvent | undefined;
  ko: Side | null;
  combo: number;
  comboSide: Side | null;
};

export function Arena({ lang, lastEvent, ko, combo, comboSide }: Props) {
  const t = UI_TEXT[lang];
  const names = SIDE_NAME[lang];
  const [attacker, setAttacker] = useState<Side | null>(null);
  const [burst, setBurst] = useState<{ id: string; side: Side } | null>(null);
  const [floats, setFloats] = useState<FloatItem[]>([]);
  const [damages, setDamages] = useState<DamageItem[]>([]);
  const [shake, setShake] = useState(0);
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (!lastEvent || handled.current === lastEvent.id) return;
    handled.current = lastEvent.id;
    const gift = GIFT_BY_ID[lastEvent.gift];
    const side = lastEvent.side;

    setAttacker(side);
    setBurst({ id: lastEvent.id, side });
    setShake((s) => s + 1);
    setFloats((prev) => [
      ...prev.slice(-12),
      {
        id: lastEvent.id,
        emoji: gift?.emoji ?? "🌹",
        side,
        left: side === "ru" ? 8 + Math.random() * 28 : 62 + Math.random() * 28,
      },
    ]);
    setDamages((prev) => [
      ...prev.slice(-6),
      { id: lastEvent.id, side: side === "ru" ? "us" : "ru", amount: gift?.damage ?? 4 },
    ]);

    const a = window.setTimeout(() => setAttacker(null), 620);
    const b = window.setTimeout(() => setBurst(null), 500);
    const c = window.setTimeout(
      () => setFloats((prev) => prev.filter((f) => f.id !== lastEvent.id)),
      2200,
    );
    const d = window.setTimeout(
      () => setDamages((prev) => prev.filter((f) => f.id !== lastEvent.id)),
      1200,
    );
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
      window.clearTimeout(c);
      window.clearTimeout(d);
    };
  }, [lastEvent]);

  const fighterAnim = (side: Side) => {
    if (ko) {
      return ko === side
        ? "fighter-idle 2.6s ease-in-out infinite"
        : `${side === "ru" ? "ko-fall-left" : "ko-fall-right"} 0.7s ease-in forwards`;
    }
    if (attacker === side) {
      return `${side === "ru" ? "attack-right" : "attack-left"} 0.6s ease-out`;
    }
    if (attacker && attacker !== side) {
      return `${side === "ru" ? "recoil-left" : "recoil-right"} 0.6s ease-out`;
    }
    return "fighter-idle 2.6s ease-in-out infinite";
  };

  return (
    <div
      key={`shake-${shake}`}
      className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-border sm:aspect-[16/10]"
      style={{ animation: attacker ? "arena-shake 0.45s ease-out" : undefined }}
    >
      <img
        src={arenaBg}
        alt=""
        width={1920}
        height={1088}
        className="absolute inset-0 size-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/50" />

      {/* Referee */}
      <img
        src={refereeImg}
        alt={t.referee}
        width={640}
        height={1024}
        loading="lazy"
        className="absolute bottom-[16%] left-1/2 h-[34%] -translate-x-1/2 object-contain opacity-95 drop-shadow-[0_10px_20px_rgba(0,0,0,0.7)]"
        style={{ animation: "ref-wave 3.4s ease-in-out infinite" }}
      />

      {/* Fighters */}
      <img
        src={putinImg}
        alt={names.ru}
        width={768}
        height={1024}
        className="absolute bottom-[8%] left-[4%] h-[62%] origin-bottom object-contain drop-shadow-[0_18px_28px_rgba(0,0,0,0.75)]"
        style={{ animation: fighterAnim("ru") }}
      />
      <img
        src={trumpImg}
        alt={names.us}
        width={768}
        height={1024}
        className="absolute bottom-[8%] right-[4%] h-[62%] origin-bottom object-contain drop-shadow-[0_18px_28px_rgba(0,0,0,0.75)]"
        style={{ animation: fighterAnim("us") }}
      />

      {/* Impact burst on the defender */}
      {burst && (
        <div
          key={burst.id}
          className="pointer-events-none absolute top-[34%] text-5xl sm:text-7xl"
          style={{
            left: burst.side === "ru" ? "62%" : "26%",
            animation: "impact-burst 0.5s ease-out forwards",
          }}
        >
          💥
        </div>
      )}

      {/* Damage numbers */}
      {damages.map((d) => (
        <div
          key={`dmg-${d.id}`}
          className="pointer-events-none absolute top-[28%] display text-2xl text-outline sm:text-4xl"
          style={{
            left: d.side === "ru" ? "16%" : "72%",
            color: "var(--hp-bad)",
            animation: "pop-damage 1.1s ease-out forwards",
          }}
        >
          -{d.amount}
        </div>
      ))}

      {/* Floating gifts */}
      {floats.map((f) => (
        <div
          key={`f-${f.id}`}
          className="pointer-events-none absolute bottom-[14%] text-3xl sm:text-4xl"
          style={{ left: `${f.left}%`, animation: "float-gift 2.1s ease-out forwards" }}
        >
          {f.emoji}
        </div>
      ))}

      {/* Combo badge */}
      {combo > 2 && comboSide && !ko && (
        <div
          className="display absolute top-3 rounded-full px-3 py-1 text-xl text-outline sm:text-2xl"
          style={{
            left: comboSide === "ru" ? "4%" : undefined,
            right: comboSide === "us" ? "4%" : undefined,
            background: comboSide === "ru" ? "var(--ru)" : "var(--us)",
            boxShadow: comboSide === "ru" ? "var(--shadow-glow-ru)" : "var(--shadow-glow-us)",
          }}
        >
          +{combo} COMBO
        </div>
      )}

      {/* Knockout overlay */}
      {ko && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/65 text-center">
          <div
            className="display text-5xl text-outline sm:text-7xl"
            style={{ color: "var(--gold)" }}
          >
            {t.knockout}
          </div>
          <div className="display text-2xl sm:text-4xl">
            {ko === "ru" ? names.ru : names.us} {t.wins}
          </div>
          <div className="text-sm text-muted-foreground">{t.nextMatch}</div>
        </div>
      )}
    </div>
  );
}
