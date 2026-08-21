import { useEffect, useRef, useState } from "react";
import { MAX_HP, type Side } from "@/lib/battle";

/** One second per number, like a real ring count. */
const COUNT_MS = 950;
/** Below this share of HP the fighter goes down and the referee starts counting. */
const KD_RATIO = 0.22;

export type RefereeState = {
  /** Fighter currently on the mat, or null when the fight is running. */
  side: Side | null;
  /** Current number the referee is at (0 = no count). */
  count: number;
  /** True while counting to ten — the finish. */
  final: boolean;
  /** Set once the ten-count is complete: the knockout is official. */
  koConfirmed: boolean;
};

const IDLE: RefereeState = { side: null, count: 0, final: false, koConfirmed: false };

/**
 * Ring referee: counts a downed fighter up to eight (he beats the count and the
 * fight resumes) or all the way to ten when his HP is gone, which makes the
 * knockout official and stops the sequence.
 */
export function useReferee(hpRu: number, hpUs: number, ko: Side | null): RefereeState {
  const [state, setState] = useState<RefereeState>(IDLE);
  const armed = useRef<Side | null>(null);

  // Final ten-count after a knockout blow.
  useEffect(() => {
    if (!ko) {
      setState(IDLE);
      armed.current = null;
      return;
    }
    const downed: Side = ko === "ru" ? "us" : "ru";
    let n = 1;
    setState({ side: downed, count: 1, final: true, koConfirmed: false });
    const timer = window.setInterval(() => {
      n += 1;
      if (n > 10) {
        window.clearInterval(timer);
        setState({ side: downed, count: 10, final: true, koConfirmed: true });
        return;
      }
      setState({ side: downed, count: n, final: true, koConfirmed: false });
    }, COUNT_MS);
    return () => window.clearInterval(timer);
  }, [ko]);

  // Knockdown count during the fight — eight, then the fighter is back up.
  useEffect(() => {
    if (ko) return;
    const limit = MAX_HP * KD_RATIO;
    const downed: Side | null = hpRu <= limit ? "ru" : hpUs <= limit ? "us" : null;
    if (!downed) {
      armed.current = null;
      return;
    }
    if (armed.current === downed) return;
    armed.current = downed;

    let n = 1;
    setState({ side: downed, count: 1, final: false, koConfirmed: false });
    const timer = window.setInterval(() => {
      n += 1;
      if (n > 8) {
        window.clearInterval(timer);
        setState(IDLE);
        return;
      }
      setState({ side: downed, count: n, final: false, koConfirmed: false });
    }, COUNT_MS);
    return () => window.clearInterval(timer);
  }, [hpRu, hpUs, ko]);

  return state;
}

// Hook signatures change often during development; a partial HMR patch would
// keep stale refs/state and break the Hook order. Force a full reload instead.
if (import.meta.hot) import.meta.hot.decline();
