import type { Side } from "@/lib/battle";
import { UI_TEXT, type Lang } from "@/lib/i18n";

type Row = { sender: string; total: number; side: Side };

export function Leaderboard({ lang, rows }: { lang: Lang; rows: Row[] }) {
  const t = UI_TEXT[lang];

  return (
    <div className="panel rounded-2xl p-3">
      <div className="flex items-center justify-between">
        <h2 className="display text-lg text-gold">🔥 {t.leaderboard}</h2>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
          {t.topSupporters}
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">{t.noSupporters}</p>
      ) : (
        <ol className="mt-2 space-y-1">
          {rows.map((row, i) => (
            <li
              key={row.sender}
              className="flex items-center gap-2 rounded-lg bg-secondary/40 px-2 py-1.5 text-sm"
            >
              <span className="display w-5 text-gold">{i + 1}</span>
              <span
                className="size-2 rounded-full"
                style={{ background: row.side === "ru" ? "var(--ru)" : "var(--us)" }}
              />
              <span className="min-w-0 flex-1 truncate">{row.sender}</span>
              <span className="display text-base">{row.total}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
