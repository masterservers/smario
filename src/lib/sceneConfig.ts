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

/**
 * Readable JSON snapshot of the rotation: every known scene is listed with its
 * label, whether it is active and its weight, plus the transition rules. Editing
 * the file by hand cannot break the order — the arena always rebuilds the
 * rotation from the ids it knows.
 */
export function exportSceneConfig(): string {
  const config = getSceneConfig();
  return JSON.stringify(
    {
      version: 1,
      exportedAt: new Date().toISOString(),
      transitions: config.transitions,
      scenes: ALL_SCENES.map((scene) => ({
        id: scene.id,
        label: scene.label,
        group: scene.group,
        active: !config.disabled.includes(scene.id),
        weight: config.weights[scene.id] ?? 1,
      })),
    },
    null,
    2,
  );
}

export type ImportResult = {
  ok: boolean;
  /** Human readable summary or the reason the file was refused. */
  message: string;
  config?: SceneConfig;
};

/**
 * Accepts either an export produced above or a raw SceneConfig object. Unknown
 * scene ids are ignored and missing ones keep their current value, so an
 * outdated file can never wipe the rotation.
 */
export function importSceneConfig(raw: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, message: "Invalid JSON — check the file and try again." };
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, message: "The file does not contain an object." };
  }

  const known = new Set(ALL_SCENES.map((scene) => scene.id));
  const value = parsed as Record<string, unknown>;

  // Raw SceneConfig shape.
  if (Array.isArray(value.disabled) || value.weights) {
    const config = parse(value);
    saveSceneConfig(config);
    return {
      ok: true,
      message: `Imported: ${known.size - config.disabled.length}/${known.size} active scenes.`,
      config: getSceneConfig(),
    };
  }

  // Export shape with a scenes array.
  if (!Array.isArray(value.scenes)) {
    return { ok: false, message: 'Missing the "scenes" list or the "disabled"/"weights" fields.' };
  }

  const current = getSceneConfig();
  const disabled = new Set(current.disabled);
  const weights: Record<string, number> = { ...current.weights };
  let matched = 0;
  let skipped = 0;

  for (const entry of value.scenes as unknown[]) {
    if (!entry || typeof entry !== "object") continue;
    const scene = entry as { id?: unknown; active?: unknown; weight?: unknown };
    if (typeof scene.id !== "string" || !known.has(scene.id)) {
      skipped += 1;
      continue;
    }
    matched += 1;
    if (scene.active === false) disabled.add(scene.id);
    else disabled.delete(scene.id);
    if (scene.weight !== undefined) weights[scene.id] = clamp(scene.weight, 0.25, 4, 1);
  }

  if (matched === 0) {
    return { ok: false, message: "No known scene id in the file — nothing was changed." };
  }

  const next = parse({
    disabled: Array.from(disabled),
    weights,
    transitions: {
      ...current.transitions,
      ...((value.transitions as Partial<TransitionRules> | undefined) ?? {}),
    },
  });
  saveSceneConfig(next);
  return {
    ok: true,
    message: `Imported: ${matched} scenes${skipped > 0 ? `, ${skipped} unknown ignored` : ""} — ${
      known.size - next.disabled.length
    }/${known.size} active.`,
    config: getSceneConfig(),
  };
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
