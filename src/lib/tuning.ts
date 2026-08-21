import { useEffect, useState } from "react";
import type { Move } from "@/lib/scenes";
import { moveKind } from "@/lib/moveKind";

/**
 * Engine tuning presets exposed in the admin console: how strong the fight
 * reads (tier 1–5 probabilities), how often the big spots appear (aerials and
 * finishers) and how long a move stays out of the rotation (cooldown).
 *
 * Nothing here touches playback speed or impact timing, so the audio/visual
 * sync stays intact — the preset only shapes *which* move is drawn.
 */

export type Tier = 1 | 2 | 3 | 4 | 5;
export const TIERS: Tier[] = [1, 2, 3, 4, 5];

export type EngineTuning = {
  /** Relative probability of each power tier, 0–5 (0 = never drawn). */
  tiers: Record<Tier, number>;
  /** 0–3 multiplier on aerial moves (rope spots, dives, splashes). */
  aerial: number;
  /** 0–3 multiplier on finishers (tier 5 slams, bombs, mat finishes). */
  finisher: number;
  /** Milliseconds a move stays blocked after it has been played. */
  cooldownMs: number;
};

export type PresetName = "soft" | "standard" | "spectacle" | "brutal" | "custom";

export const PRESETS: Record<Exclude<PresetName, "custom">, EngineTuning> = {
  soft: {
    tiers: { 1: 3, 2: 2.5, 3: 1.2, 4: 0.5, 5: 0.15 },
    aerial: 0.6,
    finisher: 0.3,
    cooldownMs: 18000,
  },
  standard: {
    tiers: { 1: 2, 2: 2, 3: 1.6, 4: 1, 5: 0.5 },
    aerial: 1,
    finisher: 1,
    cooldownMs: 12000,
  },
  spectacle: {
    tiers: { 1: 1, 2: 1.4, 3: 1.8, 4: 2, 5: 1.4 },
    aerial: 2.2,
    finisher: 1.6,
    cooldownMs: 9000,
  },
  brutal: {
    tiers: { 1: 0.6, 2: 1, 3: 1.6, 4: 2.4, 5: 2.4 },
    aerial: 1.4,
    finisher: 2.6,
    cooldownMs: 6000,
  },
};

export const PRESET_LABEL: Record<PresetName, string> = {
  soft: "Soft · technical",
  standard: "Standard",
  spectacle: "Spectacle · aerial",
  brutal: "Brutal · finishers",
  custom: "Custom",
};

export type TuningState = { preset: PresetName; tuning: EngineTuning };

const KEY = "pvt.engineTuning";
const EVENT = "pvt:engineTuning";

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

export function defaultTuning(): TuningState {
  return { preset: "standard", tuning: { ...PRESETS.standard, tiers: { ...PRESETS.standard.tiers } } };
}

function parse(raw: unknown): TuningState {
  const base = defaultTuning();
  if (!raw || typeof raw !== "object") return base;
  const value = raw as Partial<TuningState>;
  const t = (value.tuning ?? {}) as Partial<EngineTuning>;
  const tiers = { ...base.tuning.tiers };
  if (t.tiers && typeof t.tiers === "object") {
    for (const tier of TIERS) {
      tiers[tier] = clamp((t.tiers as Record<number, unknown>)[tier], 0, 5, tiers[tier]);
    }
  }
  const preset: PresetName =
    typeof value.preset === "string" && (value.preset in PRESET_LABEL)
      ? (value.preset as PresetName)
      : "custom";
  return {
    preset,
    tuning: {
      tiers,
      aerial: clamp(t.aerial, 0, 3, base.tuning.aerial),
      finisher: clamp(t.finisher, 0, 3, base.tuning.finisher),
      cooldownMs: clamp(t.cooldownMs, 0, 45000, base.tuning.cooldownMs),
    },
  };
}

let cache: TuningState | null = null;

export function getTuning(): TuningState {
  if (cache) return cache;
  if (typeof window === "undefined") return defaultTuning();
  try {
    cache = parse(JSON.parse(window.localStorage.getItem(KEY) ?? "null"));
  } catch {
    cache = defaultTuning();
  }
  return cache;
}

export function saveTuning(value: TuningState) {
  cache = parse(value);
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(cache));
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function applyPreset(name: Exclude<PresetName, "custom">): TuningState {
  const next: TuningState = { preset: name, tuning: { ...PRESETS[name], tiers: { ...PRESETS[name].tiers } } };
  saveTuning(next);
  return getTuning();
}

export function useTuning(): TuningState {
  const [state, setState] = useState<TuningState>(getTuning);
  useEffect(() => {
    const sync = () => setState(getTuning());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return state;
}

/** Weight of a single move under the current preset (0 = keep it out). */
export function moveWeight(move: Move, tuning: EngineTuning): number {
  const tier = Math.max(1, Math.min(5, Math.round(move.tier))) as Tier;
  let weight = tuning.tiers[tier];
  const kind = moveKind(move);
  if (kind === "aerial") weight *= tuning.aerial;
  if (tier >= 5 || kind === "throw") weight *= tier >= 5 ? tuning.finisher : 1;
  return weight;
}

/**
 * Reshapes a move pool according to the preset: each move is repeated in
 * proportion to its weight, so finishers and aerials become more (or less)
 * frequent without ever leaving the anti-repetition rotation.
 */
export function shapePool(pool: Move[], tuning: EngineTuning): Move[] {
  const shaped: Move[] = [];
  for (const move of pool) {
    const copies = Math.round(moveWeight(move, tuning) * 2);
    for (let i = 0; i < copies; i++) shaped.push(move);
  }
  return shaped.length > 0 ? shaped : pool;
}
