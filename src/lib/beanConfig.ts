import { useEffect, useState } from "react";

/**
 * Tuning for Mr. Bean's interventions. Only the referee overlay reads this —
 * nothing here touches the fight scheduler, so the match animation is
 * unaffected whatever the operator picks.
 */
export type BeanConfig = {
  /** Referee gags on/off. */
  enabled: boolean;
  /** Shortest gap between two interventions, in seconds. */
  minSec: number;
  /** Longest gap between two interventions, in seconds. */
  maxSec: number;
  /** Pull him in after this many hits land (0 = never). */
  everyNHits: number;
  /** Pull him in when a combo reaches this length (0 = never). */
  comboTrigger: number;
  /** How long he stays on the mat, in ms. */
  visibleMs: number;
  /** Minimum quiet time after any appearance, so the fight stays fluid. */
  cooldownSec: number;
};

export const BEAN_DEFAULTS: BeanConfig = {
  enabled: true,
  minSec: 10,
  maxSec: 20,
  everyNHits: 6,
  comboTrigger: 3,
  visibleMs: 4200,
  cooldownSec: 6,
};

const KEY = "pvt.bean";
const EVENT = "pvt:bean-config";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function normalizeBeanConfig(input: Partial<BeanConfig> | null | undefined): BeanConfig {
  const raw = { ...BEAN_DEFAULTS, ...(input ?? {}) };
  const minSec = clamp(Math.round(Number(raw.minSec) || BEAN_DEFAULTS.minSec), 4, 120);
  const maxSec = clamp(Math.round(Number(raw.maxSec) || BEAN_DEFAULTS.maxSec), minSec, 180);
  return {
    enabled: Boolean(raw.enabled),
    minSec,
    maxSec,
    everyNHits: clamp(Math.round(Number(raw.everyNHits) || 0), 0, 50),
    comboTrigger: clamp(Math.round(Number(raw.comboTrigger) || 0), 0, 20),
    visibleMs: clamp(Math.round(Number(raw.visibleMs) || BEAN_DEFAULTS.visibleMs), 1500, 12000),
    cooldownSec: clamp(Math.round(Number(raw.cooldownSec) || 0), 0, 60),
  };
}

export function loadBeanConfig(): BeanConfig {
  if (typeof window === "undefined") return BEAN_DEFAULTS;
  try {
    const stored = window.localStorage.getItem(KEY);
    return normalizeBeanConfig(stored ? (JSON.parse(stored) as Partial<BeanConfig>) : null);
  } catch {
    return BEAN_DEFAULTS;
  }
}

export function saveBeanConfig(value: Partial<BeanConfig>): BeanConfig {
  const next = normalizeBeanConfig(value);
  if (typeof window === "undefined") return next;
  window.localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(EVENT, { detail: next }));
  return next;
}

/** Live config; updates across tabs and as soon as admin saves. */
export function useBeanConfig(): BeanConfig {
  const [value, setValue] = useState<BeanConfig>(BEAN_DEFAULTS);
  useEffect(() => {
    setValue(loadBeanConfig());
    const onLocal = () => setValue(loadBeanConfig());
    window.addEventListener(EVENT, onLocal);
    window.addEventListener("storage", onLocal);
    return () => {
      window.removeEventListener(EVENT, onLocal);
      window.removeEventListener("storage", onLocal);
    };
  }, []);
  return value;
}

/** A random gap inside the configured window. */
export function nextBeanDelay(config: BeanConfig): number {
  const min = config.minSec * 1000;
  const max = Math.max(min, config.maxSec * 1000);
  return Math.round(min + Math.random() * (max - min));
}
