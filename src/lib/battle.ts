export type Side = "ru" | "us";

export type GiftId =
  | "rose"
  | "donut"
  | "tiktok"
  | "gift"
  | "rocket"
  | "burger"
  | "vodka"
  | "lightning"
  | "glove"
  | "eagle"
  | "bear"
  | "matryoshka"
  | "statue"
  | "kremlin"
  | "tank"
  | "bomb"
  | "crown"
  | "trophy";

export type Gift = {
  id: GiftId;
  emoji: string;
  value: number;
  damage: number;
};

export const GIFTS: Gift[] = [
  { id: "rose", emoji: "🌹", value: 1, damage: 4 },
  { id: "donut", emoji: "🍩", value: 2, damage: 7 },
  { id: "tiktok", emoji: "🎵", value: 5, damage: 12 },
  { id: "gift", emoji: "🎁", value: 10, damage: 20 },
  { id: "rocket", emoji: "🚀", value: 25, damage: 34 },
  // Themed catalog: America / Trump on one side, Russia / Putin on the other.
  { id: "burger", emoji: "🍔", value: 3, damage: 8 },
  { id: "vodka", emoji: "🥃", value: 4, damage: 10 },
  { id: "lightning", emoji: "⚡", value: 5, damage: 12 },
  { id: "glove", emoji: "🥊", value: 6, damage: 14 },
  { id: "eagle", emoji: "🦅", value: 8, damage: 17 },
  { id: "bear", emoji: "🐻", value: 8, damage: 17 },
  { id: "matryoshka", emoji: "🪆", value: 10, damage: 20 },
  { id: "statue", emoji: "🗽", value: 12, damage: 22 },
  { id: "kremlin", emoji: "🏰", value: 12, damage: 22 },
  { id: "tank", emoji: "🪖", value: 15, damage: 26 },
  { id: "bomb", emoji: "💣", value: 18, damage: 28 },
  { id: "crown", emoji: "👑", value: 20, damage: 30 },
  { id: "trophy", emoji: "🏆", value: 30, damage: 38 },
];

export const GIFT_BY_ID = Object.fromEntries(GIFTS.map((g) => [g.id, g])) as Record<GiftId, Gift>;

export const MAX_HP = 240;

/** A match always runs at least five minutes before a knockout can happen. */
export const MIN_MATCH_MS = 5 * 60 * 1000;

export type GiftEvent = {
  id: string;
  side: Side;
  gift: GiftId;
  value: number;
  sender: string;
  created_at: string;
};

export type BattleState = {
  scoreRu: number;
  scoreUs: number;
  hpRu: number;
  hpUs: number;
  comboSide: Side | null;
  combo: number;
  ko: Side | null;
};

export function reduceEvents(events: GiftEvent[]): BattleState {
  const state: BattleState = {
    scoreRu: 0,
    scoreUs: 0,
    hpRu: MAX_HP,
    hpUs: MAX_HP,
    comboSide: null,
    combo: 0,
    ko: null,
  };

  const first = events[0];
  const startedAt = first ? new Date(first.created_at).getTime() : Date.now();

  for (const e of events) {
    const gift = GIFT_BY_ID[e.gift] ?? GIFTS[0]!;
    const elapsed = new Date(e.created_at).getTime() - startedAt;
    // Before the five-minute mark a fighter can be worn down, but never finished.
    const floorHp = elapsed >= MIN_MATCH_MS ? 0 : 1;

    if (e.side === "ru") {
      state.scoreRu += gift.value;
      state.hpUs = Math.max(floorHp, state.hpUs - gift.damage);
    } else {
      state.scoreUs += gift.value;
      state.hpRu = Math.max(floorHp, state.hpRu - gift.damage);
    }
    state.combo = state.comboSide === e.side ? state.combo + 1 : 1;
    state.comboSide = e.side;
    if (state.hpRu <= 0) state.ko = "us";
    else if (state.hpUs <= 0) state.ko = "ru";
    if (state.ko) break;
  }

  return state;
}

const RU_WORDS = [
  "rusia",
  "russia",
  "russland",
  "rusija",
  "россия",
  "putin",
  "путин",
  "ru",
  "🇷🇺",
];
const US_WORDS = [
  "usa",
  "sua",
  "america",
  "amerika",
  "sad",
  "сша",
  "америка",
  "trump",
  "tramp",
  "трамп",
  "us",
  "🇺🇸",
];

/** Detects which side a chat message supports, and which gift was named. */
export function parseChatMessage(raw: string): { side: Side | null; gift: GiftId } {
  const text = raw.toLowerCase();
  const words = text.split(/[^\p{L}\p{N}🇷🇺🇺🇸]+/u).filter(Boolean);

  let side: Side | null = null;
  for (const w of words) {
    if (RU_WORDS.includes(w)) {
      side = "ru";
      break;
    }
    if (US_WORDS.includes(w)) {
      side = "us";
      break;
    }
  }
  if (!side) {
    if (text.includes("🇷🇺")) side = "ru";
    else if (text.includes("🇺🇸")) side = "us";
  }

  let gift: GiftId = "rose";
  for (const g of GIFTS) {
    if (text.includes(g.id) || raw.includes(g.emoji)) {
      gift = g.id;
      break;
    }
  }

  return { side, gift };
}

export function randomNickname(): string {
  const a = ["Neon", "Turbo", "Wild", "Iron", "Nova", "Retro", "Mega", "Cyber", "Alpha", "Solar"];
  const b = ["Fox", "Bear", "Eagle", "Wolf", "Tiger", "Falcon", "Shark", "Cobra", "Lion", "Hawk"];
  return `${a[Math.floor(Math.random() * a.length)]}${b[Math.floor(Math.random() * b.length)]}${Math.floor(Math.random() * 90 + 10)}`;
}
