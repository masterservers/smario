import { useEffect, useState } from "react";
import { LANGS, type Lang } from "@/lib/i18n";
import { DEFAULT_MIX, normalizeMix, type AudioMix } from "@/lib/mix";

/**
 * Saved mixer profiles: announcer vs. crowd balance stored per commentator
 * language and per match type, so a show never has to be re-balanced by hand.
 * Picking a language / match type in the admin console applies the matching
 * profile instantly on the whole broadcast.
 */

export type MatchType = "standard" | "hype" | "calm" | "tournament";

export const MATCH_TYPES: { id: MatchType; label: string; note: string }[] = [
  { id: "standard", label: "Standard", note: "Regular gift battle" },
  { id: "hype", label: "Hype", note: "Gift rush, loud crowd" },
  { id: "calm", label: "Calm", note: "Low traffic, talk driven" },
  { id: "tournament", label: "Tournament", note: "Multi-round event" },
];

export function isMatchType(value: unknown): value is MatchType {
  return MATCH_TYPES.some((type) => type.id === value);
}

export type MixProfile = AudioMix & {
  /** Arena ambience bed level (crowd loop under the action), 0..1 */
  ambience: number;
  savedAt: number;
};

export const DEFAULT_PROFILE: MixProfile = { ...DEFAULT_MIX, ambience: 0.6, savedAt: 0 };

const KEY = "pvt.mixProfiles";

export function profileKey(lang: Lang, type: MatchType) {
  return `${lang}:${type}`;
}

function clamp01(value: unknown, fallback: number) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(1, Math.max(0, n));
}

export function normalizeProfile(raw: unknown): MixProfile {
  const mix = normalizeMix(raw);
  const parsed = (raw ?? {}) as Partial<MixProfile>;
  return {
    ...mix,
    ambience: clamp01(parsed.ambience, mix.crowd),
    savedAt: typeof parsed.savedAt === "number" ? parsed.savedAt : 0,
  };
}

export type MixProfileMap = Record<string, MixProfile>;

let cache: MixProfileMap | null = null;
const listeners = new Set<(value: MixProfileMap) => void>();

export function getProfiles(): MixProfileMap {
  if (cache) return cache;
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    const next: MixProfileMap = {};
    for (const [key, value] of Object.entries(parsed ?? {})) {
      const [lang, type] = key.split(":");
      if (!LANGS.includes(lang as Lang) || !isMatchType(type)) continue;
      next[key] = normalizeProfile(value);
    }
    cache = next;
  } catch {
    cache = {};
  }
  return cache;
}

function persist(next: MixProfileMap) {
  cache = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable — keep the in-memory profiles */
    }
  }
  for (const listener of listeners) listener(next);
}

export function getProfile(lang: Lang, type: MatchType): MixProfile | null {
  return getProfiles()[profileKey(lang, type)] ?? null;
}

export function saveProfile(lang: Lang, type: MatchType, profile: Omit<MixProfile, "savedAt">) {
  const next = { ...getProfiles() };
  next[profileKey(lang, type)] = normalizeProfile({ ...profile, savedAt: Date.now() });
  persist(next);
}

export function deleteProfile(lang: Lang, type: MatchType) {
  const next = { ...getProfiles() };
  delete next[profileKey(lang, type)];
  persist(next);
}

export function subscribeProfiles(listener: (value: MixProfileMap) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useMixProfiles(): MixProfileMap {
  const [value, setValue] = useState<MixProfileMap>({});
  useEffect(() => {
    setValue(getProfiles());
    return subscribeProfiles(setValue);
  }, []);
  return value;
}

/** Remembers the match type selected in the console between sessions. */
const TYPE_KEY = "pvt.matchType";

export function getMatchType(): MatchType {
  if (typeof window === "undefined") return "standard";
  const raw = window.localStorage.getItem(TYPE_KEY);
  return isMatchType(raw) ? raw : "standard";
}

export function setMatchType(type: MatchType) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TYPE_KEY, type);
}
