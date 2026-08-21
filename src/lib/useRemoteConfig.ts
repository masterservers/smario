import { useEffect } from "react";
import { getActiveConfigVersion } from "@/lib/configVersions.functions";
import { applyStoredBundle } from "@/lib/configBundle";

/**
 * Pulls the active fight configuration saved in the backend and applies it
 * locally, so the settings survive a refresh and every viewer of the arena
 * runs exactly what the admin published.
 */
export function useRemoteConfig() {
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const version = await getActiveConfigVersion();
        if (!cancelled && version?.bundle) applyStoredBundle(version.bundle);
      } catch {
        // offline or not published yet — the local settings stay in place
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
}
