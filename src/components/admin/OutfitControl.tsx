import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_OUTFITS,
  currentMatchId,
  fetchMatchOutfits,
  publishOutfits,
  readOutfits,
  type Outfit,
  type OutfitState,
} from "@/lib/outfits";
import { saveMatchOutfits } from "@/lib/outfits.functions";
import { getAdminConfig } from "@/lib/adminConfig";
import type { Side } from "@/lib/battle";

const LABEL: Record<Outfit, string> = { suit: "Suit on", gear: "No jacket · ring gear" };

/**
 * Live outfit switch: one toggle per fighter. The change hits every open arena
 * tab (host view and spectator links) instantly and is stored on the running
 * match, so a reload or a restart keeps each fighter dressed the same way.
 */
export function OutfitControl({ onAudit }: { onAudit?: (action: string, details: string) => void }) {
  const [state, setState] = useState<OutfitState>(DEFAULT_OUTFITS);
  const [names, setNames] = useState({ ru: "Putin", us: "Trump" });
  const [matchId, setMatchId] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    setState(readOutfits());
    const cfg = getAdminConfig();
    setNames({ ru: cfg.fighters.ru.name, us: cfg.fighters.us.name });
    let cancelled = false;
    void (async () => {
      const id = await currentMatchId();
      if (cancelled || !id) return;
      setMatchId(id);
      const stored = await fetchMatchOutfits(id);
      if (!cancelled) setState(stored);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = async (side: Side) => {
    const next: OutfitState = { ...state, [side]: state[side] === "gear" ? "suit" : "gear" };
    setState(next);
    publishOutfits(next);
    onAudit?.("outfit", `${names[side]} → ${LABEL[next[side]]}`);
    const id = matchId ?? (await currentMatchId());
    if (!id) {
      setNote("No live match yet — the look is on air, it will be stored with the next match.");
      return;
    }
    setMatchId(id);
    try {
      await saveMatchOutfits({ data: { matchId: id, ru: next.ru, us: next.us } });
      setNote("Saved for this match.");
    } catch {
      setNote("On air, but could not be stored for the match.");
    }
  };

  return (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-2">
        {(["ru", "us"] as const).map((side) => (
          <div
            key={side}
            className="flex items-center justify-between gap-3 rounded-xl border border-border p-3"
          >
            <div>
              <div className="display text-xs uppercase tracking-widest">{names[side]}</div>
              <div className="text-xs text-muted-foreground">{LABEL[state[side]]}</div>
            </div>
            <Button
              type="button"
              size="sm"
              variant={state[side] === "gear" ? "default" : "outline"}
              aria-pressed={state[side] === "gear"}
              onClick={() => void toggle(side)}
            >
              {state[side] === "gear" ? "Put suit back" : "Take suit off"}
            </Button>
          </div>
        ))}
      </div>
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}
