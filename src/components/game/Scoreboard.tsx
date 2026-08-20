import { MAX_HP, type Side } from "@/lib/battle";
import { SIDE_NAME, UI_TEXT, type Lang } from "@/lib/i18n";

type Props = {
  lang: Lang;
  round: number;
  viewers: number;
  scoreRu: number;
  scoreUs: number;
  hpRu: number;
  hpUs: number;
  leader: Side | null;
};

function hpColor(hp: number) {
  if (hp > 55) return "var(--hp-good)";
  if (hp > 25) return "var(--hp-warn)";
  return "var(--hp-bad)";
}

function HpBar({ hp, align }: { hp: number; align: "left" | "right" }) {
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/60 ring-1 ring-white/10">
      <div
        className="h-full rounded-full transition-[width] duration-500 ease-out"
        style={{
          width: `${(hp / MAX_HP) * 100}%`,
          background: hpColor(hp),
          marginLeft: align === "right" ? "auto" : undefined,
          boxShadow: `0 0 12px ${hpColor(hp)}`,
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
}: Props) {
  const t = UI_TEXT[lang];
  const names = SIDE_NAME[lang];

  return (
    <div className="panel relative overflow-hidden rounded-2xl px-3 py-2.5 sm:px-5 sm:py-3">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-[radial-gradient(circle_at_left,var(--ru)/35%,transparent_70%)]" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-[radial-gradient(circle_at_right,var(--us)/35%,transparent_70%)]" />

      <div className="relative flex items-center justify-between gap-2 text-[11px] uppercase tracking-widest text-muted-foreground">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/90 px-2 py-0.5 font-semibold text-destructive-foreground">
          <span
            className="size-1.5 rounded-full bg-current"
            style={{ animation: "live-pulse 1.2s infinite" }}
          />
          {t.live}
        </span>
        <span className="display text-base tracking-[0.2em] text-gold">
          {t.round} {round}
        </span>
        <span>
          👁 {viewers} {t.viewers}
        </span>
      </div>

      <div className="relative mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-xl leading-none">🇷🇺</span>
            <span
              className="display truncate text-lg leading-none sm:text-2xl"
              style={{ color: "var(--ru-glow)" }}
            >
              {names.ruTeam}
            </span>
            {leader === "ru" && <span className="text-xs">👑</span>}
          </div>
          <div
            className="display mt-1 text-4xl leading-none text-outline sm:text-6xl"
            style={{ color: "var(--ru-glow)" }}
          >
            {scoreRu}
          </div>
          <div className="mt-1.5">
            <HpBar hp={hpRu} align="left" />
          </div>
        </div>

        <div className="display px-1 text-2xl text-gold sm:text-4xl">VS</div>

        <div className="min-w-0 text-right">
          <div className="flex items-baseline justify-end gap-2">
            {leader === "us" && <span className="text-xs">👑</span>}
            <span
              className="display truncate text-lg leading-none sm:text-2xl"
              style={{ color: "var(--us-glow)" }}
            >
              {names.usTeam}
            </span>
            <span className="text-xl leading-none">🇺🇸</span>
          </div>
          <div
            className="display mt-1 text-4xl leading-none text-outline sm:text-6xl"
            style={{ color: "var(--us-glow)" }}
          >
            {scoreUs}
          </div>
          <div className="mt-1.5">
            <HpBar hp={hpUs} align="right" />
          </div>
        </div>
      </div>
    </div>
  );
}
