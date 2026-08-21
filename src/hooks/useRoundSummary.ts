import { useCallback, useEffect, useRef, useState } from "react";
import type { GiftEvent } from "@/lib/battle";
import type { Lang } from "@/lib/i18n";
import { buildRoundSummary, type RoundSummaryData } from "@/lib/roundSummary";

const SHOW_MS = 9000;

/**
 * Publishes a multilingual summary (score, hits, gifts) of the round that just
 * ended. A boundary is a round-number change inside the same match, or a new
 * match row replacing the previous fight. The card auto-hides so it never
 * covers the opening action of the next round.
 */
export function useRoundSummary(
  matchId: string | null | undefined,
  round: number,
  events: GiftEvent[],
  lang: Lang,
) {
  const [data, setData] = useState<RoundSummaryData | null>(null);
  const [visible, setVisible] = useState(false);

  const eventsRef = useRef<GiftEvent[]>(events);
  eventsRef.current = events;
  const startIndex = useRef(0);
  const boundary = useRef<string | null>(null);
  const activeRound = useRef(round);

  useEffect(() => {
    const key = matchId ? `${matchId}:${round}` : null;
    if (!key) return;
    const prev = boundary.current;
    boundary.current = key;
    if (prev === null) {
      startIndex.current = eventsRef.current.length;
      activeRound.current = round;
      return;
    }
    const sameMatch = matchId && prev.startsWith(`${matchId}:`);
    const ended = eventsRef.current.slice(sameMatch ? startIndex.current : 0);
    setData(buildRoundSummary(ended, activeRound.current, lang));
    setVisible(true);
    startIndex.current = eventsRef.current.length;
    activeRound.current = round;
  }, [matchId, round, lang]);

  useEffect(() => {
    if (!visible) return;
    const id = window.setTimeout(() => setVisible(false), SHOW_MS);
    return () => window.clearTimeout(id);
  }, [visible, data]);


  const dismiss = useCallback(() => setVisible(false), []);

  return { data, visible: visible && data !== null, dismiss };
}

if (import.meta.hot) import.meta.hot.accept(() => import.meta.hot?.invalidate());
