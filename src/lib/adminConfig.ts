import { useEffect, useState } from "react";
import { SIDE_NAME, type Lang } from "@/lib/i18n";
import { DEFAULT_TITLE, normalizeTitle } from "@/lib/matchTitle";

export type FighterSetting = {
  /** Official name shown in the scoreboard and summaries. */
  name: string;
  /** Ring nickname used by the announcer and the subtitles. */
  nickname: string;
};

export type TikTokSetting = {
  /** @handle of the account that hosts the live. */
  username: string;
  /** Full URL of the running live room. */
  liveUrl: string;
  /** Optional gift webhook / relay endpoint that feeds the arena. */
  webhookUrl: string;
  /** Whether gifts coming from TikTok are accepted right now. */
  enabled: boolean;
};

export type AdminConfig = {
  fighters: Record<"ru" | "us", FighterSetting>;
  tiktok: TikTokSetting;
  /** Unique id appended to the shareable live link. */
  liveSession: string;
  /** Approved match title used on every page and notification. */
  matchTitle: string;
  /** Font scale of the public match title (1 = base size). */
  titleScale: number;

};

export function newSessionId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function defaultAdminConfig(): AdminConfig {
  return {
    fighters: {
      ru: { name: "Putin", nickname: "The Kremlin Bear" },
      us: { name: "Trump", nickname: "The Manhattan Hammer" },
    },
    tiktok: { username: "", liveUrl: "", webhookUrl: "", enabled: false },
    liveSession: "arena",
    matchTitle: DEFAULT_TITLE,
    titleScale: 3,

  };
}

const KEY = "pvt.adminConfig";

function str(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalize(raw: unknown): AdminConfig {
  const base = defaultAdminConfig();
  if (!raw || typeof raw !== "object") return base;
  const parsed = raw as Partial<AdminConfig>;
  for (const side of ["ru", "us"] as const) {
    const item = parsed.fighters?.[side];
    if (!item) continue;
    base.fighters[side] = {
      name: str(item.name, base.fighters[side].name),
      nickname: str(item.nickname, base.fighters[side].nickname),
    };
  }
  if (parsed.tiktok) {
    base.tiktok = {
      username: str(parsed.tiktok.username, ""),
      liveUrl: str(parsed.tiktok.liveUrl, ""),
      webhookUrl: str(parsed.tiktok.webhookUrl, ""),
      enabled: Boolean(parsed.tiktok.enabled),
    };
  }
  base.liveSession = str(parsed.liveSession, base.liveSession);
  base.matchTitle = normalizeTitle(parsed.matchTitle ?? base.matchTitle);
  base.titleScale = clampScale(parsed.titleScale ?? base.titleScale);

  return base;
}

let current: AdminConfig | null = null;
const listeners = new Set<(value: AdminConfig) => void>();

export function getAdminConfig(): AdminConfig {
  if (current) return current;
  if (typeof window === "undefined") return defaultAdminConfig();
  try {
    const raw = window.localStorage.getItem(KEY);
    current = normalize(raw ? JSON.parse(raw) : null);
  } catch {
    current = defaultAdminConfig();
  }
  return current;
}

export function saveAdminConfig(value: AdminConfig) {
  current = normalize(value);
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(current));
  for (const listener of listeners) listener(current);
}

export function useAdminConfig(): AdminConfig {
  const [value, setValue] = useState<AdminConfig>(defaultAdminConfig);
  useEffect(() => {
    setValue(getAdminConfig());
    listeners.add(setValue);
    return () => {
      listeners.delete(setValue);
    };
  }, []);
  return value;
}

type Names = { ru: string; us: string; ruTeam: string; usTeam: string };

/** Display names (scoreboard, panels) with the admin overrides applied. */
export function sideNames(lang: Lang): Names {
  const base = SIDE_NAME[lang];
  const cfg = getAdminConfig();
  return { ...base, ru: cfg.fighters.ru.name, us: cfg.fighters.us.name };
}

/** Names the announcer and the subtitles use: nickname first, name as fallback. */
export function sideVoiceNames(lang: Lang): Names {
  const base = SIDE_NAME[lang];
  const cfg = getAdminConfig();
  return {
    ...base,
    ru: cfg.fighters.ru.nickname || cfg.fighters.ru.name,
    us: cfg.fighters.us.nickname || cfg.fighters.us.name,
  };
}

/** The approved match title (validated on every read). */
export function matchTitle(): string {
  return normalizeTitle(getAdminConfig().matchTitle);
}

/** Reactive approved match title for components and page heads. */
export function useMatchTitle(): string {
  return normalizeTitle(useAdminConfig().matchTitle);
}

/** Keeps the title scale inside a readable range (50% – 500%). */
export function clampScale(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return 3;
  return Math.min(5, Math.max(0.5, Math.round(n * 20) / 20));
}

/** Reactive font scale of the match title. */
export function useTitleScale(): number {
  return clampScale(useAdminConfig().titleScale);
}
