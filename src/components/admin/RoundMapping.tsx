import { useState } from "react";
import { Button } from "@/components/ui/button";
import { GIFTS, type GiftId } from "@/lib/battle";
import { GIFT_CAMP, giftName } from "@/lib/giftCatalog";
import type { Lang } from "@/lib/i18n";
import {
  CONFIGURABLE_ROUNDS,
  HIT_KINDS,
  type GiftHitRule,
  type HitConfig,
  type HitKind,
} from "@/lib/hitConfig";

type Props = {
  lang: Lang;
  hits: HitConfig;
  /** Persists the whole config and writes an audit entry. */
  onChange: (next: HitConfig, detail: string) => void;
};

const CAMP_LABEL: Record<"us" | "ru" | "neutral", string> = {
  us: "🇺🇸 America / Trump",
  ru: "🇷🇺 Russia / Putin",
  neutral: "◇ Universal",
};

/**
 * Full gift catalog with a per-round hit mapping: each round may override the
 * kind of blow, the tier, the force and the hit-stun of any gift.
 */
export function RoundMapping({ lang, hits, onChange }: Props) {
  const [round, setRound] = useState<number>(1);
  const key = String(round);
  const overrides = hits.rounds[key] ?? {};

  const setRule = (id: GiftId, patch: Partial<GiftHitRule>) => {
    const base = overrides[id] ?? hits.gifts[id];
    const rule: GiftHitRule = { ...base, ...patch, kinds: patch.kinds ?? [...base.kinds] };
    onChange(
      { ...hits, rounds: { ...hits.rounds, [key]: { ...overrides, [id]: rule } } },
      `round ${round} · ${id}`,
    );
  };

  const clear = (id: GiftId) => {
    const next = { ...overrides };
    delete next[id];
    onChange({ ...hits, rounds: { ...hits.rounds, [key]: next } }, `round ${round} · ${id} reset`);
  };

  const clearRound = () => {
    onChange({ ...hits, rounds: { ...hits.rounds, [key]: {} } }, `round ${round} cleared`);
  };

  const groups: Array<"us" | "ru" | "neutral"> = ["us", "ru", "neutral"];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {CONFIGURABLE_ROUNDS.map((item) => (
          <Button
            key={item}
            type="button"
            size="sm"
            variant={item === round ? "default" : "outline"}
            onClick={() => setRound(item)}
          >
            Round {item}
            {Object.keys(hits.rounds[String(item)] ?? {}).length > 0 ? " ●" : ""}
          </Button>
        ))}
        <Button type="button" size="sm" variant="outline" onClick={clearRound} className="ml-auto">
          Clear round {round}
        </Button>
      </div>

      {groups.map((camp) => (
        <div key={camp}>
          <h3 className="display text-xs uppercase tracking-widest text-muted-foreground">
            {CAMP_LABEL[camp]}
          </h3>
          <div className="mt-2 grid gap-3 lg:grid-cols-2">
            {GIFTS.filter((gift) => GIFT_CAMP[gift.id] === camp).map((gift) => {
              const custom = overrides[gift.id];
              const rule = custom ?? hits.gifts[gift.id];
              return (
                <div
                  key={gift.id}
                  className={`rounded-xl border p-3 ${custom ? "border-primary/60" : "border-border"}`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-lg">{gift.emoji}</span>
                    <span className="display text-xs uppercase tracking-widest">
                      {giftName(gift.id, lang)}
                    </span>
                    <span className="text-xs text-muted-foreground">+{gift.value}</span>
                    {custom && (
                      <button
                        type="button"
                        onClick={() => clear(gift.id)}
                        className="ml-auto text-xs text-muted-foreground underline"
                      >
                        use base rule
                      </button>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {HIT_KINDS.map((kind: HitKind) => {
                      const on = rule.kinds.includes(kind);
                      return (
                        <button
                          key={kind}
                          type="button"
                          onClick={() =>
                            setRule(gift.id, {
                              kinds: on
                                ? rule.kinds.filter((k) => k !== kind)
                                : [...rule.kinds, kind],
                            })
                          }
                          className={`rounded-md border px-2 py-1 text-xs ${
                            on
                              ? "border-primary bg-primary/15 text-primary"
                              : "border-border text-muted-foreground"
                          }`}
                        >
                          {kind}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {(
                      [
                        ["tier", 1, 5, 1],
                        ["force", 0.4, 2, 0.05],
                        ["stun", 0.4, 2, 0.05],
                      ] as const
                    ).map(([field, min, max, step]) => (
                      <label key={field} className="text-xs text-muted-foreground">
                        {field} <span className="text-foreground">{rule[field]}</span>
                        <input
                          type="range"
                          min={min}
                          max={max}
                          step={step}
                          value={rule[field]}
                          onChange={(e) => setRule(gift.id, { [field]: Number(e.target.value) })}
                          className="mt-1 w-full accent-primary"
                          aria-label={`round ${round} ${gift.id} ${field}`}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
