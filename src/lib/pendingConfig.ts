import { applyBundle, type ConfigBundle } from "@/lib/configBundle";

/**
 * Staged configuration: an import is never applied in the middle of a fight
 * scene. The bundle waits here and the arena commits it at a safe moment —
 * when the current scene has played to its end, or at the start of the next
 * round after a knockout.
 */

const KEY = "pvt.pendingConfig";

export type PendingConfig = {
  bundle: ConfigBundle;
  /** "scene" = as soon as the running scene ends, "round" = next round only. */
  when: "scene" | "round";
  stagedAt: number;
  label: string;
};

const listeners = new Set<(pending: PendingConfig | null) => void>();

function emit(pending: PendingConfig | null) {
  for (const listener of listeners) listener(pending);
}

export function onPendingConfig(listener: (pending: PendingConfig | null) => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getPendingConfig(): PendingConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PendingConfig) : null;
  } catch {
    return null;
  }
}

export function stagePendingConfig(
  bundle: ConfigBundle,
  when: PendingConfig["when"],
  label: string,
): PendingConfig {
  const pending: PendingConfig = { bundle, when, stagedAt: Date.now(), label };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(pending));
    } catch {
      // storage full or blocked — the bundle simply stays in memory
    }
  }
  emit(pending);
  return pending;
}

export function clearPendingConfig() {
  if (typeof window !== "undefined") window.localStorage.removeItem(KEY);
  emit(null);
}

/**
 * Applies the staged bundle if the current boundary allows it.
 * `boundary` is where the arena is right now: between two scenes, or at the
 * start of a new round.
 */
export function commitPendingConfig(boundary: "scene" | "round"): PendingConfig | null {
  const pending = getPendingConfig();
  if (!pending) return null;
  if (pending.when === "round" && boundary !== "round") return null;
  applyBundle(pending.bundle);
  clearPendingConfig();
  return pending;
}
