import type { RefereeState } from "@/hooks/useReferee";
import { SIDE_NAME, UI_TEXT, type Lang } from "@/lib/i18n";

type Props = { lang: Lang; referee: RefereeState };

/**
 * Minimal ring-count readout: the number the referee is on, top-centre,
 * nothing covering the fighters.
 */
export function RefereeCount({ lang, referee }: Props) {
  if (!referee.side || referee.count === 0 || referee.koConfirmed) return null;
  const t = UI_TEXT[lang];
  const names = SIDE_NAME[lang];
  const downed = referee.side === "ru" ? names.ru : names.us;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-[18%] z-20 flex flex-col items-center gap-0.5 text-center sm:top-[12%]">
      <div className="display text-[10px] tracking-[0.3em] text-outline opacity-80 sm:text-xs">
        🧑‍⚖️ {t.referee} · {t.count}
      </div>
      <div
        key={referee.count}
        className={`display animate-pop-damage text-outline ${referee.final ? "text-destructive" : "text-gold"} text-6xl sm:text-8xl`}
      >
        {referee.count}
      </div>
      <div className="display text-sm text-outline sm:text-lg">{downed}</div>
    </div>
  );
}
