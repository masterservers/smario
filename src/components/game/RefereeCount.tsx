import type { RefereeState } from "@/hooks/useReferee";
import { SIDE_NAME, UI_TEXT, type Lang } from "@/lib/i18n";

type Props = { lang: Lang; referee: RefereeState };

/**
 * Minimal ring-count readout. It sits on the side opposite the fighter who is
 * down, so the mat — and both fighters — stay fully visible while the referee
 * counts him out.
 */
export function RefereeCount({ lang, referee }: Props) {
  if (!referee.side || referee.count === 0) return null;
  const t = UI_TEXT[lang];
  const names = SIDE_NAME[lang];
  const downed = referee.side === "ru" ? names.ru : names.us;
  // Downed on the left (ru) → the count is shown on the right, and vice versa.
  const onRight = referee.side === "ru";

  return (
    <div
      className={`referee-count pointer-events-none absolute top-[42%] z-20 flex max-w-[34vw] flex-col gap-0.5 ${
        onRight ? "right-[3%] items-end text-right" : "left-[3%] items-start text-left"
      }`}
    >
      <div className="display text-[9px] tracking-[0.3em] text-outline opacity-80 sm:text-xs">
        🧑‍⚖️ {t.referee} · {t.count}
      </div>
      <div
        key={referee.count}
        className={`display animate-pop-damage text-outline ${referee.final ? "text-destructive" : "text-gold"} text-4xl leading-none sm:text-6xl`}
      >
        {referee.count}
        <span className="text-base opacity-70 sm:text-xl">/{referee.final ? 10 : 8}</span>
      </div>
      <div className="display text-[10px] text-outline sm:text-sm">{downed}</div>
    </div>
  );
}
