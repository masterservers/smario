import { useEffect, useRef, useState } from "react";
import { MAX_HP, type Side } from "@/lib/battle";
import { getHitConfig, useHitConfig } from "@/lib/hitConfig";

/** Below this share of HP the fighter goes down and the referee starts counting. */
const KD_RATIO = 0.22;

export type RefereeState = {
  /** Fighter currently on the mat, or null when the fight is running. */
  side: Side | null;
  /** Current number the referee is at (0 = no count). */
  count: number;
  /** True while counting the finish. */
  final: boolean;
  /** Set once the full count is complete: the knockout is official. */
  koConfirmed: boolean;
  /** True during the short, quiet transition back into the fight. */
  resuming: boolean;
};

const IDLE: RefereeState = { side: null, count: 0, final: false, koConfirmed: false, resuming: false };

/**
 * Ring referee. The count length, its rhythm and the transition back into the
 * fight are all configurable in /admin, so they can be tuned during a live show.
 */
export function useReferee(hpRu: number, hpUs: number, ko: Side | null): RefereeState {
  const [state, setState] = useState<RefereeState>(IDLE);
  const armed = useRef<Side | null>(null);
  const countTimer = useRef(0);
  const resumeTimer = useRef(0);
  // Re-subscribe when the admin changes the rules.
  const cfg = useHitConfig().referee;

  // Final count after a knockout blow.
  useEffect(() => {
    if (!ko) {
      setState(IDLE);
      armed.current = null;
      return;
    }
    const rules = getHitConfig().referee;
    const downed: Side = ko === "ru" ? "us" : "ru";
    let n = 1;
    setState({ side: downed, count: 1, final: true, koConfirmed: false, resuming: false });
    const timer = window.setInterval(() => {
      n += 1;
      if (n > rules.finalCount) {
        window.clearInterval(timer);
        setState({
          side: downed,
          count: rules.finalCount,
          final: true,
          koConfirmed: true,
          resuming: false,
        });
        return;
      }
      setState({ side: downed, count: n, final: true, koConfirmed: false, resuming: false });
    }, rules.countMs);
    return () => window.clearInterval(timer);
  }, [ko, cfg.finalCount, cfg.countMs]);

  // Knockdown count during the fight — the fighter beats it and is back up.
  useEffect(() => {
    if (ko) return;
    const rules = getHitConfig().referee;
    const limit = MAX_HP * KD_RATIO;
    const downed: Side | null = hpRu <= limit ? "ru" : hpUs <= limit ? "us" : null;
    if (!downed) {
      armed.current = null;
      window.clearInterval(countTimer.current);
      window.clearTimeout(resumeTimer.current);
      countTimer.current = 0;
      resumeTimer.current = 0;
      return;
    }
    if (armed.current === downed) return;
    armed.current = downed;

    let n = 1;
    setState({ side: downed, count: 1, final: false, koConfirmed: false, resuming: false });
    // The count lives in refs: a new gift landing mid-count must never tear the
    // timer down, otherwise the referee freezes on a number and the ring with it.
    countTimer.current = window.setInterval(() => {
      n += 1;
      if (n > rules.knockdownCount) {
        window.clearInterval(countTimer.current);
        countTimer.current = 0;
        // Soft hand-over: the fighter is up, the arena eases back into the
        // action instead of cutting straight to the next scene.
        setState({
          side: downed,
          count: rules.knockdownCount,
          final: false,
          koConfirmed: false,
          resuming: true,
        });
        resumeTimer.current = window.setTimeout(() => {
          setState(IDLE);
          // Free the lock so a later knockdown can start a fresh count even if
          // the fighter's HP never climbed back over the line.
          armed.current = null;
        }, rules.resumeDelayMs);
        return;
      }
      setState({ side: downed, count: n, final: false, koConfirmed: false, resuming: false });
    }, rules.countMs);
  }, [hpRu, hpUs, ko, cfg.knockdownCount, cfg.countMs, cfg.resumeDelayMs]);

  return state;
}

// Hook signatures change often during development; a partial HMR patch would
// keep stale refs/state and break the Hook order. Force a full reload instead.
if (import.meta.hot) import.meta.hot.accept(() => import.meta.hot?.invalidate());
