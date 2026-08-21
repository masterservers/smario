import type { Lang } from "@/lib/i18n";

/**
 * Anti-repetition tuning exposed in the referee panel. None of these values
 * touch playback speed or impact timing, so commentary/banner sync is intact —
 * they only change *which* move is drawn and where its opening frame starts.
 */
export type VarietyConfig = {
  /** Milliseconds a move stays blocked after it has been played. */
  cooldownMs: number;
  /** How many recent move ids stay in the LRU rotation window. */
  rotation: number;
  /** 0..1 — how much the entry frame of a move may drift. */
  entryJitter: number;
  /** Max scenes of the same physical family (punches, kicks, rope…) in a row. */
  familyStreak: number;
};

export const VARIETY_DEFAULT: VarietyConfig = {
  cooldownMs: 12000,
  rotation: 12,
  entryJitter: 0.6,
  familyStreak: 2,
};

export const VARIETY_LIMITS = {
  cooldownMs: { min: 0, max: 45000, step: 1000 },
  rotation: { min: 2, max: 28, step: 1 },
  entryJitter: { min: 0, max: 1, step: 0.05 },
  familyStreak: { min: 1, max: 6, step: 1 },
} as const;

export const VARIETY_TEXT: Record<
  Lang,
  { title: string; cooldown: string; rotation: string; jitter: string; family: string; reset: string; hint: string }
> = {
  en: {
    title: "Referee · anti-repeat",
    cooldown: "Move cooldown",
    rotation: "LRU rotation",
    jitter: "Entry variation",
    family: "Same-type streak",
    reset: "Reset",
    hint: "Only affects move choice — timing stays in sync.",
  },
  de: {
    title: "Ringrichter · Anti-Wiederholung",
    cooldown: "Aktions-Cooldown",
    rotation: "LRU-Rotation",
    jitter: "Einstiegs-Variation",
    family: "Gleicher Typ in Folge",
    reset: "Zurücksetzen",
    hint: "Ändert nur die Auswahl — Timing bleibt synchron.",
  },
  sr: {
    title: "Sudija · bez ponavljanja",
    cooldown: "Pauza poteza",
    rotation: "LRU rotacija",
    jitter: "Varijacija ulaza",
    family: "Isti tip zaredom",
    reset: "Reset",
    hint: "Menja samo izbor poteza — tajming ostaje sinhron.",
  },
  ro: {
    title: "Arbitru · anti-repetiție",
    cooldown: "Cooldown mișcare",
    rotation: "Rotație LRU",
    jitter: "Variație intrări",
    family: "Serie același tip",
    reset: "Resetare",
    hint: "Schimbă doar alegerea mișcării — sincronizarea rămâne intactă.",
  },
  ru: {
    title: "Рефери · без повторов",
    cooldown: "Кулдаун приёма",
    rotation: "Ротация LRU",
    jitter: "Вариация входа",
    family: "Подряд одного типа",
    reset: "Сброс",
    hint: "Влияет только на выбор приёма — тайминг не меняется.",
  },
};

const KEY = "pvt.variety";

export function loadVariety(): VarietyConfig {
  if (typeof window === "undefined") return VARIETY_DEFAULT;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return VARIETY_DEFAULT;
    const parsed = JSON.parse(raw) as Partial<VarietyConfig>;
    return {
      cooldownMs: clamp(parsed.cooldownMs, VARIETY_DEFAULT.cooldownMs, VARIETY_LIMITS.cooldownMs),
      rotation: clamp(parsed.rotation, VARIETY_DEFAULT.rotation, VARIETY_LIMITS.rotation),
      entryJitter: clamp(parsed.entryJitter, VARIETY_DEFAULT.entryJitter, VARIETY_LIMITS.entryJitter),
      familyStreak: clamp(
        parsed.familyStreak,
        VARIETY_DEFAULT.familyStreak,
        VARIETY_LIMITS.familyStreak,
      ),
    };
  } catch {
    return VARIETY_DEFAULT;
  }
}

export function saveVariety(value: VarietyConfig) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(value));
}

function clamp(
  value: unknown,
  fallback: number,
  limits: { min: number; max: number },
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(limits.max, Math.max(limits.min, value));
}
