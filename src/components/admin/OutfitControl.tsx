import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { DEFAULT_OUTFITS, publishOutfits, readOutfits, type Outfit, type OutfitState } from "@/lib/outfits";
import { getAdminConfig } from "@/lib/adminConfig";
import type { Side } from "@/lib/battle";

const LABEL: Record<Outfit, string> = { suit: "Suit on", gear: "No jacket · ring gear" };

/**
 * Live outfit switch: one toggle per fighter. The change hits every open arena
 * tab (host view and spectator links) instantly, without touching playback.
 */
export function OutfitControl({ onAudit }: { onAudit?: (action: string, details: string) => void }) {
  const [state, setState] = useState<OutfitState>(DEFAULT_OUTFITS);
  const [names, setNames] = useState({ ru: "Putin", us: "Trump" });

  useEffect(() => {
    setState(readOutfits());
    const cfg = getAdminConfig();
    setNames({ ru: cfg.fighters.ru.name, us: cfg.fighters.us.name });
  }, []);

  const toggle = (side: Side) => {
    const next: OutfitState = { ...state, [side]: state[side] === "gear" ? "suit" : "gear" };
    setState(next);
    publishOutfits(next);
    onAudit?.("outfit", `${names[side]} → ${LABEL[next[side]]}`);
  };

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {(["ru", "us"] as const).map((side) => (
        <div key={side} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
          <div>
            <div className="display text-xs uppercase tracking-widest">{names[side]}</div>
            <div className="text-xs text-muted-foreground">{LABEL[state[side]]}</div>
          </div>
          <Button
            type="button"
            size="sm"
            variant={state[side] === "gear" ? "default" : "outline"}
            aria-pressed={state[side] === "gear"}
            onClick={() => toggle(side)}
          >
            {state[side] === "gear" ? "Put suit back" : "Take suit off"}
          </Button>
        </div>
      ))}
    </div>
  );
}
