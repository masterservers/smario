import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  PRESETS,
  PRESET_LABEL,
  TIERS,
  applyPreset,
  saveTuning,
  useTuning,
  type PresetName,
  type Tier,
} from "@/lib/tuning";

/**
 * Difficulty presets for the ring engine: how likely each power tier is, how
 * often aerials and finishers appear and how long a move stays out of the
 * rotation. Applies live to every open arena tab on this device.
 */
export function EnginePresets({
  onAudit,
}: {
  onAudit?: (action: string, details: Record<string, unknown>) => void;
}) {
  const state = useTuning();
  const { tuning } = state;

  const pick = (name: Exclude<PresetName, "custom">) => {
    applyPreset(name);
    onAudit?.("engine.preset", { preset: name, ...PRESETS[name] });
  };

  const patch = (next: Partial<typeof tuning>) => {
    saveTuning({ preset: "custom", tuning: { ...tuning, ...next } });
  };

  const setTier = (tier: Tier, value: number) => {
    patch({ tiers: { ...tuning.tiers, [tier]: value } });
  };

  const total = TIERS.reduce((sum, tier) => sum + tuning.tiers[tier], 0) || 1;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(PRESETS) as Array<Exclude<PresetName, "custom">>).map((name) => (
          <Button
            key={name}
            size="sm"
            variant={state.preset === name ? "default" : "secondary"}
            onClick={() => pick(name)}
          >
            {PRESET_LABEL[name]}
          </Button>
        ))}
        <span className="self-center text-xs text-muted-foreground">
          {state.preset === "custom" ? "Custom values in use" : "Preset in use"}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TIERS.map((tier) => (
          <div key={tier} className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Strength {tier}
                {tier === 5 ? " · finishers" : ""}
              </span>
              <span className="tabular-nums">
                {Math.round((tuning.tiers[tier] / total) * 100)}%
              </span>
            </div>
            <Slider
              value={[tuning.tiers[tier]]}
              min={0}
              max={5}
              step={0.1}
              onValueChange={([value]) => setTier(tier, value ?? 0)}
              aria-label={`strength ${tier} probability`}
            />
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Aerial moves</span>
            <span className="tabular-nums">{tuning.aerial.toFixed(2)}×</span>
          </div>
          <Slider
            value={[tuning.aerial]}
            min={0}
            max={3}
            step={0.1}
            onValueChange={([value]) => patch({ aerial: value ?? 0 })}
            aria-label="aerial frequency"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Finishers</span>
            <span className="tabular-nums">{tuning.finisher.toFixed(2)}×</span>
          </div>
          <Slider
            value={[tuning.finisher]}
            min={0}
            max={3}
            step={0.1}
            onValueChange={([value]) => patch({ finisher: value ?? 0 })}
            aria-label="finisher frequency"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Move cooldown</span>
            <span className="tabular-nums">{(tuning.cooldownMs / 1000).toFixed(1)}s</span>
          </div>
          <Slider
            value={[tuning.cooldownMs]}
            min={0}
            max={45000}
            step={500}
            onValueChange={([value]) => patch({ cooldownMs: value ?? 0 })}
            aria-label="move cooldown"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" onClick={() => pick("standard")}>
          Reset to standard
        </Button>
      </div>
    </div>
  );
}
