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
}: Props) {
  const t = UI_TEXT[lang];
  const names = SIDE_NAME[lang];

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
              {names.ruTeam}
            </span>
            {leader === "ru" && <span className="text-xs">👑</span>}
            <span className="display ml-auto text-base leading-none sm:text-xl" style={{ color: "var(--ru-glow)" }}>
              {scoreRu}
            </span>
          </div>
          <div className="mt-0.5">
            <HpBar hp={hpRu} align="left" />
          </div>
        </div>

        <div className="flex flex-col items-center px-1 leading-none">
          <span className="display text-sm text-gold sm:text-base">VS</span>
          <span className="mt-1 text-[8px] uppercase text-muted-foreground sm:text-[9px]">
            {t.round} {round} · {viewers}
          </span>
        </div>

        <div className="min-w-0 text-right">
          <div className="flex items-center justify-end gap-1.5">
            <span className="display mr-auto text-base leading-none sm:text-xl" style={{ color: "var(--us-glow)" }}>
              {scoreUs}
            </span>
            {leader === "us" && <span className="text-xs">👑</span>}
            <span
              className="display truncate text-xs leading-none sm:text-sm"
              style={{ color: "var(--us-glow)" }}
            >
              {names.usTeam}
            </span>
            <span className="text-base leading-none sm:text-lg">🇺🇸</span>
          </div>
          <div className="mt-0.5">
            <HpBar hp={hpUs} align="right" />
          </div>
        </div>
      </div>
    </div>
  );
}
