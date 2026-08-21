import { GIFT_BY_ID, MAX_HP, reduceEvents, type GiftEvent, type GiftId, type Side } from "@/lib/battle";

export type KeyMoment = {
  id: string;
  at: number;
  kind: "knockdown" | "knockout" | "combo" | "big";
  side: Side;
  sender: string;
  gift: GiftId;
};

export type MatchSummary = {
  scoreRu: number;
  scoreUs: number;
  hpRu: number;
  hpUs: number;
  ko: Side | null;
  durationMs: number;
  gifts: { gift: GiftId; count: number; value: number }[];
  senders: { sender: string; total: number; side: Side }[];
  moments: KeyMoment[];
};

const KD_LIMIT = MAX_HP * 0.22;

/**
 * Rebuilds everything worth showing after the bell: score, remaining HP, the
 * gifts that were sent and the knockdown/knockout moments.
 */
export function summarizeMatch(events: GiftEvent[]): MatchSummary {
  const state = reduceEvents(events);
  const first = events[0];
  const last = events[events.length - 1];
  const durationMs =
    first && last ? new Date(last.created_at).getTime() - new Date(first.created_at).getTime() : 0;

  const giftMap = new Map<GiftId, { gift: GiftId; count: number; value: number }>();
  const senderMap = new Map<string, { sender: string; total: number; side: Side }>();
  const moments: KeyMoment[] = [];

  let hpRu = MAX_HP;
  let hpUs = MAX_HP;
  let downRu = false;
  let downUs = false;
  let combo = 0;
  let comboSide: Side | null = null;

  for (const event of events) {
    const gift = GIFT_BY_ID[event.gift];
    const at = new Date(event.created_at).getTime();

    const g = giftMap.get(event.gift) ?? { gift: event.gift, count: 0, value: 0 };
    g.count += 1;
    g.value += gift?.value ?? 1;
    giftMap.set(event.gift, g);

    const s = senderMap.get(event.sender) ?? { sender: event.sender, total: 0, side: event.side };
    s.total += gift?.value ?? 1;
    s.side = event.side;
    senderMap.set(event.sender, s);

    if (event.side === "ru") hpUs = Math.max(0, hpUs - (gift?.damage ?? 0));
    else hpRu = Math.max(0, hpRu - (gift?.damage ?? 0));

    combo = comboSide === event.side ? combo + 1 : 1;
    comboSide = event.side;

    const base = { id: event.id, at, side: event.side, sender: event.sender, gift: event.gift };
    if (hpRu <= 0 || hpUs <= 0) {
      moments.push({ ...base, kind: "knockout" });
      break;
    }
    if (!downRu && hpRu <= KD_LIMIT) {
      downRu = true;
      moments.push({ ...base, kind: "knockdown" });
    } else if (!downUs && hpUs <= KD_LIMIT) {
      downUs = true;
      moments.push({ ...base, kind: "knockdown" });
    } else if (combo >= 5) {
      moments.push({ ...base, kind: "combo" });
    } else if ((gift?.damage ?? 0) >= 20) {
      moments.push({ ...base, kind: "big" });
    }
    if (hpRu > KD_LIMIT) downRu = false;
    if (hpUs > KD_LIMIT) downUs = false;
  }

  return {
    scoreRu: state.scoreRu,
    scoreUs: state.scoreUs,
    hpRu: state.hpRu,
    hpUs: state.hpUs,
    ko: state.ko,
    durationMs,
    gifts: [...giftMap.values()].sort((a, b) => b.value - a.value),
    senders: [...senderMap.values()].sort((a, b) => b.total - a.total).slice(0, 8),
    moments: moments.slice(-12),
  };
}

/**
 * Highlight reel: the big spots plus everything leading into the finish, so a
 * replay stays short but still ends on the knockout.
 */
export function buildHighlights(events: GiftEvent[]): GiftEvent[] {
  const summary = summarizeMatch(events);
  const ids = new Set(summary.moments.map((m) => m.id));
  const big = events.filter((e) => (GIFT_BY_ID[e.gift]?.damage ?? 0) >= 12 || ids.has(e.id));
  const tail = events.slice(-4);
  const merged = [...big, ...tail.filter((e) => !big.some((b) => b.id === e.id))];
  return merged.sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
