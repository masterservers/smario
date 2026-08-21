import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { publishControl } from "@/lib/control";
import { DEFAULT_MIX, useMix } from "@/lib/mix";
import { UI_TEXT, type Lang } from "@/lib/i18n";

/**
 * Arena audio settings: announcer vs. crowd ambience. The levels travel over
 * the control bus, so the balance set here also applies to the spectators
 * watching the same match on /live.
 */
export function MixButton({ lang, className }: { lang: Lang; className?: string }) {
  const mix = useMix();
  const t = UI_TEXT[lang];

  const set = (patch: Partial<typeof mix>) =>
    publishControl({ type: "mix", mix: { ...mix, ...patch } });

  const pct = (value: number) => `${Math.round(value * 100)}%`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          aria-label={`${t.commentator} · mix`}
          variant="outline"
          size="icon"
          className={
            className ??
            "size-9 shrink-0 rounded-full bg-background/80 text-sm backdrop-blur-md md:size-10"
          }
        >
          🎚️
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-60 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>🎙️ {t.commentator}</span>
            <span className="tabular-nums">{pct(mix.voice)}</span>
          </div>
          <Slider
            value={[mix.voice]}
            min={0}
            max={1}
            step={0.05}
            aria-label="Announcer volume"
            onValueChange={([value]) => set({ voice: value ?? mix.voice })}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>👥 Crowd</span>
            <span className="tabular-nums">{pct(mix.crowd)}</span>
          </div>
          <Slider
            value={[mix.crowd]}
            min={0}
            max={1}
            step={0.05}
            aria-label="Crowd volume"
            onValueChange={([value]) => set({ crowd: value ?? mix.crowd })}
          />
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="w-full"
          onClick={() => publishControl({ type: "mix", mix: DEFAULT_MIX })}
        >
          Reset
        </Button>
      </PopoverContent>
    </Popover>
  );
}
