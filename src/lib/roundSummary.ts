import { GIFT_NAMES } from "@/lib/giftCatalog";
import type { Lang } from "@/lib/i18n";
import type { GiftEvent, Side } from "@/lib/battle";

/**
 * Localized, human-friendly round summary. Built from the exact same reduced
 * state as the scoreboard so the numbers always match what the referee
 * resolved. Missing translations fall back to English.
 */

type Key = "title" | "end" | "score" | "hits" | "gifts" | "giftLine" | "leader" | "none";

type Dict = Partial<Record<Key, string>>;

const ROUND_TEXT: Record<Lang, Dict> = {
  en: {
    title: "Round {n} summary",
    end: "End of round {n}",
    score: "Score — {ru}: {ruScore} · {us}: {usScore}",
    hits: "Hits for Russia {ruHits} · USA {usHits}",
    gifts: "Top gifts",
    giftLine: "{count}× {gift}",
    leader: "Leading: {team}",
    none: "No gifts were sent this round.",
  },
  de: {
    title: "Runde {n} Zusammenfassung",
    end: "Ende von Runde {n}",
    score: "Punktestand — {ru}: {ruScore} · {us}: {usScore}",
    hits: "Treffer Russland {ruHits} · USA {usHits}",
    gifts: "Top-Geschenke",
    giftLine: "{count}× {gift}",
    leader: "In Führung: {team}",
    none: "In dieser Runde wurden keine Geschenke geschickt.",
  },
  sr: {
    title: "Rezime runde {n}",
    end: "Kraj runde {n}",
    score: "Rezultat — {ru}: {ruScore} · {us}: {usScore}",
    hits: "Udarci Rusija {ruHits} · SAD {usHits}",
    gifts: "Najbolji pokloni",
    giftLine: "{count}× {gift}",
    leader: "Vodi: {team}",
    none: "Ove runde nije poslat nijedan poklon.",
  },
  ro: {
    title: "Rezumatul rundei {n}",
    end: "Sfârșitul rundei {n}",
    score: "Scor — {ru}: {ruScore} · {us}: {usScore}",
    hits: "Lovituri Rusia {ruHits} · SUA {usHits}",
    gifts: "Cele mai bune cadouri",
    giftLine: "{count}× {gift}",
    leader: "Conduce: {team}",
    none: "Niciun cadou trimis în această rundă.",
  },
  ru: {
    title: "Итоги раунда {n}",
    end: "Конец раунда {n}",
    score: "Счёт — {ru}: {ruScore} · {us}: {usScore}",
    hits: "Удары: Россия {ruHits} · США {usHits}",
    gifts: "Топ-подарки",
    giftLine: "{count}× {gift}",
    leader: "Ведёт: {team}",
    none: "В этом раунде подарков не было.",
  },
};

function text(lang: Lang, key: Key, vars: Record<string, string | number> = {}) {
  const template = ROUND_TEXT[lang]?.[key] ?? ROUND_TEXT.en[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    vars[name] === undefined ? "" : String(vars[name]),
  );
}

export type RoundSummaryData = {
  round: number;
  scoreRu: number;
  scoreUs: number;
  hitsRu: number;
  hitsUs: number;
  leader: Side | null;
  topGifts: { gift: string; name: string; count: number }[];
};

/** Aggregates a round's events into the data the card renders. */
export function buildRoundSummary(events: GiftEvent[], round: number, lang: Lang): RoundSummaryData {
  let hitsRu = 0;
  let hitsUs = 0;
  let scoreRu = 0;
  let scoreUs = 0;
  const giftCount = new Map<string, number>();
  const names = new Map<string, string>();

  for (const e of events) {
    const v = e.value ?? 1;
    if (e.side === "ru") {
      hitsRu += 1;
      scoreRu += v;
    } else {
      hitsUs += 1;
      scoreUs += v;
    }
    giftCount.set(e.gift, (giftCount.get(e.gift) ?? 0) + 1);
    names.set(e.gift, GIFT_NAMES[e.gift]?.[lang] ?? GIFT_NAMES[e.gift]?.en ?? e.gift);
  }

  const topGifts = [...giftCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([gift, count]) => ({ gift, name: names.get(gift) ?? gift, count }));

  const leader: Side | null =
    scoreRu === scoreUs ? null : scoreRu > scoreUs ? "ru" : "us";

  return { round, scoreRu, scoreUs, hitsRu, hitsUs, leader, topGifts };
}

/** Renders the summary as localized lines for the card body. */
export function renderRoundSummary(s: RoundSummaryData, lang: Lang, names: { ru: string; us: string }) {
  const leaderLabel = s.leader === "ru" ? names.ru : s.leader === "us" ? names.us : "";
  return {
    title: text(lang, "title", { n: s.round }),
    end: text(lang, "end", { n: s.round }),
    score: text(lang, "score", { ru: names.ru, ruScore: s.scoreRu, us: names.us, usScore: s.scoreUs }),
    hits: text(lang, "hits", { ruHits: s.hitsRu, usHits: s.hitsUs }),
    gifts: text(lang, "gifts"),
    giftLine: (gift: string, count: number) => text(lang, "giftLine", { gift, count }),
    leader: s.leader ? text(lang, "leader", { team: leaderLabel }) : null,
    none: text(lang, "none"),
  };
}
