import { GIFT_BY_ID, MAX_HP, type GiftEvent } from "@/lib/battle";
import { SIDE_NAME, UI_TEXT, type Lang } from "@/lib/i18n";
import { formatDuration, summarizeMatch } from "@/lib/replay";

type Props = {
  lang: Lang;
  events: GiftEvent[];
  /** Optional call-to-action, e.g. open the replay of this match. */
  action?: React.ReactNode;
};

/** End-of-match card: score, HP/KO, gifts and the knockdown/knockout moments. */
export function MatchSummary({ lang, events, action }: Props) {
  const t = UI_TEXT[lang];
  const names = SIDE_NAME[lang];
  const s = summarizeMatch(events);
  const winner = s.ko ? (s.ko === "ru" ? names.ruTeam : names.usTeam) : null;

  return (
    <section className="max-h-[42dvh] overflow-y-auto rounded-lg border border-border bg-background/85 p-3 backdrop-blur-md">
      <header className="flex items-baseline justify-between gap-2">
        <h2 className="display text-base sm:text-lg">{t.summary}</h2>
        <span className="text-[11px] text-muted-foreground">
          {t.duration} {formatDuration(s.durationMs)}
        </span>
      </header>

      <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
        <div>
          <div className="display" style={{ color: "var(--ru-glow)" }}>
            🇷🇺 {names.ruTeam} · {s.scoreRu}
          </div>
          <div className="text-[11px] text-muted-foreground">
            HP {s.hpRu}/{MAX_HP}
          </div>
        </div>
        <div className="text-right">
          <div className="display" style={{ color: "var(--us-glow)" }}>
            {s.scoreUs} · {names.usTeam} 🇺🇸
          </div>
          <div className="text-[11px] text-muted-foreground">
            HP {s.hpUs}/{MAX_HP}
          </div>
        </div>
      </div>

      {winner && (
        <p className="display mt-2 text-center text-gold">
          🏆 {t.winner}: {winner} — {t.knockout}
        </p>
      )}

      <h3 className="mt-3 text-[10px] uppercase tracking-widest text-muted-foreground">
        {t.giftsSent}
      </h3>
      <ul className="mt-1 flex flex-wrap gap-1.5 text-xs">
        {s.gifts.map((g) => (
          <li key={g.gift} className="rounded-full border border-border px-2 py-0.5">
            {GIFT_BY_ID[g.gift]?.emoji} {t.gifts[g.gift]} ×{g.count} · {g.value}
          </li>
        ))}
        {s.gifts.length === 0 && <li className="text-muted-foreground">{t.noSupporters}</li>}
      </ul>

      <h3 className="mt-3 text-[10px] uppercase tracking-widest text-muted-foreground">
        {t.keyMoments}
      </h3>
      <ol className="mt-1 space-y-0.5 text-xs">
        {s.moments.map((m) => (
          <li key={m.id} className="flex gap-1.5">
            <span className="shrink-0">
              {m.kind === "knockout" ? "🏁" : m.kind === "knockdown" ? "🥊" : "💥"}
            </span>
            <span className="min-w-0 break-words">
              {m.kind === "knockout" ? t.knockout : m.kind === "knockdown" ? t.knockdown : ""}{" "}
              {m.side === "ru" ? names.ru : names.us} · {m.sender} {GIFT_BY_ID[m.gift]?.emoji}
            </span>
          </li>
        ))}
        {s.moments.length === 0 && <li className="text-muted-foreground">—</li>}
      </ol>

      {action && <div className="mt-3">{action}</div>}
    </section>
  );
}
