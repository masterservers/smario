import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import type { Lang } from "@/lib/i18n";
import {
  VARIETY_DEFAULT,
  VARIETY_LIMITS,
  VARIETY_TEXT,
  type VarietyConfig,
} from "@/lib/variety";

type Props = {
  lang: Lang;
  value: VarietyConfig;
  onChange: (value: VarietyConfig) => void;
  className?: string;
};

/** Referee-side anti-repetition controls: cooldown, LRU length, entry variation. */
export function RefereePanel({ lang, value, onChange, className }: Props) {
  const t = VARIETY_TEXT[lang];

  const rows: Array<{
    key: keyof VarietyConfig;
    label: string;
    display: string;
    limits: { min: number; max: number; step: number };
  }> = [
    {
      key: "cooldownMs",
      label: t.cooldown,
      display: `${(value.cooldownMs / 1000).toFixed(0)}s`,
      limits: VARIETY_LIMITS.cooldownMs,
    },
    {
      key: "rotation",
      label: t.rotation,
      display: `${value.rotation}`,
      limits: VARIETY_LIMITS.rotation,
    },
    {
      key: "entryJitter",
      label: t.jitter,
      display: `${Math.round(value.entryJitter * 100)}%`,
      limits: VARIETY_LIMITS.entryJitter,
    },
    {
      key: "familyStreak",
      label: t.family,
      display: `${value.familyStreak}×`,
      limits: VARIETY_LIMITS.familyStreak,
    },
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={t.title}
          className={
            className ??
            "size-8 shrink-0 rounded-full bg-background/80 text-sm backdrop-blur-md sm:size-9 md:size-10 md:text-base"
          }
        >
          🎛️
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-4">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">{t.title}</div>
        {rows.map((row) => (
          <div key={row.key} className="space-y-2">
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-foreground">{row.label}</span>
              <span className="font-semibold text-primary">{row.display}</span>
            </div>
            <Slider
              value={[value[row.key]]}
              min={row.limits.min}
              max={row.limits.max}
              step={row.limits.step}
              aria-label={row.label}
              onValueChange={([next]) =>
                onChange({ ...value, [row.key]: next ?? value[row.key] })
              }
            />
          </div>
        ))}
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] leading-tight text-muted-foreground">{t.hint}</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0 text-xs"
            onClick={() => onChange(VARIETY_DEFAULT)}
          >
            {t.reset}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
