import { useEffect, useState } from "react";
import { GIFTS, type GiftId, type Side } from "@/lib/battle";
import { LANGS, UI_TEXT, type Lang } from "@/lib/i18n";

/** Where a gift always lands, or "auto" to keep the sender's chosen side. */
export type GiftTarget = Side | "auto";

export type GiftSetting = {
  /** Symbol shown in the dock, the banner and the floating hit icon. */
  emoji: string;
  /** Forced recipient team, or "auto". */
  target: GiftTarget;
  /** Spoken/displayed name of the gift per language. */
  phrases: Record<Lang, string>;
};

export type GiftConfig = Record<GiftId, GiftSetting>;

export function defaultGiftConfig(): GiftConfig {
  const entries = GIFTS.map((gift) => {
    const phrases = Object.fromEntries(
      LANGS.map((lang) => [lang, UI_TEXT[lang].gifts[gift.id] ?? gift.id]),
    ) as Record<Lang, string>;
    return [gift.id, { emoji: gift.emoji, target: "auto" as GiftTarget, phrases }];
  });
  return Object.fromEntries(entries) as GiftConfig;
}

const KEY = "pvt.giftConfig";

function normalize(raw: unknown): GiftConfig {
  const base = defaultGiftConfig();
  if (!raw || typeof raw !== "object") return base;
  const parsed = raw as Partial<Record<GiftId, Partial<GiftSetting>>>;
  for (const gift of GIFTS) {
    const item = parsed[gift.id];
    if (!item) continue;
    const entry = base[gift.id];
    if (typeof item.emoji === "string" && item.emoji.trim()) entry.emoji = item.emoji.trim();
    if (item.target === "ru" || item.target === "us" || item.target === "auto") {
      entry.target = item.target;
    }
    for (const lang of LANGS) {
      const phrase = item.phrases?.[lang];
      if (typeof phrase === "string" && phrase.trim()) entry.phrases[lang] = phrase.trim();
    }
  }
  return base;
}

let current: GiftConfig | null = null;
const listeners = new Set<(value: GiftConfig) => void>();

export function getGiftConfig(): GiftConfig {
  if (current) return current;
  if (typeof window === "undefined") return defaultGiftConfig();
  try {
    const raw = window.localStorage.getItem(KEY);
    current = normalize(raw ? JSON.parse(raw) : null);
  } catch {
    current = defaultGiftConfig();
  }
  return current;
}

export function saveGiftConfig(value: GiftConfig) {
  current = normalize(value);
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(current));
  for (const listener of listeners) listener(current);
}

export function resetGiftConfig() {
  saveGiftConfig(defaultGiftConfig());
}

/** Subscribes a component to the admin gift settings. */
export function useGiftConfig(): GiftConfig {
  const [value, setValue] = useState<GiftConfig>(defaultGiftConfig);
  useEffect(() => {
    setValue(getGiftConfig());
    listeners.add(setValue);
    return () => {
      listeners.delete(setValue);
    };
  }, []);
  return value;
}

/** Emoji + localized name, used for the dock, banner text and voice lines. */
export function giftLabel(config: GiftConfig, id: GiftId, lang: Lang) {
  const entry = config[id];
  return `${entry?.emoji ?? "🎁"} ${entry?.phrases[lang] ?? id}`;
}
