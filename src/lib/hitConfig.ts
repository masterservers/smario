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

/** Which fighter a gift always hits for, or "auto" (the sender decides). */
export type GiftTargetRule = "ru" | "us" | "auto";

export type HitConfig = {
  /** Base mapping, used by every round that has no override. */
  gifts: Record<GiftId, GiftHitRule>;
  /** Per-round overrides: rounds["3"].rocket replaces the base rule in round 3. */
  rounds: Record<string, Partial<Record<GiftId, GiftHitRule>>>;
  /** Routing rules: a gift can be locked to Putin (ru) or Trump (us). */
  routing: Record<GiftId, GiftTargetRule>;
  referee: RefereeRules;
};


const DEFAULT_RULES: Record<GiftId, GiftHitRule> = {
  rose: { kinds: ["punch"], tier: 1, force: 1, stun: 1 },
  donut: { kinds: ["kick", "punch"], tier: 2, force: 1, stun: 1 },
  tiktok: { kinds: ["grapple", "kick"], tier: 3, force: 1.1, stun: 1.1 },
  gift: { kinds: ["aerial", "grapple"], tier: 4, force: 1.2, stun: 1.2 },
  rocket: { kinds: ["throw", "aerial"], tier: 5, force: 1.35, stun: 1.3 },
  burger: { kinds: ["punch"], tier: 2, force: 1, stun: 1 },
  vodka: { kinds: ["punch", "grapple"], tier: 2, force: 1.05, stun: 1.05 },
  lightning: { kinds: ["kick", "punch"], tier: 2, force: 1.1, stun: 0.9 },
  glove: { kinds: ["punch"], tier: 3, force: 1.15, stun: 1.1 },
  eagle: { kinds: ["aerial", "kick"], tier: 4, force: 1.2, stun: 1.15 },
  bear: { kinds: ["grapple", "throw"], tier: 4, force: 1.25, stun: 1.2 },
  matryoshka: { kinds: ["grapple", "punch"], tier: 3, force: 1.1, stun: 1.1 },
  statue: { kinds: ["aerial", "throw"], tier: 4, force: 1.25, stun: 1.2 },
  kremlin: { kinds: ["throw", "grapple"], tier: 4, force: 1.25, stun: 1.2 },
  tank: { kinds: ["throw", "grapple"], tier: 5, force: 1.4, stun: 1.3 },
  bomb: { kinds: ["aerial", "throw"], tier: 5, force: 1.45, stun: 1.35 },
  crown: { kinds: ["throw", "aerial"], tier: 5, force: 1.4, stun: 1.3 },
  trophy: { kinds: ["throw", "aerial"], tier: 5, force: 1.5, stun: 1.4 },
};

/** Rounds that can carry their own gift → hit mapping. */
export const CONFIGURABLE_ROUNDS = [1, 2, 3, 4, 5] as const;
export type RoundNo = (typeof CONFIGURABLE_ROUNDS)[number];

export function defaultHitConfig(): HitConfig {
  const gifts = Object.fromEntries(
    GIFTS.map((gift) => [gift.id, { ...DEFAULT_RULES[gift.id]!, kinds: [...DEFAULT_RULES[gift.id]!.kinds] }]),
  ) as Record<GiftId, GiftHitRule>;
  return {
    gifts,
    rounds: Object.fromEntries(CONFIGURABLE_ROUNDS.map((r) => [String(r), {}])),
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
  // Per-round overrides, validated with the same bounds as the base rules.
  for (const round of CONFIGURABLE_ROUNDS) {
    const key = String(round);
    const raws = parsed.rounds?.[key];
    base.rounds[key] = {};
    if (!raws) continue;
    for (const gift of GIFTS) {
      const item = raws[gift.id];
      if (!item) continue;
      const fallback = base.gifts[gift.id];
      const kinds = Array.isArray(item.kinds)
        ? item.kinds.filter((k): k is HitKind => HIT_KINDS.includes(k as HitKind))
        : [];
      base.rounds[key]![gift.id] = {
        kinds: kinds.length > 0 ? kinds : [...fallback.kinds],
        tier: Math.round(clamp(item.tier, 1, 5, fallback.tier)),
        force: clamp(item.force, 0.4, 2, fallback.force),
        stun: clamp(item.stun, 0.4, 2, fallback.stun),
      };
    }
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

/**
 * The round the arena is currently playing. Kept in the module so the hit
 * lookup can apply the round's own mapping without threading the number
 * through every call site.
 */
let activeRound = 1;

export function setActiveRound(round: number) {
  activeRound = Number.isFinite(round) && round > 0 ? Math.round(round) : 1;
}

export function getActiveRound() {
  return activeRound;
}

/** The rule in force for a gift, honouring the current round's override. */
export function ruleFor(gift: string, round: number = activeRound): GiftHitRule {
  const cfg = getHitConfig();
  const id = gift as GiftId;
  return cfg.rounds[String(round)]?.[id] ?? cfg.gifts[id] ?? DEFAULT_RULES.rose;
}

/**
 * Rules handed down by the server-side referee, keyed by gift event id. The
 * arena prefers these over the local mapping so a tampered browser cannot
 * decide how hard a gift lands.
 */
const serverRules = new Map<string, GiftHitRule>();

export function setServerRules(entries: { eventId: string; rule: GiftHitRule }[]) {
  for (const entry of entries) serverRules.set(entry.eventId, entry.rule);
  // Keep the map bounded: only recent events can still be waiting in the queue.
  if (serverRules.size > 400) {
    const extra = serverRules.size - 400;
    let i = 0;
    for (const key of serverRules.keys()) {
      if (i++ >= extra) break;
      serverRules.delete(key);
    }
  }
}

/** The rule for one recorded gift: server verdict first, local mapping second. */
export function ruleForEvent(eventId: string, gift: string, round: number = activeRound): GiftHitRule {
  return serverRules.get(eventId) ?? ruleFor(gift, round);
}
