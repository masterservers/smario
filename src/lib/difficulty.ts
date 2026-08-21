import type { Lang } from "@/lib/i18n";

export const DIFFICULTIES = ["calm", "normal", "intense"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export type DifficultyConfig = {
  /** Multiplier applied to every video playback rate (fight speed). */
  speed: number;
  /** Scheduler tick in ms — how often a queued gift can start a new move. */
  tickMs: number;
  /** How many recent moves are blocked from repeating. */
  moveMemory: number;
  /** How many recent follow-up spots are blocked from repeating. */
  followMemory: number;
  /** Multiplier on the chance a move chains into a follow-up spot. */
  followChance: number;
};

export const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig> = {
  calm: { speed: 0.85, tickMs: 140, moveMemory: 8, followMemory: 5, followChance: 0.7 },
  normal: { speed: 1, tickMs: 80, moveMemory: 12, followMemory: 7, followChance: 1 },
  intense: { speed: 1.25, tickMs: 45, moveMemory: 18, followMemory: 11, followChance: 1.3 },
};

export const DIFFICULTY_LABEL: Record<Lang, Record<Difficulty, string>> & {
  title: Record<Lang, string>;
} = {
  en: { calm: "Calm", normal: "Normal", intense: "Intense" },
  de: { calm: "Ruhig", normal: "Normal", intense: "Intensiv" },
  sr: { calm: "Mirno", normal: "Normalno", intense: "Intenzivno" },
  ro: { calm: "Calm", normal: "Normal", intense: "Intens" },
  ru: { calm: "Спокойно", normal: "Обычно", intense: "Интенсивно" },
  title: {
    en: "Difficulty",
    de: "Schwierigkeit",
    sr: "Težina",
    ro: "Dificultate",
    ru: "Сложность",
  },
};

export const DIFFICULTY_ICON: Record<Difficulty, string> = {
  calm: "🐢",
  normal: "⚔️",
  intense: "🔥",
};

export function isDifficulty(value: unknown): value is Difficulty {
  return typeof value === "string" && (DIFFICULTIES as readonly string[]).includes(value);
}

const KEY = "pvt.difficulty";

export function loadDifficulty(): Difficulty {
  if (typeof window === "undefined") return "normal";
  const stored = window.localStorage.getItem(KEY);
  return isDifficulty(stored) ? stored : "normal";
}

export function saveDifficulty(value: Difficulty) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, value);
}
