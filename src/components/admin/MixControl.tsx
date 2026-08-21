import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { LANG_META, LANGS, type Lang } from "@/lib/i18n";
import { publishControl } from "@/lib/control";
import { DEFAULT_MIX, useMix } from "@/lib/mix";

/**
 * Broadcast mixer: announcer level, crowd ambience level and the commentator
 * language for this match session. Every change is pushed live to the arena
 * and to all spectator tabs.
 */
export function MixControl({ lang, onLang }: { lang: Lang; onLang: (next: Lang) => void }) {
  const mix = useMix();

  const set = (patch: Partial<typeof mix>) => publishControl({ type: "mix", mix: { ...mix, ...patch } });

  const pct = (value: number) => `${Math.round(value * 100)}%`;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Announcer volume</span>
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
          <span>Crowd volume</span>
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

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Session language</p>
        <div className="flex flex-wrap gap-2">
          {LANGS.map((code) => (
            <Button
              key={code}
              type="button"
              size="sm"
              variant={code === lang ? "default" : "outline"}
              onClick={() => onLang(code)}
            >
              {LANG_META[code].flag} {LANG_META[code].label}
            </Button>
          ))}
        </div>
      </div>

      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => publishControl({ type: "mix", mix: DEFAULT_MIX })}
      >
        Reset mix
      </Button>
    </div>
  );
}
