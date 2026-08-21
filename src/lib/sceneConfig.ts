import { ALL_SCENES } from "@/lib/scenes";
import { useEffect, useState } from "react";

/**
 * Live tuning for the scene scheduler: which scenes are allowed in the
 * rotation, how heavily each one is weighted and the transition rules that
 * guarantee a scene is played to its end. Stored locally so a live show can be
 * adjusted without a redeploy.
 */
export type TransitionRules = {
  /** A started scene is protected for at least this long (ms). */
  minSceneMs: number;
  /** A gift may cut an idle scene (a move is never cut). */
  allowGiftInterrupt: boolean;
  /** Idle scenarios are protected until their end, like a move. */
  lockIdle: boolean;
  /** Extra quiet frames kept after the end of a scene before the next one. */
  tailMs: number;
  /** Show the live scheduler debug panel over the ring. */
  debug: boolean;
};

export type SceneConfig = {
  /** Scene ids removed from the rotation. */
  disabled: string[];
  /** Weight per scene id, 0.25 – 4; higher = drawn earlier in a cycle. */
  weights: Record<string, number>;
  transitions: TransitionRules;
};

const KEY = "pvt.sceneConfig";

export function defaultSceneConfig(): SceneConfig {
  return {
    disabled: [],
    weights: {},
    transitions: {
      minSceneMs: 900,
      allowGiftInterrupt: false,
      lockIdle: true,
      tailMs: 120,
      debug: false,
    },
  };
}

function clamp(value: unknown, min: number, max: number, fallback: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function parse(raw: unknown): SceneConfig {
  const base = defaultSceneConfig();
  if (!raw || typeof raw !== "object") return base;
  const value = raw as Partial<SceneConfig>;
  const known = new Set(ALL_SCENES.map((scene) => scene.id));
  const disabled = Array.isArray(value.disabled)
    ? value.disabled.filter((id): id is string => typeof id === "string" && known.has(id))
    : [];
  const weights: Record<string, number> = {};
  if (value.weights && typeof value.weights === "object") {
    for (const [id, weight] of Object.entries(value.weights)) {
      if (known.has(id)) weights[id] = clamp(weight, 0.25, 4, 1);
    }
  }
  const t: Partial<TransitionRules> = value.transitions ?? {};
  return {
    disabled,
    weights,
    transitions: {
      minSceneMs: clamp(t.minSceneMs, 0, 4000, base.transitions.minSceneMs),
      allowGiftInterrupt: Boolean(t.allowGiftInterrupt),
      lockIdle: t.lockIdle !== false,
      tailMs: clamp(t.tailMs, 0, 800, base.transitions.tailMs),
      debug: Boolean(t.debug),
    },
  };
}

let cache: SceneConfig | null = null;

export function getSceneConfig(): SceneConfig {
  if (cache) return cache;
  if (typeof window === "undefined") return defaultSceneConfig();
  try {
    cache = parse(JSON.parse(window.localStorage.getItem(KEY) ?? "null"));
  } catch {
    cache = defaultSceneConfig();
  }
  return cache;
}

export function saveSceneConfig(value: SceneConfig) {
  cache = parse(value);
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(cache));
  window.dispatchEvent(new CustomEvent("pvt:sceneConfig"));
}

export function resetSceneConfig(): SceneConfig {
  const fresh = defaultSceneConfig();
  saveSceneConfig(fresh);
  return fresh;
}

/** Weight of a scene, 1 by default; 0 means "disabled". */
export function weightOf(id: string): number {
  const config = getSceneConfig();
  if (config.disabled.includes(id)) return 0;
  return config.weights[id] ?? 1;
}

export function useSceneConfig(): SceneConfig {
  const [config, setConfig] = useState<SceneConfig>(() => getSceneConfig());
  useEffect(() => {
    const sync = () => setConfig(getSceneConfig());
    window.addEventListener("pvt:sceneConfig", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("pvt:sceneConfig", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return config;
}
