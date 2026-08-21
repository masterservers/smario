import { GIFT_BY_ID } from "@/lib/battle";
import { SIDE_NAME, type Lang } from "@/lib/i18n";
import { renderRoundSummary, type RoundSummaryData } from "@/lib/roundSummary";

type Props = {
  lang: Lang;
  data: RoundSummaryData;
  onClose: () => void;
};

/**
 * End-of-round card shown in the spectator view, localized to the commentator's
 * language: score, hits per side and the top gifts of the round.
 */
export function RoundSummaryCard({ lang, data, onClose }: Props) {
  const names = SIDE_NAME[lang];
  const t = renderRoundSummary(data, lang, { ru: names.ru, us: names.us });

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-auto w-full max-w-sm rounded-2xl border border-border bg-background/85 p-3 shadow-xl backdrop-blur-md"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="display text-sm uppercase tracking-widest text-gold sm:text-base">{t.title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="grid size-6 place-items-center rounded-full border border-border text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          ✕
        </button>
      </div>

      <p className="mt-1 text-xs font-medium text-foreground">{t.score}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{t.hits}</p>
      {t.leader && (
        <p className="mt-1 text-xs" style={{ color: "var(--gold)" }}>
          🏆 {t.leader}
        </p>
      )}

      <h3 className="mt-3 text-[10px] uppercase tracking-widest text-muted-foreground">{t.gifts}</h3>
      {data.topGifts.length === 0 ? (
        <p className="mt-1 text-xs text-muted-foreground">{t.none}</p>
      ) : (
        <ul className="mt-1 flex flex-wrap gap-1.5">
          {data.topGifts.map((g) => (
            <li
              key={g.gift}
              className="flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs"
            >
              <span aria-hidden>{GIFT_BY_ID[g.gift]?.emoji ?? "🎁"}</span>
              <span className="text-muted-foreground">{g.name}</span>
              <span className="font-semibold">×{g.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
