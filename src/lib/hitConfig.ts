import { useEffect, useState } from "react";
import { GIFTS, type GiftId } from "@/lib/battle";

/** How a hit reads physically on screen. */
export type HitKind = "punch" | "kick" | "grapple" | "aerial" | "throw";

export const HIT_KINDS: HitKind[] = ["punch", "kick", "grapple", "aerial", "throw"];

/** Admin rule for one gift: which blow it triggers and how hard it lands. */
export type GiftHitRule = {
  /** Preferred kinds of blow, first one is the strongest preference. */
  kinds: HitKind[];
  /** 1 = light strike, 5 = finisher. Drives which moves are eligible. */
  tier: number;
  /** Multiplier on the physical reaction amplitude (0.4 – 2). */
  force: number;
  /** Multiplier on the hit-stun duration (0.4 – 2). */
  stun: number;
};

/** Referee timing, adjustable live without a redeploy. */
export type RefereeRules = {
  /** Numbers counted on a knockdown before the fighter is back up. */
  knockdownCount: number;
  /** Numbers counted on the finish (classic ten-count). */
  finalCount: number;
  /** Milliseconds between two numbers. */
  countMs: number;
  /** Quiet gap after the count before the fight resumes (avoids glitchy cuts). */
  resumeDelayMs: number;
};

export type HitConfig = {
  gifts: Record<GiftId, GiftHitRule>;
  referee: RefereeRules;
};

const DEFAULT_RULES: Record<GiftId, GiftHitRule> = {
  rose: { kinds: ["punch"], tier: 1, force: 1, stun: 1 },
  donut: { kinds: ["kick", "punch"], tier: 2, force: 1, stun: 1 },
  tiktok: { kinds: ["grapple", "kick"], tier: 3, force: 1.1, stun: 1.1 },
  gift: { kinds: ["aerial", "grapple"], tier: 4, force: 1.2, stun: 1.2 },
  rocket: { kinds: ["throw", "aerial"], tier: 5, force: 1.35, stun: 1.3 },
};

export function defaultHitConfig(): HitConfig {
  const gifts = Object.fromEntries(
    GIFTS.map((gift) => [gift.id, { ...DEFAULT_RULES[gift.id]!, kinds: [...DEFAULT_RULES[gift.id]!.kinds] }]),
  ) as Record<GiftId, GiftHitRule>;
  return {
    gifts,
    referee: { knockdownCount: 8, finalCount: 10, countMs: 950, resumeDelayMs: 900 },
  };
}

const KEY = "pvt.hitConfig";

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function normalize(raw: unknown): HitConfig {
  const base = defaultHitConfig();
  if (!raw || typeof raw !== "object") return base;
  const parsed = raw as Partial<HitConfig>;
  for (const gift of GIFTS) {
    const item = parsed.gifts?.[gift.id];
    if (!item) continue;
    const entry = base.gifts[gift.id];
    if (Array.isArray(item.kinds)) {
      const kinds = item.kinds.filter((k): k is HitKind => HIT_KINDS.includes(k as HitKind));
      if (kinds.length > 0) entry.kinds = kinds;
    }
    entry.tier = Math.round(clamp(item.tier, 1, 5, entry.tier));
    entry.force = clamp(item.force, 0.4, 2, entry.force);
    entry.stun = clamp(item.stun, 0.4, 2, entry.stun);
  }
  const ref = parsed.referee;
  if (ref) {
    base.referee = {
      knockdownCount: Math.round(clamp(ref.knockdownCount, 3, 12, 8)),
      finalCount: Math.round(clamp(ref.finalCount, 5, 20, 10)),
      countMs: Math.round(clamp(ref.countMs, 400, 2000, 950)),
      resumeDelayMs: Math.round(clamp(ref.resumeDelayMs, 0, 5000, 900)),
    };
  }
  return base;
}

let current: HitConfig | null = null;
const listeners = new Set<(value: HitConfig) => void>();

export function getHitConfig(): HitConfig {
  if (current) return current;
  if (typeof window === "undefined") return defaultHitConfig();
  try {
    const raw = window.localStorage.getItem(KEY);
    current = normalize(raw ? JSON.parse(raw) : null);
  } catch {
    current = defaultHitConfig();
  }
  return current;
}

export function saveHitConfig(value: HitConfig) {
  current = normalize(value);
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(current));
  for (const listener of listeners) listener(current);
}

export function resetHitConfig() {
  saveHitConfig(defaultHitConfig());
}

/** Subscribes a component to the live hit-mapping settings. */
export function useHitConfig(): HitConfig {
  const [value, setValue] = useState<HitConfig>(defaultHitConfig);
  useEffect(() => {
    setValue(getHitConfig());
    listeners.add(setValue);
    return () => {
      listeners.delete(setValue);
    };
  }, []);
  return value;
}

export function ruleFor(gift: string): GiftHitRule {
  const cfg = getHitConfig();
  return cfg.gifts[gift as GiftId] ?? DEFAULT_RULES.rose;
}
