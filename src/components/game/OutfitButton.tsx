import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getAdminConfig } from "@/lib/adminConfig";
import { currentMatchId, publishOutfits, useOutfits, type OutfitState } from "@/lib/outfits";
import { saveMatchOutfits } from "@/lib/outfits.functions";
import type { Side } from "@/lib/battle";

/**
 * Ring-outfit switch inside the arena: each fighter can be sent out in a suit
 * or stripped down to his wrestling gear. The change goes on air instantly for
 * every open tab (host and spectators) and, when the operator is signed in, is
 * stored on the running match so a reload keeps the same look.
 */
export function OutfitButton({ className }: { className?: string }) {
  const outfits = useOutfits();
  const cfg = getAdminConfig();
  const names: Record<Side, string> = { ru: cfg.fighters.ru.name, us: cfg.fighters.us.name };

  const apply = async (next: OutfitState) => {
    publishOutfits(next);
    try {
      const id = await currentMatchId();
      if (id) await saveMatchOutfits({ data: { matchId: id, ru: next.ru, us: next.us } });
    } catch {
      // Viewers cannot write to the match; the look still goes on air locally.
    }
  };

  const toggle = (side: Side) =>
    void apply({ ...outfits, [side]: outfits[side] === "gear" ? "suit" : "gear" });

  const both = (outfit: "suit" | "gear") => void apply({ ru: outfit, us: outfit });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          aria-label="Ring outfit"
          variant="outline"
          size="icon"
          className={
            className ??
            "size-9 shrink-0 rounded-full bg-background/80 text-sm backdrop-blur-md md:size-10"
          }
        >
          👕
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 space-y-3">
        <div className="display text-xs uppercase tracking-widest">Ring outfit</div>
        {(["ru", "us"] as const).map((side) => (
          <div key={side} className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm">{names[side]}</div>
              <div className="text-xs text-muted-foreground">
                {outfits[side] === "gear" ? "Ring gear · no jacket" : "Suit on"}
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              variant={outfits[side] === "gear" ? "default" : "outline"}
              aria-pressed={outfits[side] === "gear"}
              onClick={() => toggle(side)}
            >
              {outfits[side] === "gear" ? "Suit on" : "Suit off"}
            </Button>
          </div>
        ))}
        <div className="flex gap-2 pt-1">
          <Button type="button" size="sm" variant="outline" className="flex-1" onClick={() => both("suit")}>
            Both in suits
          </Button>
          <Button type="button" size="sm" className="flex-1" onClick={() => both("gear")}>
            Both stripped
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
