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
 * Placement of Mr. Bean's face on the referee who is already inside the ring
 * footage. Nothing here touches the fight scheduler — the wrestling animation
 * runs exactly the same either way.
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
    onAudit?.("referee face", saved as unknown as Record<string, unknown>);
    toast.success(saved.headEnabled ? "Mr. Bean face applied" : "Referee face off");
  };

  const reset = () => {
    const saved = saveBeanConfig(BEAN_DEFAULTS);
    setCfg(saved);
    toast.success("Referee face back to default");
  };

  const row = (
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
    unit: string,
    key: "headX" | "headY" | "headSize",
  ) => (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums text-foreground">
          {value}
          {unit}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([next]) => patch({ [key]: next } as Partial<BeanConfig>)}
      />
    </div>
  );

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        The referee stays the one filmed in the ring — only his head is replaced by Mr. Bean.
        Use the sliders to line the face up with his shoulders.
      </p>

      <div className="flex items-center justify-between gap-3">
        <Label htmlFor="bean-head-on" className="text-sm">
          Mr. Bean face on the referee
        </Label>
        <Switch
          id="bean-head-on"
          checked={cfg.headEnabled}
          onCheckedChange={(headEnabled) => patch({ headEnabled })}
        />
      </div>

      {row("Horizontal position", cfg.headX, 0, 100, 0.5, "%", "headX")}
      {row("Vertical position", cfg.headY, 0, 100, 0.5, "%", "headY")}
      {row("Head size", cfg.headSize, 1, 15, 0.1, "%", "headSize")}

      <div className="flex gap-2">
        <Button size="sm" onClick={apply}>
          Save
        </Button>
        <Button size="sm" variant="outline" onClick={reset}>
          Reset
        </Button>
      </div>
    </div>
  );
}
