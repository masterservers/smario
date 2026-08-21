import type { GiftId } from "@/lib/battle";
import type { Lang } from "@/lib/i18n";

/**
 * Display / spoken name of every gift in the five broadcast languages.
 * The admin console can override these per gift, this is the factory default.
 */
export const GIFT_NAMES: Record<GiftId, Record<Lang, string>> = {
  rose: { en: "Rose", de: "Rose", sr: "Ruža", ro: "Trandafir", ru: "Роза" },
  donut: { en: "Donut", de: "Donut", sr: "Krofna", ro: "Gogoașă", ru: "Пончик" },
  tiktok: { en: "TikTok", de: "TikTok", sr: "TikTok", ro: "TikTok", ru: "TikTok" },
  gift: { en: "Gift box", de: "Geschenk", sr: "Poklon", ro: "Cadou", ru: "Подарок" },
  rocket: { en: "Rocket", de: "Rakete", sr: "Raketa", ro: "Rachetă", ru: "Ракета" },
  burger: { en: "Burger", de: "Burger", sr: "Burger", ro: "Burger", ru: "Бургер" },
  vodka: { en: "Vodka", de: "Wodka", sr: "Votka", ro: "Vodcă", ru: "Водка" },
  lightning: { en: "Lightning", de: "Blitz", sr: "Munja", ro: "Fulger", ru: "Молния" },
  glove: { en: "Boxing glove", de: "Boxhandschuh", sr: "Bokserska rukavica", ro: "Mănușă de box", ru: "Боксёрская перчатка" },
  eagle: { en: "American eagle", de: "Weißkopfseeadler", sr: "Američki orao", ro: "Vulturul american", ru: "Американский орёл" },
  bear: { en: "Russian bear", de: "Russischer Bär", sr: "Ruski medved", ro: "Ursul rusesc", ru: "Русский медведь" },
  matryoshka: { en: "Matryoshka", de: "Matrjoschka", sr: "Matrjoška", ro: "Matrioșka", ru: "Матрёшка" },
  statue: { en: "Statue of Liberty", de: "Freiheitsstatue", sr: "Kip slobode", ro: "Statuia Libertății", ru: "Статуя Свободы" },
  kremlin: { en: "Kremlin", de: "Kreml", sr: "Kremlj", ro: "Kremlin", ru: "Кремль" },
  tank: { en: "Tank", de: "Panzer", sr: "Tenk", ro: "Tanc", ru: "Танк" },
  bomb: { en: "Bomb", de: "Bombe", sr: "Bomba", ro: "Bombă", ru: "Бомба" },
  crown: { en: "Crown", de: "Krone", sr: "Kruna", ro: "Coroană", ru: "Корона" },
  trophy: { en: "Trophy", de: "Pokal", sr: "Trofej", ro: "Trofeu", ru: "Кубок" },
};

/** Which camp a gift belongs to, purely for grouping in the admin console. */
export const GIFT_CAMP: Record<GiftId, "us" | "ru" | "neutral"> = {
  rose: "neutral",
  donut: "neutral",
  tiktok: "neutral",
  gift: "neutral",
  rocket: "neutral",
  burger: "us",
  vodka: "ru",
  lightning: "neutral",
  glove: "neutral",
  eagle: "us",
  bear: "ru",
  matryoshka: "ru",
  statue: "us",
  kremlin: "ru",
  tank: "neutral",
  bomb: "neutral",
  crown: "neutral",
  trophy: "neutral",
};

export function giftName(id: GiftId, lang: Lang): string {
  return GIFT_NAMES[id]?.[lang] ?? id;
}
