import { useEffect, useRef, useState } from "react";
import { MAX_HP, type Side } from "@/lib/battle";
import { UI_TEXT, type Lang } from "@/lib/i18n";
import { sideNames, useAdminConfig } from "@/lib/adminConfig";

type Props = {
  lang: Lang;
  round: number;
  viewers: number;
  scoreRu: number;
  scoreUs: number;
  hpRu: number;
  hpUs: number;
  leader: Side | null;
  /** Current match id — a new match restarts the round clock. */
  matchId?: string | null;
  /** Knockout side, if any — the clock freezes and resets on the next match. */
  ko?: Side | null;
  /** True once the referee's ten-count is complete. */
  koConfirmed?: boolean;
  /** Referee / gift announcement currently on air, spoken in the same language. */
  banner?: { text: string; tone: "ref" | "gift" | "hit" } | null;
};

function clock(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Round clock: starts with the match, freezes on KO, resets on the next one. */
function useRoundClock(matchId: string | null | undefined, round: number, ko: Side | null | undefined) {
  const startRef = useRef<number>(Date.now());
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    startRef.current = Date.now();
    setElapsed(0);
  }, [matchId, round]);

  useEffect(() => {
    if (ko) return;
    const id = window.setInterval(() => setElapsed(Date.now() - startRef.current), 500);
    return () => window.clearInterval(id);
  }, [ko, matchId, round]);

  return { time: clock(elapsed), elapsed };
}

function hpColor(hp: number) {
  if (hp > 55) return "var(--hp-good)";
  if (hp > 25) return "var(--hp-warn)";
  return "var(--hp-bad)";
}

function HpBar({ hp, align }: { hp: number; align: "left" | "right" }) {
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-background/70 ring-1 ring-border">
      <div
        className="h-full transition-[width] duration-500 ease-out"
        style={{
          width: `${(hp / MAX_HP) * 100}%`,
          background: hpColor(hp),
          marginLeft: align === "right" ? "auto" : undefined,
        }}
      />
    </div>
  );
}

export function Scoreboard({
  lang,
  round,
  viewers,
  scoreRu,
  scoreUs,
  hpRu,
  hpUs,
  leader,
  matchId,
  ko,
  koConfirmed,
  banner,
}: Props) {
  const t = UI_TEXT[lang];
  useAdminConfig();
  const names = sideNames(lang);
  const { time, elapsed } = useRoundClock(matchId, round, ko);

  // Referee calls and gift ticker — driven by useTopBanner, which speaks the
  // very same line. Fallback keeps the round call visible right after a start.
  let call: string | null = banner?.text ?? null;
  if (!call && koConfirmed) call = t.refKoConfirmed;
  else if (!call && !ko && elapsed < 3200) call = round > 1 ? t.refNextRound : t.refRoundStart;

  return (
    <div className="pointer-events-none mx-auto mt-1 w-full max-w-[44rem] rounded-full border border-border bg-background/55 px-3 py-1 backdrop-blur-md">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-base leading-none sm:text-lg">🇷🇺</span>
            <span
              className="display truncate text-xs leading-none sm:text-sm"
              style={{ color: "var(--ru-glow)" }}
            >
              {names.ruTeam} · {names.ru}
            </span>
            {leader === "ru" && <span className="text-xs">👑</span>}
            <span className="display ml-auto text-xl leading-none sm:text-3xl" style={{ color: "var(--ru-glow)" }}>
              {scoreRu}
            </span>
          </div>
          <div className="mt-0.5">
            <HpBar hp={hpRu} align="left" />
          </div>
        </div>

        <div className="flex flex-col items-center px-1 leading-none">
          <span className="display text-sm text-gold sm:text-base">VS</span>
          <span className="display mt-0.5 text-xs tabular-nums text-gold sm:text-sm">{time}</span>
          <span className="mt-0.5 text-[8px] uppercase text-muted-foreground sm:text-[9px]">
            {t.round} {round} · {viewers}
          </span>
          {call && (
            <span
              className="display mt-0.5 max-w-[42vw] truncate whitespace-nowrap text-[9px] uppercase tracking-wide sm:text-[11px]"
              style={{
                color:
                  banner?.tone === "gift"
                    ? "var(--ru-glow)"
                    : banner?.tone === "hit"
                      ? "var(--us-glow)"
                      : "var(--gold, currentColor)",
              }}
              role="status"
            >
              {call}
            </span>
          )}
        </div>

        <div className="min-w-0 text-right">
          <div className="flex items-center justify-end gap-1.5">
            <span className="display mr-auto text-xl leading-none sm:text-3xl" style={{ color: "var(--us-glow)" }}>
              {scoreUs}
            </span>
            {leader === "us" && <span className="text-xs">👑</span>}
            <span
              className="display truncate text-xs leading-none sm:text-sm"
              style={{ color: "var(--us-glow)" }}
            >
              {names.us} · {names.usTeam}
            </span>
            <span className="text-base leading-none sm:text-lg">🇺🇸</span>
          </div>
          <div className="mt-0.5">
            <HpBar hp={hpUs} align="right" />
          </div>
        </div>
      </div>

      <div
        key={`${matchId ?? "match"}-${round}`}
        className="match-title display mx-auto mt-1 flex w-full max-w-full items-center justify-center gap-2 overflow-hidden whitespace-nowrap text-center font-bold uppercase leading-tight text-gold"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        aria-label={title}
      >
        {titleParts.lead && (
          <span className="shrink-0 opacity-90" aria-hidden="true">
            {titleParts.lead}
          </span>
        )}
        <span
          className="min-w-0 truncate"
          style={{ color: "var(--ru-glow)" }}
          aria-hidden="true"
        >
          {titleParts.left}
        </span>

        {titleParts.right && (
          <>
            <span className="shrink-0 opacity-90" aria-hidden="true">
              vs
            </span>
            <span
              className="min-w-0 truncate"
              style={{ color: "var(--us-glow)" }}
              aria-hidden="true"
            >
              {titleParts.right}
            </span>
          </>
        )}
      </div>

    </div>
  );
}
