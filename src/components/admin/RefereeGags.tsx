import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { BEAN_DEFAULTS, loadBeanConfig, saveBeanConfig, type BeanConfig } from "@/lib/beanConfig";

type Props = {
  onAudit?: (action: string, details: Record<string, unknown>) => void;
};

/**
 * Tuning for the referee's comic interventions. Nothing here touches the fight
 * scheduler — the wrestling animation runs exactly the same either way.
 */
export function RefereeGags({ onAudit }: Props) {
  const [cfg, setCfg] = useState<BeanConfig>(BEAN_DEFAULTS);

  useEffect(() => {
    setCfg(loadBeanConfig());
  }, []);

  const patch = (next: Partial<BeanConfig>) => setCfg((prev) => ({ ...prev, ...next }));

  const apply = () => {
    const saved = saveBeanConfig(cfg);
    setCfg(saved);
    onAudit?.("referee gags", saved as unknown as Record<string, unknown>);
    toast.success(
      saved.enabled
        ? `Referee every ${saved.minSec}–${saved.maxSec}s`
        : "Referee interventions off",
    );
  };

  const reset = () => {
    const saved = saveBeanConfig(BEAN_DEFAULTS);
    setCfg(saved);
    toast.success("Referee timing back to default");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor="bean-on" className="text-sm">
          Interventions enabled
        </Label>
        <Switch
          id="bean-on"
          checked={cfg.enabled}
          onCheckedChange={(enabled) => patch({ enabled })}
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>Interval between gags</span>
          <span className="tabular-nums text-foreground">
            {cfg.minSec}–{cfg.maxSec}s
          </span>
        </div>
        <Slider
          value={[cfg.minSec, cfg.maxSec]}
          min={4}
          max={60}
          step={1}
          minStepsBetweenThumbs={1}
          onValueChange={([min, max]) =>
            patch({ minSec: min ?? cfg.minSec, maxSec: max ?? cfg.maxSec })
          }
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>Also step in every N hits</span>
          <span className="tabular-nums text-foreground">
            {cfg.everyNHits ? cfg.everyNHits : "off"}
          </span>
        </div>
        <Slider
          value={[cfg.everyNHits]}
          min={0}
          max={20}
          step={1}
          onValueChange={([v]) => patch({ everyNHits: v ?? 0 })}
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>Also step in on a combo of</span>
          <span className="tabular-nums text-foreground">
            {cfg.comboTrigger ? cfg.comboTrigger : "off"}
          </span>
        </div>
        <Slider
          value={[cfg.comboTrigger]}
          min={0}
          max={10}
          step={1}
          onValueChange={([v]) => patch({ comboTrigger: v ?? 0 })}
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>Time on the mat · quiet time after</span>
          <span className="tabular-nums text-foreground">
            {(cfg.visibleMs / 1000).toFixed(1)}s · {cfg.cooldownSec}s
          </span>
        </div>
        <Slider
          value={[cfg.visibleMs]}
          min={2000}
          max={9000}
          step={200}
          onValueChange={([v]) => patch({ visibleMs: v ?? cfg.visibleMs })}
        />
        <Slider
          className="mt-3"
          value={[cfg.cooldownSec]}
          min={0}
          max={30}
          step={1}
          onValueChange={([v]) => patch({ cooldownSec: v ?? cfg.cooldownSec })}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={apply}>
          Save referee timing
        </Button>
        <Button size="sm" variant="secondary" onClick={reset}>
          Defaults
        </Button>
      </div>
    </div>
  );
}
